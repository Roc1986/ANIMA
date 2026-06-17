from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from pydantic import BaseModel
from decimal import Decimal

from database import get_db
from models.employee import Employee
from models.company import Company
from models.legal_params import LegalParameter
from auth.jwt_handler import get_current_user, require_admin
from models.user import User
from models.document import Document, DocumentType
from services.pdf_generator import generate_finiquito_pdf

router = APIRouter()


class FiniquitoRequest(BaseModel):
    employee_id: int
    termination_date: date
    termination_cause: str  # "Art. 159", "Art. 160", "Art. 161 N°1", "Art. 161 N°2"
    last_salary: float
    pending_vacation_days: float = 0
    pending_salary_days: int = 0
    pending_gratificacion: float = 0
    no_advance_notice: bool = False  # if no 30-day notice given


class FiniquitoCalculation(BaseModel):
    employee_id: int
    employee_name: str
    employee_rut: str
    employee_position: str
    hire_date: str
    termination_date: str
    termination_cause: str
    last_salary: float
    years_of_service: float
    months_of_service: int
    # Conceptos
    indemnizacion_anos: float
    indemnizacion_aviso_previo: float
    vacaciones_proporcionales: float
    remuneraciones_pendientes: float
    gratificacion_proporcional: float
    total_haberes: float
    descuentos_previsionales: float
    total_neto: float
    breakdown: dict


def _get_uf(db: Session) -> float:
    param = db.query(LegalParameter).filter(LegalParameter.key == "uf_value").first()
    if param:
        return float(param.value)
    return 38000.0  # fallback


@router.post("/calculate")
def calculate_finiquito(
    data: FiniquitoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    uf_value = _get_uf(db)
    uf_cap = 90 * uf_value  # 90 UF cap for indemnización

    # Calculate years of service
    hire = emp.hire_date
    term = data.termination_date
    total_days = (term - hire).days
    years = total_days / 365.25
    months = int(total_days / 30.44)

    # Daily salary
    daily_salary = data.last_salary / 30

    # Indemnización por años de servicio (Art. 163 - only Art. 161)
    indemnizacion_anos = 0.0
    capped_salary = min(data.last_salary, uf_cap)
    if "161" in data.termination_cause:
        complete_years = int(years)
        if complete_years > 11:
            complete_years = 11
        indemnizacion_anos = capped_salary * complete_years

    # Indemnización sustitutiva aviso previo (Art. 161 with no notice)
    indemnizacion_aviso_previo = 0.0
    if "161" in data.termination_cause and data.no_advance_notice:
        indemnizacion_aviso_previo = data.last_salary

    # Vacaciones proporcionales
    # Legally: 15 working days per year = 1.25 days/month
    months_worked_current_year = months % 12
    vacation_earned = months_worked_current_year * 1.25
    vacation_days_total = vacation_earned + data.pending_vacation_days
    vacaciones_proporcionales = vacation_days_total * daily_salary

    # Remuneraciones pendientes
    remuneraciones_pendientes = daily_salary * data.pending_salary_days

    # Gratificación proporcional pendiente
    gratificacion_proporcional = data.pending_gratificacion

    total_haberes = (
        indemnizacion_anos
        + indemnizacion_aviso_previo
        + vacaciones_proporcionales
        + remuneraciones_pendientes
        + gratificacion_proporcional
    )

    # Descuentos previsionales (7% salud + AFP) on remuneraciones pendientes only
    descuentos_previsionales = remuneraciones_pendientes * 0.127  # approx 7% + 5.7% AFP

    total_neto = total_haberes - descuentos_previsionales

    result = {
        "employee_id": emp.id,
        "employee_name": emp.full_name,
        "employee_rut": emp.rut,
        "employee_position": emp.position,
        "hire_date": str(emp.hire_date),
        "termination_date": str(data.termination_date),
        "termination_cause": data.termination_cause,
        "last_salary": data.last_salary,
        "years_of_service": round(years, 2),
        "months_of_service": months,
        "indemnizacion_anos": round(indemnizacion_anos, 0),
        "indemnizacion_aviso_previo": round(indemnizacion_aviso_previo, 0),
        "vacaciones_proporcionales": round(vacaciones_proporcionales, 0),
        "remuneraciones_pendientes": round(remuneraciones_pendientes, 0),
        "gratificacion_proporcional": round(gratificacion_proporcional, 0),
        "total_haberes": round(total_haberes, 0),
        "descuentos_previsionales": round(descuentos_previsionales, 0),
        "total_neto": round(total_neto, 0),
        "breakdown": {
            "uf_value": uf_value,
            "uf_cap": uf_cap,
            "capped_salary": capped_salary,
            "complete_years": int(years),
            "vacation_earned_days": round(vacation_earned, 2),
            "pending_vacation_days": data.pending_vacation_days,
            "total_vacation_days": round(vacation_days_total, 2),
            "daily_salary": round(daily_salary, 2),
            "no_advance_notice": data.no_advance_notice,
        }
    }
    return result


class FiniquitoPDFRequest(BaseModel):
    calculation: dict
    employee_id: int


@router.post("/generate-pdf")
def generate_finiquito_pdf_endpoint(
    data: FiniquitoPDFRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    company = db.query(Company).filter(Company.id == emp.company_id).first() if emp.company_id else db.query(Company).first()
    filepath = generate_finiquito_pdf(data.calculation, emp, company)

    # Auto-save to employee dossier
    doc = Document(
        employee_id=emp.id,
        document_type=DocumentType.finiquito,
        title=f"Finiquito {emp.full_name}",
        file_path=filepath,
        generated_by=current_user.id,
    )
    db.add(doc)
    db.commit()

    return FileResponse(filepath, media_type="application/pdf", filename=f"finiquito_{emp.rut}.pdf")


class FiniquitoConfirmRequest(BaseModel):
    employee_id: int
    termination_date: date
    termination_cause: str
    calculation: dict


@router.post("/confirm")
def confirm_finiquito(
    data: FiniquitoConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Persiste el finiquito y desactiva al empleado."""
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    emp.is_active = False
    emp.termination_date = data.termination_date
    emp.termination_reason = data.termination_cause
    db.commit()
    return {"message": "Finiquito confirmado. Empleado dado de baja.", "employee_id": emp.id}
