from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models.employee import Employee
from models.contract import Contract
from schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeeListOut
from auth.jwt_handler import get_current_user, require_admin
from models.user import User

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
    existing = db.query(Employee).filter(Employee.rut == data.rut).first()
    if existing:
        raise HTTPException(status_code=400, detail="RUT ya registrado")
    emp = Employee(**data.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    # Auto-create contract
    contract = Contract(
        employee_id=emp.id,
        contract_type="indefinido",
        start_date=data.hire_date,
        base_salary=data.base_salary,
        weekly_hours=40,
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
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
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
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(emp, field, value)
    db.commit()
    db.refresh(emp)
    return emp


@router.delete("/{employee_id}")
def deactivate_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
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
    contracts = db.query(Contract).filter(Contract.employee_id == employee_id).all()
    return contracts
