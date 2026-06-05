"""
Vacaciones router — Control de Vacaciones conforme Art. 67 Código del Trabajo de Chile.
- 15 días hábiles por año trabajado (lunes a sábado, excluyendo feriados)
- Trabajadores con >10 años: 20 días hábiles base
- Feriado progresivo: 1 día adicional por cada 3 años adicionales tras 10 años en empresa
- Días hábiles = lunes a sábado (sábado cuenta como día hábil en Chile para vacaciones)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel
import math

from database import get_db
from models.vacation import VacationBalance, VacationRequest, VacationRequestStatus
from models.employee import Employee
from models.company import Company
from models.user import User
from auth.jwt_handler import get_current_user, require_admin
from services.pdf_generator import generate_vacation_certificate_pdf

router = APIRouter()

# Chilean public holidays (approximate fixed ones; in production you'd query a service)
CHILEAN_HOLIDAYS_FIXED = {
    (1, 1),   # Año Nuevo
    (5, 1),   # Día del Trabajo
    (9, 18),  # Fiestas Patrias
    (9, 19),  # Día de las Glorias del Ejército
    (10, 12), # Día del Encuentro de Dos Mundos
    (11, 1),  # Día de Todos los Santos
    (12, 8),  # Inmaculada Concepción
    (12, 25), # Navidad
}


def count_business_days(start: date, end: date) -> float:
    """Count business days (Mon-Sat excl. holidays) between two dates inclusive."""
    if start > end:
        return 0.0
    count = 0
    current = start
    while current <= end:
        # Monday=0 ... Saturday=5, Sunday=6
        if current.weekday() <= 5:  # Mon-Sat
            if (current.month, current.day) not in CHILEAN_HOLIDAYS_FIXED:
                count += 1
        current += timedelta(days=1)
    return float(count)


def calculate_vacation_balance(employee: Employee) -> dict:
    """Calculate vacation balance for an employee based on Chilean law."""
    today = date.today()
    hire_date = employee.hire_date

    # Total months worked
    months_worked = (today.year - hire_date.year) * 12 + (today.month - hire_date.month)
    if today.day < hire_date.day:
        months_worked -= 1
    months_worked = max(0, months_worked)

    years_worked = months_worked / 12.0

    # Base days per year: 15 if <10 years, 20 if >=10 years
    base_days = 20 if years_worked >= 10 else 15

    # Progressive vacation: 1 extra day per 3 additional years beyond 10
    progressive_days = 0
    if years_worked > 10:
        extra_years = years_worked - 10
        progressive_days = int(extra_years // 3)

    total_days_per_year = base_days + progressive_days

    # Proportional earned days
    days_earned = round((months_worked / 12) * total_days_per_year, 2)

    return {
        "days_earned": days_earned,
        "months_worked": months_worked,
        "years_worked": round(years_worked, 2),
        "base_days": base_days,
        "progressive_days": progressive_days,
        "total_days_per_year": total_days_per_year,
    }


# --- Pydantic schemas ---

class VacationRequestCreate(BaseModel):
    employee_id: int
    start_date: date
    end_date: date
    reason: Optional[str] = None


class VacationRequestApprove(BaseModel):
    notes: Optional[str] = None


class VacationRequestReject(BaseModel):
    notes: str


class VacationRequestOut(BaseModel):
    id: int
    employee_id: int
    start_date: date
    end_date: date
    days_requested: float
    reason: Optional[str]
    status: str
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.get("/")
def list_vacations_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all active employees with their vacation balance summary."""
    emp_q = db.query(Employee).filter(Employee.is_active == True)
    if current_user.role != "super_admin" and current_user.company_id:
        emp_q = emp_q.filter(Employee.company_id == current_user.company_id)
    employees = emp_q.all()
    result = []
    for emp in employees:
        calc = calculate_vacation_balance(emp)
        balance = db.query(VacationBalance).filter(VacationBalance.employee_id == emp.id).first()
        days_taken = balance.days_taken if balance else 0.0
        days_earned = calc["days_earned"]
        days_pending = round(max(0.0, days_earned - days_taken), 2)
        result.append({
            "employee_id": emp.id,
            "employee_name": emp.full_name,
            "rut": emp.rut,
            "position": emp.position,
            "department": emp.department,
            "hire_date": str(emp.hire_date),
            "days_earned": days_earned,
            "days_taken": days_taken,
            "days_pending": days_pending,
            "years_worked": calc["years_worked"],
            "months_worked": calc["months_worked"],
        })
    return result


@router.get("/requests")
def list_requests(
    status: Optional[str] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List vacation requests with optional filters."""
    q = db.query(VacationRequest)
    if status:
        q = q.filter(VacationRequest.status == status)
    if employee_id:
        q = q.filter(VacationRequest.employee_id == employee_id)
    requests = q.order_by(VacationRequest.created_at.desc()).all()
    result = []
    for req in requests:
        emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
        result.append({
            "id": req.id,
            "employee_id": req.employee_id,
            "employee_name": emp.full_name if emp else f"Empleado #{req.employee_id}",
            "rut": emp.rut if emp else "",
            "start_date": str(req.start_date),
            "end_date": str(req.end_date),
            "days_requested": req.days_requested,
            "reason": req.reason,
            "status": str(req.status.value if hasattr(req.status, 'value') else req.status),
            "approved_by": req.approved_by,
            "approved_at": req.approved_at.isoformat() if req.approved_at else None,
            "notes": req.notes,
            "created_at": req.created_at.isoformat() if req.created_at else None,
        })
    return result


@router.get("/{employee_id}/balance")
def get_employee_balance(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate current vacation balance for one employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    calc = calculate_vacation_balance(emp)
    balance = db.query(VacationBalance).filter(VacationBalance.employee_id == employee_id).first()
    days_taken = balance.days_taken if balance else 0.0
    days_earned = calc["days_earned"]
    days_pending = round(max(0.0, days_earned - days_taken), 2)
    return {
        **calc,
        "employee_id": employee_id,
        "employee_name": emp.full_name,
        "days_taken": days_taken,
        "days_pending": days_pending,
    }


@router.get("/{employee_id}")
def get_employee_vacations(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get vacation detail including request history for one employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    calc = calculate_vacation_balance(emp)
    balance = db.query(VacationBalance).filter(VacationBalance.employee_id == employee_id).first()
    days_taken = balance.days_taken if balance else 0.0
    days_earned = calc["days_earned"]
    days_pending = round(max(0.0, days_earned - days_taken), 2)

    reqs = db.query(VacationRequest).filter(VacationRequest.employee_id == employee_id).order_by(VacationRequest.created_at.desc()).all()
    requests_out = []
    for req in reqs:
        requests_out.append({
            "id": req.id,
            "start_date": str(req.start_date),
            "end_date": str(req.end_date),
            "days_requested": req.days_requested,
            "reason": req.reason,
            "status": str(req.status.value if hasattr(req.status, 'value') else req.status),
            "notes": req.notes,
            "created_at": req.created_at.isoformat() if req.created_at else None,
        })

    return {
        **calc,
        "employee_id": employee_id,
        "employee_name": emp.full_name,
        "rut": emp.rut,
        "position": emp.position,
        "hire_date": str(emp.hire_date),
        "days_taken": days_taken,
        "days_pending": days_pending,
        "requests": requests_out,
    }


@router.post("/requests", status_code=201)
def create_vacation_request(
    data: VacationRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new vacation request."""
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    if data.end_date < data.start_date:
        raise HTTPException(status_code=400, detail="La fecha de término debe ser posterior a la fecha de inicio")

    # Calculate business days
    days_requested = count_business_days(data.start_date, data.end_date)
    if days_requested <= 0:
        raise HTTPException(status_code=400, detail="El período seleccionado no contiene días hábiles")

    # Check available balance
    calc = calculate_vacation_balance(emp)
    balance_rec = db.query(VacationBalance).filter(VacationBalance.employee_id == emp.id).first()
    days_taken = balance_rec.days_taken if balance_rec else 0.0
    days_pending = round(max(0.0, calc["days_earned"] - days_taken), 2)

    if days_requested > days_pending:
        raise HTTPException(
            status_code=400,
            detail=f"Días solicitados ({days_requested:.2f}) superan el saldo disponible ({days_pending:.2f} días)"
        )

    balance_id = balance_rec.id if balance_rec else None

    req = VacationRequest(
        employee_id=data.employee_id,
        balance_id=balance_id,
        start_date=data.start_date,
        end_date=data.end_date,
        days_requested=days_requested,
        reason=data.reason,
        status=VacationRequestStatus.pending,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {
        "id": req.id,
        "employee_id": req.employee_id,
        "start_date": str(req.start_date),
        "end_date": str(req.end_date),
        "days_requested": req.days_requested,
        "status": "pending",
        "message": f"Solicitud creada exitosamente. Días hábiles solicitados: {days_requested:.2f}",
    }


@router.put("/requests/{request_id}/approve")
def approve_vacation_request(
    request_id: int,
    data: VacationRequestApprove,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Approve a vacation request and update the balance."""
    req = db.query(VacationRequest).filter(VacationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if str(req.status.value if hasattr(req.status, 'value') else req.status) != "pending":
        raise HTTPException(status_code=400, detail="La solicitud ya fue procesada")

    req.status = VacationRequestStatus.approved
    req.approved_by = current_user.id
    req.approved_at = datetime.now()
    req.notes = data.notes

    # Update balance record — create if not exists
    balance = db.query(VacationBalance).filter(VacationBalance.employee_id == req.employee_id).first()
    if not balance:
        emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
        calc = calculate_vacation_balance(emp)
        balance = VacationBalance(
            employee_id=req.employee_id,
            year=date.today().year,
            days_earned=calc["days_earned"],
            days_taken=0.0,
        )
        db.add(balance)
        db.flush()

    balance.days_taken = round(float(balance.days_taken) + float(req.days_requested), 2)
    req.balance_id = balance.id

    db.commit()
    return {"message": "Solicitud aprobada exitosamente", "days_approved": req.days_requested}


@router.put("/requests/{request_id}/reject")
def reject_vacation_request(
    request_id: int,
    data: VacationRequestReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Reject a vacation request with required notes."""
    req = db.query(VacationRequest).filter(VacationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if str(req.status.value if hasattr(req.status, 'value') else req.status) != "pending":
        raise HTTPException(status_code=400, detail="La solicitud ya fue procesada")

    req.status = VacationRequestStatus.rejected
    req.approved_by = current_user.id
    req.approved_at = datetime.now()
    req.notes = data.notes

    db.commit()
    return {"message": "Solicitud rechazada"}


@router.get("/{employee_id}/pdf")
def get_vacation_certificate_pdf(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate and download a Certificado de Vacaciones PDF."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    calc = calculate_vacation_balance(emp)
    balance_rec = db.query(VacationBalance).filter(VacationBalance.employee_id == employee_id).first()
    days_taken = balance_rec.days_taken if balance_rec else 0.0
    days_earned = calc["days_earned"]
    days_pending = round(max(0.0, days_earned - days_taken), 2)

    balance_data = {**calc, "days_taken": days_taken, "days_pending": days_pending}

    reqs = db.query(VacationRequest).filter(VacationRequest.employee_id == employee_id).all()
    requests_list = [
        {
            "start_date": str(r.start_date),
            "end_date": str(r.end_date),
            "days_requested": r.days_requested,
            "status": str(r.status.value if hasattr(r.status, 'value') else r.status),
        }
        for r in reqs
    ]

    company = db.query(Company).first()
    filepath = generate_vacation_certificate_pdf(emp, balance_data, requests_list, company)
    return FileResponse(filepath, media_type="application/pdf", filename=f"certificado_vacaciones_{emp.rut}.pdf")
