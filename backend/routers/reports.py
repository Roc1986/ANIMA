from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os

from database import get_db
from models.payroll import PayrollRun, PayrollEntry
from models.employee import Employee
from auth.jwt_handler import get_current_user, require_admin
from models.user import User
from services.pdf_generator import generate_libro_remuneraciones_pdf
from services.excel_generator import generate_previred_excel, generate_dj1887_excel

router = APIRouter()


@router.get("/libro-remuneraciones/{run_id}/pdf")
def libro_remuneraciones_pdf(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")

    entries = db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id == run_id).all()
    employees = {e.id: e for e in db.query(Employee).all()}

    pdf_path = generate_libro_remuneraciones_pdf(run=run, entries=entries, employees=employees)
    return FileResponse(pdf_path, media_type="application/pdf",
                        filename=f"libro_remuneraciones_{run.period_year}_{run.period_month:02d}.pdf")


@router.get("/previred/{run_id}/excel")
def previred_excel(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")

    entries = db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id == run_id).all()
    employees = {e.id: e for e in db.query(Employee).all()}

    excel_path = generate_previred_excel(run=run, entries=entries, employees=employees)
    return FileResponse(excel_path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        filename=f"previred_{run.period_year}_{run.period_month:02d}.xlsx")


@router.get("/dj1887/{year}/excel")
def dj1887_excel(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    runs = db.query(PayrollRun).filter(PayrollRun.period_year == year).all()
    if not runs:
        raise HTTPException(status_code=404, detail="No hay nóminas para ese año")

    run_ids = [r.id for r in runs]
    entries = db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id.in_(run_ids)).all()
    employees = {e.id: e for e in db.query(Employee).all()}

    excel_path = generate_dj1887_excel(year=year, entries=entries, employees=employees)
    return FileResponse(excel_path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        filename=f"DJ1887_{year}.xlsx")


@router.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models.employee import Employee as Emp
    total_employees = db.query(Emp).filter(Emp.is_active == True).count()
    total_all = db.query(Emp).count()

    latest_run = db.query(PayrollRun).order_by(
        PayrollRun.period_year.desc(), PayrollRun.period_month.desc()
    ).first()

    latest_run_data = None
    if latest_run:
        entries = db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id == latest_run.id).all()
        total_liquido = sum(float(e.liquido_pagar) for e in entries)
        total_costo = sum(float(e.total_costo_empleador) for e in entries)
        latest_run_data = {
            "id": latest_run.id,
            "period_year": latest_run.period_year,
            "period_month": latest_run.period_month,
            "status": latest_run.status,
            "total_liquido": total_liquido,
            "total_costo_empresa": total_costo,
            "num_empleados": len(entries),
        }

    return {
        "total_empleados_activos": total_employees,
        "total_empleados": total_all,
        "ultima_nomina": latest_run_data,
    }
