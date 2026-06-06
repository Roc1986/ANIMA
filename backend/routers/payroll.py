from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel

from database import get_db
from models.payroll import PayrollRun, PayrollEntry, PayrollStatus
from models.employee import Employee
from models.contract import Contract
from models.legal_params import LegalParameter
from schemas.payroll import (
    PayrollRunCreate, PayrollRunOut, PayrollEntryOut,
    PayrollRunDetail, PayrollCalculateRequest
)
from auth.jwt_handler import get_current_user, require_admin
from models.user import User
from models.company import Company
from services.payroll_calculator import ChileanPayrollCalculator
from services.pdf_generator import generate_liquidacion_pdf
from fastapi.responses import FileResponse
from dependencies import filter_by_company
import os

router = APIRouter()


def _get_legal_params(db: Session) -> dict:
    params = db.query(LegalParameter).filter(
        LegalParameter.is_active == True,
        LegalParameter.company_id == None,
    ).all()
    return {p.key: float(p.value) for p in params}


@router.get("/", response_model=List[PayrollRunOut])
def list_payroll_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(PayrollRun)
    q = filter_by_company(q, PayrollRun, current_user)
    return q.order_by(PayrollRun.period_year.desc(), PayrollRun.period_month.desc()).all()


@router.post("/", response_model=PayrollRunOut, status_code=201)
def create_payroll_run(
    data: PayrollRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    company_id = current_user.company_id
    if not company_id:
        raise HTTPException(status_code=400, detail="Se requiere company_id")

    existing = db.query(PayrollRun).filter(
        PayrollRun.company_id == company_id,
        PayrollRun.period_year == data.period_year,
        PayrollRun.period_month == data.period_month,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una nómina para ese período")

    run_data = data.model_dump()
    run_data['company_id'] = company_id
    run = PayrollRun(**run_data)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


@router.get("/{run_id}", response_model=PayrollRunDetail)
def get_payroll_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(PayrollRun).filter(PayrollRun.id == run_id)
    q = filter_by_company(q, PayrollRun, current_user)
    run = q.first()
    if not run:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")
    entries = db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id == run_id).all()
    total_liquido = sum(e.liquido_pagar for e in entries)
    total_costo = sum(e.total_costo_empleador for e in entries)
    return PayrollRunDetail(
        run=run,
        entries=entries,
        total_liquido=total_liquido,
        total_costo_empresa=total_costo,
        total_trabajadores=len(entries),
    )


@router.post("/{run_id}/calculate")
def calculate_payroll(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(PayrollRun).filter(PayrollRun.id == run_id)
    q = filter_by_company(q, PayrollRun, current_user)
    run = q.first()
    if not run:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")
    if run.status not in (PayrollStatus.draft,):
        raise HTTPException(status_code=400, detail="La nómina ya fue calculada o aprobada")

    legal_params = _get_legal_params(db)
    calculator = ChileanPayrollCalculator(
        uf_value=float(run.uf_value),
        utm_value=float(run.utm_value),
        imm_value=float(run.imm_value),
        legal_params=legal_params,
    )

    employees = db.query(Employee).filter(
        Employee.company_id == run.company_id,
        Employee.is_active == True,
    ).all()
    created_entries = []

    for emp in employees:
        db.query(PayrollEntry).filter(
            PayrollEntry.payroll_run_id == run_id,
            PayrollEntry.employee_id == emp.id,
        ).delete()

        contract = db.query(Contract).filter(
            Contract.employee_id == emp.id,
            Contract.is_active == True,
        ).first()
        ct_raw = str(contract.contract_type) if contract else "indefinido"
        contract_type = ct_raw.split('.')[-1] if '.' in ct_raw else ct_raw

        result = calculator.calculate(
            employee=emp,
            contract_type=str(contract_type),
            dias_trabajados=30,
            horas_extra_habiles=0,
            horas_extra_domingo=0,
            bono_colacion=float(emp.isapre_monthly_amount or 0),
            bono_movilizacion=0,
            bono_otros=0,
            asignacion_familiar=0,
            adelanto=0,
            descuento_otros=0,
        )

        entry = PayrollEntry(
            payroll_run_id=run_id,
            employee_id=emp.id,
            **result,
        )
        db.add(entry)
        created_entries.append(entry)

    run.status = PayrollStatus.calculated
    db.commit()
    return {"message": f"Nómina calculada para {len(created_entries)} empleados"}


@router.post("/{run_id}/entry")
def add_or_update_entry(
    run_id: int,
    req: PayrollCalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(PayrollRun).filter(PayrollRun.id == run_id)
    q = filter_by_company(q, PayrollRun, current_user)
    run = q.first()
    if not run:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")

    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    contract = db.query(Contract).filter(
        Contract.employee_id == emp.id,
        Contract.is_active == True,
    ).first()
    contract_type = contract.contract_type if contract else "indefinido"

    legal_params = _get_legal_params(db)
    calculator = ChileanPayrollCalculator(
        uf_value=float(run.uf_value),
        utm_value=float(run.utm_value),
        imm_value=float(run.imm_value),
        legal_params=legal_params,
    )

    result = calculator.calculate(
        employee=emp,
        contract_type=str(contract_type),
        dias_trabajados=req.dias_trabajados,
        horas_extra_habiles=float(req.horas_extra_habiles),
        horas_extra_domingo=float(req.horas_extra_domingo),
        bono_colacion=float(req.bono_colacion),
        bono_movilizacion=float(req.bono_movilizacion),
        bono_otros=float(req.bono_otros),
        asignacion_familiar=float(req.asignacion_familiar),
        adelanto=float(req.adelanto),
        descuento_otros=float(req.descuento_otros),
    )

    existing = db.query(PayrollEntry).filter(
        PayrollEntry.payroll_run_id == run_id,
        PayrollEntry.employee_id == req.employee_id,
    ).first()

    if existing:
        for k, v in result.items():
            setattr(existing, k, v)
    else:
        entry = PayrollEntry(payroll_run_id=run_id, employee_id=req.employee_id, **result)
        db.add(entry)

    db.commit()
    return {"message": "Entrada calculada correctamente", "data": result}


@router.post("/{run_id}/approve")
def approve_payroll(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(PayrollRun).filter(PayrollRun.id == run_id)
    q = filter_by_company(q, PayrollRun, current_user)
    run = q.first()
    if not run:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")
    if run.status != PayrollStatus.calculated:
        raise HTTPException(status_code=400, detail="La nómina debe estar calculada primero")
    run.status = PayrollStatus.approved
    run.approved_by = current_user.id
    from datetime import datetime
    run.approved_at = datetime.utcnow()
    db.commit()
    return {"message": "Nómina aprobada"}


@router.post("/{run_id}/reopen")
def reopen_payroll(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(PayrollRun).filter(PayrollRun.id == run_id)
    q = filter_by_company(q, PayrollRun, current_user)
    run = q.first()
    if not run:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")
    if run.status != PayrollStatus.approved:
        raise HTTPException(status_code=400, detail="Solo se pueden reabrir nóminas aprobadas")
    run.status = PayrollStatus.calculated
    run.approved_by = None
    run.approved_at = None
    db.commit()
    return {"message": "Nómina reabierta — puede agregar o modificar entradas y volver a aprobar"}


class ReverseCalculateRequest(BaseModel):
    liquido_deseado: float
    afp: str = "Habitat"
    health_system: str = "FONASA"
    contract_type: str = "indefinido"
    isapre_monthly_amount: float = 0


class MockEmployee:
    def __init__(self, base_salary, afp, health_system, isapre_monthly_amount=0):
        self.base_salary = base_salary
        self.afp = afp
        self.health_system = health_system
        self.isapre_monthly_amount = isapre_monthly_amount
        self.second_last_name = None


@router.post("/reverse-calculate")
def reverse_calculate(
    req: ReverseCalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculates the required gross salary (sueldo base) to achieve a desired net pay (líquido).
    Uses iterative bisection to converge within $1.
    """
    legal_params = _get_legal_params(db)

    # Use current reference values (approximate if no run context available)
    uf_value = legal_params.get("UF_VALUE", 38500.0)
    utm_value = legal_params.get("UTM_VALUE", 67294.0)
    imm_value = legal_params.get("IMM_VALUE", 500000.0)

    # Fallback defaults if not in legal_params
    if uf_value == 38500.0 and "UF_VALUE" not in legal_params:
        uf_value = 38500.0
    if utm_value == 67294.0 and "UTM_VALUE" not in legal_params:
        utm_value = 67294.0
    if imm_value == 500000.0 and "IMM_VALUE" not in legal_params:
        imm_value = 500000.0

    calculator = ChileanPayrollCalculator(
        uf_value=uf_value,
        utm_value=utm_value,
        imm_value=imm_value,
        legal_params=legal_params,
    )

    liquido_deseado = req.liquido_deseado

    def calc_liquido(sueldo_base: float) -> dict:
        emp = MockEmployee(
            base_salary=sueldo_base,
            afp=req.afp,
            health_system=req.health_system,
            isapre_monthly_amount=req.isapre_monthly_amount,
        )
        return calculator.calculate(emp, contract_type=req.contract_type)

    # Bisection search
    lo = liquido_deseado * 0.9
    hi = liquido_deseado * 2.0

    # Expand hi if needed
    for _ in range(20):
        result = calc_liquido(hi)
        if result["liquido_pagar"] >= liquido_deseado:
            break
        hi *= 1.5

    best_result = None
    best_sueldo = hi

    for _ in range(50):
        mid = (lo + hi) / 2.0
        result = calc_liquido(mid)
        liquido = result["liquido_pagar"]

        if abs(liquido - liquido_deseado) <= 1:
            best_result = result
            best_sueldo = mid
            break

        if liquido < liquido_deseado:
            lo = mid
        else:
            hi = mid
            best_result = result
            best_sueldo = mid

    if best_result is None:
        best_result = calc_liquido(best_sueldo)

    sueldo_base_requerido = int(round(best_sueldo))
    # Recalculate with rounded value for clean output
    final_result = calc_liquido(sueldo_base_requerido)

    return {
        "liquido_deseado": int(liquido_deseado),
        "sueldo_base_requerido": sueldo_base_requerido,
        "remuneracion_imponible": final_result["remuneracion_imponible"],
        "gratificacion": final_result["gratificacion"],
        "descuento_afp": final_result["descuento_afp"],
        "descuento_salud": final_result["descuento_salud"],
        "descuento_cesantia": final_result["descuento_cesantia"],
        "impuesto_unico": final_result["impuesto_unico"],
        "total_descuentos": final_result["total_descuentos_previsionales"] + final_result["impuesto_unico"],
        "liquido_resultante": final_result["liquido_pagar"],
        "diferencia": final_result["liquido_pagar"] - int(liquido_deseado),
    }


@router.get("/{run_id}/entry/{entry_id}/pdf")
def get_liquidacion_pdf(
    run_id: int,
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(PayrollEntry).filter(
        PayrollEntry.id == entry_id,
        PayrollEntry.payroll_run_id == run_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")

    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    emp = db.query(Employee).filter(Employee.id == entry.employee_id).first()
    company = db.query(Company).filter(Company.id == run.company_id).first() if run else None

    pdf_path = generate_liquidacion_pdf(entry=entry, employee=emp, payroll_run=run, company=company)
    return FileResponse(pdf_path, media_type="application/pdf", filename=os.path.basename(pdf_path))
