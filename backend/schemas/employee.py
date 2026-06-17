from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from models.employee import Gender, MaritalStatus, AFP, HealthSystem


class EmployeeCreate(BaseModel):
    company_id: Optional[int] = None  # set by router from current_user if not provided
    rut: str
    first_name: str
    last_name: str
    second_last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    nationality: str = "Chilena"
    afp: AFP
    health_system: HealthSystem
    isapre_name: Optional[str] = None
    isapre_monthly_amount: Decimal = Decimal("0")
    hire_date: date
    position: str
    department: Optional[str] = None
    cost_center: Optional[str] = None
    base_salary: Decimal
    bank_name: Optional[str] = None
    bank_account_type: Optional[str] = None
    bank_account_number: Optional[str] = None
    contract_type: Optional[str] = "indefinido"
    gratificacion_type: Optional[str] = "legal"


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    second_last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    birth_date: Optional[date] = None
    hire_date: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    afp: Optional[AFP] = None
    health_system: Optional[HealthSystem] = None
    isapre_name: Optional[str] = None
    isapre_monthly_amount: Optional[Decimal] = None
    position: Optional[str] = None
    department: Optional[str] = None
    cost_center: Optional[str] = None
    base_salary: Optional[Decimal] = None
    bank_name: Optional[str] = None
    bank_account_type: Optional[str] = None
    bank_account_number: Optional[str] = None
    is_active: Optional[bool] = None
    termination_date: Optional[date] = None
    termination_reason: Optional[str] = None


class EmployeeOut(BaseModel):
    id: int
    rut: str
    first_name: str
    last_name: str
    second_last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    city: Optional[str]
    region: Optional[str]
    birth_date: Optional[date]
    gender: Optional[Gender]
    marital_status: Optional[MaritalStatus]
    nationality: str
    afp: AFP
    health_system: HealthSystem
    isapre_name: Optional[str]
    isapre_monthly_amount: Decimal
    hire_date: date
    position: str
    department: Optional[str]
    cost_center: Optional[str]
    base_salary: Decimal
    bank_name: Optional[str]
    bank_account_type: Optional[str]
    bank_account_number: Optional[str]
    is_active: bool
    termination_date: Optional[date]
    termination_reason: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class EmployeeListOut(BaseModel):
    id: int
    rut: str
    first_name: str
    last_name: str
    second_last_name: Optional[str]
    position: str
    department: Optional[str]
    base_salary: Decimal
    afp: AFP
    health_system: HealthSystem
    hire_date: date
    is_active: bool

    class Config:
        from_attributes = True
