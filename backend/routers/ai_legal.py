from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from decimal import Decimal
from datetime import date

from database import get_db
from models.legal_params import LegalParameter, LegalParamAudit
from auth.jwt_handler import get_current_user, require_admin, require_admin_only
from models.user import User
from services.ai_service import AILegalService

router = APIRouter()


class LegalParamUpdate(BaseModel):
    key: str
    value: Decimal
    description: Optional[str] = None
    unit: Optional[str] = None
    effective_date: Optional[date] = None
    source: Optional[str] = None


class ProposalApproval(BaseModel):
    audit_id: int
    approved: bool
    notes: Optional[str] = None


@router.get("/parameters")
def get_legal_parameters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    params = db.query(LegalParameter).filter(LegalParameter.is_active == True).all()
    return params


@router.post("/parameters/seed")
def seed_legal_parameters(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_only),
):
    """Seeds default Chilean legal parameters for 2024-2025."""
    from datetime import date as date_type
    existing = db.query(LegalParameter).count()
    if existing > 0:
        raise HTTPException(status_code=400, detail="Parámetros ya inicializados")

    today = date_type.today()
    defaults = [
        # Valores base
        {"key": "IMM", "value": 500000, "description": "Ingreso Mínimo Mensual", "unit": "CLP", "source": "DFL N°4/2024"},
        {"key": "UF", "value": 38500, "description": "Unidad de Fomento (referencial)", "unit": "CLP", "source": "CMF"},
        {"key": "UTM", "value": 67294, "description": "Unidad Tributaria Mensual", "unit": "CLP", "source": "SII"},
        # Topes imponibles en UF
        {"key": "TOPE_IMPONIBLE_AFP_UF", "value": 81.6, "description": "Tope imponible AFP en UF", "unit": "UF", "source": "SP"},
        {"key": "TOPE_IMPONIBLE_SALUD_UF", "value": 81.6, "description": "Tope imponible salud en UF", "unit": "UF", "source": "FONASA"},
        # AFP rates
        {"key": "AFP_HABITAT", "value": 11.27, "description": "Tasa AFP Habitat", "unit": "%", "source": "SP"},
        {"key": "AFP_PROVIDA", "value": 11.44, "description": "Tasa AFP Provida", "unit": "%", "source": "SP"},
        {"key": "AFP_CAPITAL", "value": 11.44, "description": "Tasa AFP Capital", "unit": "%", "source": "SP"},
        {"key": "AFP_CUPRUM", "value": 11.44, "description": "Tasa AFP Cuprum", "unit": "%", "source": "SP"},
        {"key": "AFP_PLANVITAL", "value": 11.16, "description": "Tasa AFP PlanVital", "unit": "%", "source": "SP"},
        {"key": "AFP_MODEL", "value": 10.58, "description": "Tasa AFP Model", "unit": "%", "source": "SP"},
        {"key": "AFP_UNO", "value": 10.49, "description": "Tasa AFP Uno", "unit": "%", "source": "SP"},
        # Salud
        {"key": "TASA_SALUD", "value": 7.0, "description": "Tasa cotización salud trabajador", "unit": "%", "source": "FONASA"},
        # Cesantía
        {"key": "CESANTIA_TRABAJADOR", "value": 0.6, "description": "Seguro Cesantía cargo trabajador", "unit": "%", "source": "AFC"},
        {"key": "CESANTIA_EMPLEADOR_INDEFINIDO", "value": 2.4, "description": "Seguro Cesantía empleador contrato indefinido", "unit": "%", "source": "AFC"},
        {"key": "CESANTIA_EMPLEADOR_PLAZO_FIJO", "value": 3.0, "description": "Seguro Cesantía empleador contrato plazo fijo", "unit": "%", "source": "AFC"},
        # SIS
        {"key": "SIS_EMPLEADOR", "value": 1.49, "description": "Seguro Invalidez y Sobrevivencia empleador", "unit": "%", "source": "SP"},
        # Gratificación
        {"key": "GRATIFICACION_TOPE_IMM_MULTIPLICADOR", "value": 4.75, "description": "Tope gratificación legal en IMM", "unit": "IMM", "source": "CT art.50"},
        {"key": "GRATIFICACION_PORCENTAJE", "value": 25.0, "description": "Porcentaje gratificación legal mensual", "unit": "%", "source": "CT art.50"},
        # Horas extra
        {"key": "RECARGO_HH_EE_HABILES", "value": 50.0, "description": "Recargo horas extra días hábiles", "unit": "%", "source": "CT art.32"},
        {"key": "RECARGO_HH_EE_DOMINGO", "value": 100.0, "description": "Recargo horas extra domingos/festivos", "unit": "%", "source": "CT art.32"},
        # Jornada
        {"key": "JORNADA_ORDINARIA_SEMANAL", "value": 40.0, "description": "Jornada ordinaria semanal (Ley 21.561)", "unit": "horas", "source": "Ley 21.561"},
    ]

    for d in defaults:
        param = LegalParameter(
            effective_date=today,
            is_active=True,
            **d,
        )
        db.add(param)
    db.commit()
    return {"message": f"Seeded {len(defaults)} parámetros legales"}


@router.put("/parameters/{key}")
def update_legal_parameter(
    key: str,
    data: LegalParamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_only),
):
    param = db.query(LegalParameter).filter(LegalParameter.key == key, LegalParameter.is_active == True).first()
    if not param:
        raise HTTPException(status_code=404, detail="Parámetro no encontrado")

    audit = LegalParamAudit(
        parameter_key=key,
        old_value=param.value,
        new_value=data.value,
        changed_by=current_user.id,
        change_reason=data.source or "Manual update",
        ai_proposed=False,
        approved_by=current_user.id,
    )
    from datetime import datetime
    audit.approved_at = datetime.utcnow()
    db.add(audit)

    param.value = data.value
    if data.description:
        param.description = data.description
    if data.unit:
        param.unit = data.unit
    if data.effective_date:
        param.effective_date = data.effective_date
    if data.source:
        param.source = data.source

    db.commit()
    db.refresh(param)
    return param


@router.get("/audit-log")
def get_audit_log(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(LegalParamAudit).order_by(LegalParamAudit.created_at.desc()).limit(100).all()


@router.post("/analyze")
async def analyze_legal_changes(
    query: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Use Claude AI to analyze Chilean labor law changes and propose parameter updates."""
    service = AILegalService()
    current_params = {p.key: float(p.value) for p in db.query(LegalParameter).filter(LegalParameter.is_active == True).all()}

    result = await service.analyze_legal_changes(query=query, current_params=current_params)
    return result


@router.post("/propose-update")
async def propose_parameter_update(
    key: str,
    new_value: Decimal,
    reason: str,
    ai_analysis: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Propose a parameter update (pending admin approval)."""
    param = db.query(LegalParameter).filter(LegalParameter.key == key, LegalParameter.is_active == True).first()
    if not param:
        raise HTTPException(status_code=404, detail="Parámetro no encontrado")

    audit = LegalParamAudit(
        parameter_key=key,
        old_value=param.value,
        new_value=new_value,
        changed_by=current_user.id,
        change_reason=reason,
        ai_proposed=True,
        ai_analysis=ai_analysis,
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return {"message": "Propuesta registrada, pendiente de aprobación", "audit_id": audit.id}


@router.post("/approve-proposal")
def approve_proposal(
    data: ProposalApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_only),
):
    audit = db.query(LegalParamAudit).filter(LegalParamAudit.id == data.audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    if audit.approved_by is not None:
        raise HTTPException(status_code=400, detail="Propuesta ya procesada")

    from datetime import datetime
    audit.approved_by = current_user.id
    audit.approved_at = datetime.utcnow()

    if data.approved:
        param = db.query(LegalParameter).filter(
            LegalParameter.key == audit.parameter_key,
            LegalParameter.is_active == True,
        ).first()
        if param:
            param.value = audit.new_value
        audit.change_reason = (audit.change_reason or "") + f" | Aprobado: {data.notes or ''}"

    db.commit()
    return {"message": "Propuesta aprobada" if data.approved else "Propuesta rechazada"}
