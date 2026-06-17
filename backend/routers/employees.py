from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pydantic import BaseModel

from database import get_db
from models.employee import Employee
from models.contract import Contract
from schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeeListOut
from auth.jwt_handler import get_current_user, require_admin
from models.user import User
from dependencies import filter_by_company

router = APIRouter()


@router.get("/", response_model=List[EmployeeListOut])
def list_employees(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Employee)
    q = filter_by_company(q, Employee, current_user)
    if is_active is not None:
        q = q.filter(Employee.is_active == is_active)
    if department:
        q = q.filter(Employee.department.ilike(f"%{department}%"))
    if search:
        q = q.filter(
            (Employee.first_name.ilike(f"%{search}%")) |
            (Employee.last_name.ilike(f"%{search}%")) |
            (Employee.rut.ilike(f"%{search}%")) |
            (Employee.email.ilike(f"%{search}%"))
        )
    return q.offset(skip).limit(limit).all()


@router.post("/", response_model=EmployeeOut, status_code=201)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if not current_user.company_id and current_user.role != "super_admin":
        raise HTTPException(status_code=400, detail="Usuario sin empresa asignada")
    company_id = data.company_id if hasattr(data, 'company_id') and data.company_id else current_user.company_id
    if not company_id:
        raise HTTPException(status_code=400, detail="Se requiere company_id")

    existing = db.query(Employee).filter(
        Employee.rut == data.rut,
        Employee.company_id == company_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="RUT ya registrado en esta empresa")

    emp_data = data.model_dump()
    emp_data['company_id'] = company_id
    contract_type = emp_data.pop('contract_type', 'indefinido') or 'indefinido'
    gratificacion_type = emp_data.pop('gratificacion_type', 'legal') or 'legal'
    emp = Employee(**emp_data)
    db.add(emp)
    db.commit()
    db.refresh(emp)
    # Auto-create contract
    contract = Contract(
        employee_id=emp.id,
        contract_type=contract_type,
        start_date=data.hire_date,
        base_salary=data.base_salary,
        weekly_hours=40,
        gratificacion_type=gratificacion_type,
        is_active=True,
    )
    db.add(contract)
    db.commit()
    return emp


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Employee).filter(Employee.id == employee_id)
    q = filter_by_company(q, Employee, current_user)
    emp = q.first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return emp


@router.put("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(Employee).filter(Employee.id == employee_id)
    q = filter_by_company(q, Employee, current_user)
    emp = q.first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(emp, field, value)
    db.commit()
    db.refresh(emp)
    return emp


class TerminateRequest(BaseModel):
    termination_date: date
    termination_reason: str


@router.post("/{employee_id}/terminate")
def terminate_employee(
    employee_id: int,
    data: TerminateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(Employee).filter(Employee.id == employee_id)
    q = filter_by_company(q, Employee, current_user)
    emp = q.first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    emp.is_active = False
    emp.termination_date = data.termination_date
    emp.termination_reason = data.termination_reason
    db.commit()
    return {"message": "Empleado dado de baja"}


@router.delete("/{employee_id}")
def deactivate_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(Employee).filter(Employee.id == employee_id)
    q = filter_by_company(q, Employee, current_user)
    emp = q.first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    emp.is_active = False
    db.commit()
    return {"message": "Empleado desactivado"}


@router.get("/{employee_id}/contracts")
def get_employee_contracts(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify employee belongs to company
    q = db.query(Employee).filter(Employee.id == employee_id)
    q = filter_by_company(q, Employee, current_user)
    emp = q.first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    contracts = db.query(Contract).filter(Contract.employee_id == employee_id).all()
    return contracts
