from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

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
from services.payroll_calculator import ChileanPayrollCalculator
from services.pdf_generator import generate_liquidacion_pdf
from fastapi.responses import FileResponse
import os

router = APIRouter()


def _get_legal_params(db: Session) -> dict:
    params = db.query(LegalParameter).filter(LegalParameter.is_active == True).all()
    return {p.key: float(p.value) for p in params}


@router.get("/", response_model=List[PayrollRunOut])
def list_payroll_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(PayrollRun).order_by(PayrollRun.period_year.desc(), PayrollRun.period_month.desc()).all()


@router.post("/", response_model=PayrollRunOut, status_code=201)
def create_payroll_run(
    data: PayrollRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(PayrollRun).filter(
        PayrollRun.period_year == data.period_year,
        PayrollRun.period_month == data.period_month,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una nómina para ese período")
    run = PayrollRun(**data.model_dump())
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
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
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
    """Calculate payroll for all active employees for this run."""
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
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

    employees = db.query(Employee).filter(Employee.is_active == True).all()
    created_entries = []

    for emp in employees:
        # Remove any existing entry for this run/employee
        db.query(PayrollEntry).filter(
            PayrollEntry.payroll_run_id == run_id,
            PayrollEntry.employee_id == emp.id,
        ).delete()

        # Get active contract
        contract = db.query(Contract).filter(
            Contract.employee_id == emp.id,
            Contract.is_active == True,
        ).first()
        contract_type = contract.contract_type if contract else "indefinido"

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
    """Add or recalculate a single employee entry in a payroll run."""
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
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

    # Upsert entry
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
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
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

    pdf_path = generate_liquidacion_pdf(entry=entry, employee=emp, payroll_run=run)
    return FileResponse(pdf_path, media_type="application/pdf", filename=os.path.basename(pdf_path))
