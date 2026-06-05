"""
Contratos de Trabajo router — Tipos conforme Código del Trabajo de Chile.
Tipos: indefinido / plazo_fijo / obra_faena / part_time
PDF con cláusulas obligatorias del Art. 10 CT.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel

from database import get_db
from models.contract import Contract, ContractType, WorkSchedule
from models.employee import Employee
from models.company import Company
from models.user import User
from auth.jwt_handler import get_current_user, require_admin
from services.pdf_generator import generate_contract_pdf

router = APIRouter()


# --- Pydantic schemas ---

class ContractCreate(BaseModel):
    employee_id: int
    contract_type: ContractType
    start_date: date
    end_date: Optional[date] = None
    base_salary: float
    weekly_hours: int = 40
    work_schedule: WorkSchedule = WorkSchedule.full_time_40
    gratificacion_type: str = "legal"
    work_location: Optional[str] = None
    schedule_details: Optional[str] = None
    services_description: Optional[str] = None
    additional_clauses: Optional[str] = None
    obra_description: Optional[str] = None
    has_confidentiality: bool = False
    notes: Optional[str] = None
    signed_at: Optional[date] = None


class ContractUpdate(BaseModel):
    end_date: Optional[date] = None
    base_salary: Optional[float] = None
    weekly_hours: Optional[int] = None
    work_schedule: Optional[WorkSchedule] = None
    gratificacion_type: Optional[str] = None
    is_active: Optional[bool] = None
    work_location: Optional[str] = None
    schedule_details: Optional[str] = None
    services_description: Optional[str] = None
    additional_clauses: Optional[str] = None
    obra_description: Optional[str] = None
    has_confidentiality: Optional[bool] = None
    notes: Optional[str] = None
    signed_at: Optional[date] = None


def _contract_status(contract: Contract) -> str:
    """Determine contract status: vigente / vencido / por_vencer."""
    if not contract.is_active:
        return "inactivo"
    if contract.end_date is None:
        return "vigente"
    today = date.today()
    if contract.end_date < today:
        return "vencido"
    if contract.end_date <= today + timedelta(days=30):
        return "por_vencer"
    return "vigente"


def _contract_to_dict(contract: Contract, employee: Optional[Employee] = None) -> dict:
    ct_val = str(contract.contract_type.value if hasattr(contract.contract_type, 'value') else contract.contract_type)
    ws_val = str(contract.work_schedule.value if hasattr(contract.work_schedule, 'value') else contract.work_schedule) if contract.work_schedule else None
    return {
        "id": contract.id,
        "employee_id": contract.employee_id,
        "employee_name": employee.full_name if employee else None,
        "rut": employee.rut if employee else None,
        "position": employee.position if employee else None,
        "contract_type": ct_val,
        "start_date": str(contract.start_date),
        "end_date": str(contract.end_date) if contract.end_date else None,
        "base_salary": float(contract.base_salary),
        "weekly_hours": contract.weekly_hours,
        "work_schedule": ws_val,
        "gratificacion_type": contract.gratificacion_type,
        "is_active": contract.is_active,
        "work_location": contract.work_location,
        "schedule_details": contract.schedule_details,
        "services_description": contract.services_description,
        "additional_clauses": contract.additional_clauses,
        "obra_description": contract.obra_description,
        "has_confidentiality": contract.has_confidentiality,
        "notes": contract.notes,
        "signed_at": str(contract.signed_at) if contract.signed_at else None,
        "created_at": contract.created_at.isoformat() if contract.created_at else None,
        "status": _contract_status(contract),
    }


# --- Endpoints ---

@router.get("/")
def list_contracts(
    employee_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    contract_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all contracts with optional filters."""
    q = db.query(Contract)
    if employee_id:
        q = q.filter(Contract.employee_id == employee_id)
    elif current_user.role != "super_admin" and current_user.company_id:
        q = q.join(Employee, Contract.employee_id == Employee.id).filter(
            Employee.company_id == current_user.company_id
        )
    if is_active is not None:
        q = q.filter(Contract.is_active == is_active)
    if contract_type:
        q = q.filter(Contract.contract_type == contract_type)
    contracts = q.order_by(Contract.created_at.desc()).all()
    result = []
    emp_cache = {}
    for c in contracts:
        if c.employee_id not in emp_cache:
            emp_cache[c.employee_id] = db.query(Employee).filter(Employee.id == c.employee_id).first()
        result.append(_contract_to_dict(c, emp_cache[c.employee_id]))
    return result


@router.get("/expiring-soon")
def list_expiring_contracts(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List plazo fijo contracts expiring within the next N days."""
    today = date.today()
    cutoff = today + timedelta(days=days)
    q = db.query(Contract).filter(
        Contract.is_active == True,
        Contract.end_date != None,
        Contract.end_date >= today,
        Contract.end_date <= cutoff,
    )
    if current_user.role != "super_admin" and current_user.company_id:
        q = q.join(Employee, Contract.employee_id == Employee.id).filter(
            Employee.company_id == current_user.company_id
        )
    contracts = q.order_by(Contract.end_date.asc()).all()
    result = []
    for c in contracts:
        emp = db.query(Employee).filter(Employee.id == c.employee_id).first()
        result.append(_contract_to_dict(c, emp))
    return result


@router.get("/{contract_id}")
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single contract."""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    emp = db.query(Employee).filter(Employee.id == contract.employee_id).first()
    return _contract_to_dict(contract, emp)


@router.post("/", status_code=201)
def create_contract(
    data: ContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new employment contract record."""
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Validate plazo fijo has end date
    ct = str(data.contract_type.value if hasattr(data.contract_type, 'value') else data.contract_type)
    if ct == "plazo_fijo" and not data.end_date:
        raise HTTPException(status_code=400, detail="Contrato a plazo fijo requiere fecha de término")

    # Deactivate previous active contracts if creating new
    db.query(Contract).filter(
        Contract.employee_id == data.employee_id,
        Contract.is_active == True,
    ).update({"is_active": False})

    contract = Contract(
        employee_id=data.employee_id,
        contract_type=data.contract_type,
        start_date=data.start_date,
        end_date=data.end_date,
        base_salary=data.base_salary,
        weekly_hours=data.weekly_hours,
        work_schedule=data.work_schedule,
        gratificacion_type=data.gratificacion_type,
        is_active=True,
        work_location=data.work_location,
        schedule_details=data.schedule_details,
        services_description=data.services_description,
        additional_clauses=data.additional_clauses,
        obra_description=data.obra_description,
        has_confidentiality=data.has_confidentiality,
        notes=data.notes,
        signed_at=data.signed_at,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return _contract_to_dict(contract, emp)


@router.put("/{contract_id}")
def update_contract(
    contract_id: int,
    data: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update an existing contract."""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)
    db.commit()
    db.refresh(contract)
    emp = db.query(Employee).filter(Employee.id == contract.employee_id).first()
    return _contract_to_dict(contract, emp)


@router.delete("/{contract_id}")
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Deactivate (soft-delete) a contract."""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    contract.is_active = False
    db.commit()
    return {"message": "Contrato desactivado"}


@router.get("/{contract_id}/pdf")
def download_contract_pdf(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate and download a full legal PDF contract (Art. 10 CT)."""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    emp = db.query(Employee).filter(Employee.id == contract.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    company = db.query(Company).first()
    filepath = generate_contract_pdf(contract, emp, company)
    return FileResponse(filepath, media_type="application/pdf", filename=f"contrato_{emp.rut}_{contract.id}.pdf")
