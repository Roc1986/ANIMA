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
from models.imm_value import IMMValue
from models.uf_value import UFValue
from models.payroll import PayrollEntry, PayrollRun
from services.pdf_generator import generate_finiquito_pdf

router = APIRouter()


@router.get("/legal-params")
def get_legal_params_public(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns basic legal parameters (IMM, UF, UTM) for any authenticated user."""
    keys = ["imm_value", "uf_value", "utm_value"]
    params = db.query(LegalParameter).filter(
        LegalParameter.key.in_(keys),
        LegalParameter.company_id == None,
        LegalParameter.is_active == True,
    ).all()
    return {p.key: float(p.value) for p in params}


class FiniquitoRequest(BaseModel):
    employee_id: int
    termination_date: date
    termination_cause: str  # "Art. 159", "Art. 160", "Art. 161 N°1", "Art. 161 N°2"
    last_salary: float
    pending_vacation_days: float = 0  # días hábiles
    pending_salary_days: int = 0
    pending_gratificacion: float = 0
    no_advance_notice: bool = False  # if no 30-day notice given
    afc_deduction: float = 0  # monto acumulado AFC empleador a descontar (Art. 13 Ley 19.728)


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


def _get_imm_for_date(db: Session, ref_date: date) -> float:
    """Returns the IMM vigente on a given date using historical table."""
    row = db.query(IMMValue).filter(IMMValue.date <= ref_date).order_by(IMMValue.date.desc()).first()
    if row:
        return float(row.value)
    param = db.query(LegalParameter).filter(LegalParameter.key == "imm_value").first()
    return float(param.value) if param else 553553.0


def _get_uf_for_date(db: Session, ref_date: date) -> float:
    """Returns end-of-month UF for the month of termination (Previred standard)."""
    import calendar
    last_day = calendar.monthrange(ref_date.year, ref_date.month)[1]
    end_of_month = ref_date.replace(day=last_day)
    row = db.query(UFValue).filter(UFValue.date <= end_of_month).order_by(UFValue.date.desc()).first()
    if row:
        return float(row.value)
    # fallback to global param
    param = db.query(LegalParameter).filter(LegalParameter.key == "uf_value").first()
    return float(param.value) if param else 40820.0


@router.get("/last-imponible/{employee_id}")
def get_last_imponible(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the remuneracion_imponible from the most recent payroll entry for an employee."""
    entry = (
        db.query(PayrollEntry)
        .join(PayrollRun, PayrollEntry.payroll_run_id == PayrollRun.id)
        .filter(PayrollEntry.employee_id == employee_id)
        .order_by(PayrollRun.year.desc(), PayrollRun.month.desc())
        .first()
    )
    if entry:
        # Always reconstruct from stored components (base + gratificacion + overtime + bono_otros)
        # to avoid cases where remuneracion_imponible was stored incorrectly as just base_salary
        reconstructed = (
            float(entry.base_salary or 0)
            + float(entry.gratificacion or 0)
            + float(entry.overtime_weekday or 0)
            + float(entry.overtime_sunday or 0)
            + float(entry.bono_otros or 0)
        )
        stored = float(entry.remuneracion_imponible or 0)
        imponible = max(reconstructed, stored)
        if imponible > 0:
            return {
                "remuneracion_imponible": round(imponible),
                "found": True,
                "debug": {
                    "stored_imponible": stored,
                    "reconstructed": reconstructed,
                    "base_salary": float(entry.base_salary or 0),
                    "gratificacion": float(entry.gratificacion or 0),
                    "entry_id": entry.id,
                }
            }
    # fallback: base salary from employee record
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    return {"remuneracion_imponible": float(emp.base_salary) if emp else 0, "found": False}


@router.get("/afc-estimate/{employee_id}")
def get_afc_estimate(
    employee_id: int,
    termination_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Estimates the accumulated AFC employer contribution (1.6%) from payroll history.
    Compares months with records against total months of service so the caller
    can warn the user when historical periods are missing.
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    entries = (
        db.query(PayrollEntry)
        .join(PayrollRun, PayrollEntry.payroll_run_id == PayrollRun.id)
        .filter(PayrollEntry.employee_id == employee_id)
        .all()
    )
    afc_from_system = sum(float(e.remuneracion_imponible or 0) * 0.016 for e in entries)

    # Total months of service
    term = date.fromisoformat(termination_date) if termination_date else date.today()
    hire = emp.hire_date
    total_months = (term.year - hire.year) * 12 + (term.month - hire.month)
    if term.day < hire.day:
        total_months -= 1
    total_months = max(total_months, 0)

    months_in_system = len(entries)
    months_missing = max(total_months - months_in_system, 0)

    if months_in_system == 0:
        coverage = "none"
    elif months_missing == 0:
        coverage = "full"
    else:
        coverage = "partial"

    return {
        "employee_id": employee_id,
        "months_in_system": months_in_system,
        "total_months_service": total_months,
        "months_missing": months_missing,
        "afc_from_system": round(afc_from_system, 0),
        "coverage": coverage,  # "none" | "partial" | "full"
        "rate_used": 0.016,
    }


@router.post("/calculate")
def calculate_finiquito(
    data: FiniquitoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    uf_value = _get_uf_for_date(db, data.termination_date)
    uf_cap = 90 * uf_value  # 90 UF cap for indemnización (Art. 163)
    imm_value = _get_imm_for_date(db, data.termination_date)

    # Calculate years of service
    hire = emp.hire_date
    term = data.termination_date
    total_days = (term - hire).days
    years = total_days / 365.25
    months = int(total_days / 30.44)

    # Legal rounding: fraction > 6 months counts as a full year (Art. 163 CT)
    complete_years_raw = total_days / 365.25
    full_years = int(complete_years_raw)
    remaining_months = (complete_years_raw - full_years) * 12
    complete_years_legal = full_years + (1 if remaining_months >= 6 else 0)

    # Daily salary
    daily_salary = data.last_salary / 30

    # Indemnización por años de servicio (Art. 163 - only Art. 161)
    indemnizacion_anos = 0.0
    capped_salary = min(data.last_salary, uf_cap)
    if "161" in data.termination_cause:
        indemnizacion_years = min(complete_years_legal, 11)
        indemnizacion_anos = capped_salary * indemnizacion_years

    # Indemnización sustitutiva aviso previo (Art. 161 with no notice) — also capped at 90 UF
    indemnizacion_aviso_previo = 0.0
    if "161" in data.termination_cause and data.no_advance_notice:
        indemnizacion_aviso_previo = capped_salary

    # Vacaciones proporcionales
    # pending_vacation_days is the total balance in días hábiles as reported by
    # the vacations module (already includes all accrued days). Convert to días
    # corridos (× 7/5) per DT standard to include weekends in the payment.
    vacation_days_habiles_total = data.pending_vacation_days
    vacation_days_corridos = vacation_days_habiles_total * (7 / 5)
    vacaciones_proporcionales = vacation_days_corridos * daily_salary

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

    # AFC employer deduction (Art. 13 Ley 19.728) — optional, applied against indemnización años
    # Cannot exceed indemnización_anos
    afc_deduction = min(data.afc_deduction, indemnizacion_anos)

    total_neto = total_haberes - descuentos_previsionales - afc_deduction

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
        "afc_deduction": round(afc_deduction, 0),
        "breakdown": {
            "uf_value": uf_value,
            "uf_cap": uf_cap,
            "capped_salary": capped_salary,
            "complete_years": complete_years_legal,
            "pending_vacation_days": data.pending_vacation_days,
            "total_vacation_habiles": round(vacation_days_habiles_total, 2),
            "total_vacation_days": round(vacation_days_corridos, 2),
            "daily_salary": round(daily_salary, 2),
            "no_advance_notice": data.no_advance_notice,
            "imm_value": imm_value,
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

    # Upsert finiquito document in dossier (replace existing to avoid duplicates)
    term_date = data.calculation.get("termination_date", "")
    title = f"Finiquito {emp.full_name} — {term_date}"
    existing = db.query(Document).filter(
        Document.employee_id == emp.id,
        Document.document_type == DocumentType.finiquito,
    ).first()
    if existing:
        existing.file_path = filepath
        existing.title = title
        existing.generated_by = current_user.id
    else:
        db.add(Document(
            employee_id=emp.id,
            document_type=DocumentType.finiquito,
            title=title,
            file_path=filepath,
            generated_by=current_user.id,
        ))
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
    """Persiste el finiquito, genera PDF al dossier y desactiva al empleado."""
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Auto-generate PDF and save to dossier if calculation provided
    if data.calculation:
        # Check if finiquito document already exists for this employee
        existing_doc = db.query(Document).filter(
            Document.employee_id == emp.id,
            Document.document_type == DocumentType.finiquito,
        ).first()
        if not existing_doc:
            try:
                company = db.query(Company).filter(Company.id == emp.company_id).first() if emp.company_id else db.query(Company).first()
                filepath = generate_finiquito_pdf(data.calculation, emp, company)
                doc = Document(
                    employee_id=emp.id,
                    document_type=DocumentType.finiquito,
                    title=f"Finiquito {emp.full_name} — {data.termination_date}",
                    file_path=filepath,
                    generated_by=current_user.id,
                )
                db.add(doc)
            except Exception:
                pass  # Don't block confirmation if PDF generation fails

    emp.is_active = False
    emp.termination_date = data.termination_date
    emp.termination_reason = data.termination_cause
    db.commit()
    return {"message": "Finiquito confirmado. Empleado dado de baja.", "employee_id": emp.id}
