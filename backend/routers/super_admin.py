"""
Super Admin router — only accessible by users with role=super_admin.
Provides global company management and platform overview.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from database import get_db
from models.company import Company
from models.employee import Employee
from models.payroll import PayrollRun
from models.user import User, UserRole
from models.legal_params import LegalParameter
from auth.jwt_handler import get_current_user, get_password_hash, require_super_admin

router = APIRouter()


# ─── Schemas ───────────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    rut: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    plan: str = "basic"
    max_employees: int = 50
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None


class CompanyUpdateAdmin(BaseModel):
    name: Optional[str] = None
    rut: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    plan: Optional[str] = None
    max_employees: Optional[int] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    is_active: Optional[bool] = None


class CompanyAdminCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class GlobalParamUpdate(BaseModel):
    value: float
    description: Optional[str] = None
    source: Optional[str] = None


class CompanyOut(BaseModel):
    id: int
    name: str
    rut: Optional[str]
    address: Optional[str]
    city: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    plan: str
    max_employees: int
    is_active: bool
    owner_name: Optional[str]
    owner_phone: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class CompanyWithStats(CompanyOut):
    employee_count: int
    last_payroll_date: Optional[str]


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _company_stats(db: Session, company_id: int) -> dict:
    emp_count = db.query(func.count(Employee.id)).filter(
        Employee.company_id == company_id,
        Employee.is_active == True,
    ).scalar() or 0

    last_run = db.query(PayrollRun).filter(
        PayrollRun.company_id == company_id,
    ).order_by(PayrollRun.period_year.desc(), PayrollRun.period_month.desc()).first()

    last_payroll_date = None
    if last_run:
        last_payroll_date = f"{last_run.period_year}-{last_run.period_month:02d}"

    return {"employee_count": emp_count, "last_payroll_date": last_payroll_date}


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def super_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Global overview for super_admin."""
    total_companies = db.query(func.count(Company.id)).scalar() or 0
    active_companies = db.query(func.count(Company.id)).filter(Company.is_active == True).scalar() or 0
    total_employees = db.query(func.count(Employee.id)).filter(Employee.is_active == True).scalar() or 0

    plan_counts = {}
    for plan in ("basic", "pro", "enterprise"):
        plan_counts[plan] = db.query(func.count(Company.id)).filter(
            Company.plan == plan, Company.is_active == True
        ).scalar() or 0

    # Simple revenue estimate
    revenue_estimate = (
        plan_counts.get("basic", 0) * 29990 +
        plan_counts.get("pro", 0) * 59990 +
        plan_counts.get("enterprise", 0) * 149990
    )

    return {
        "total_companies": total_companies,
        "active_companies": active_companies,
        "inactive_companies": total_companies - active_companies,
        "total_employees": total_employees,
        "plan_counts": plan_counts,
        "revenue_estimate_clp": revenue_estimate,
    }


@router.get("/companies", response_model=List[CompanyWithStats])
def list_companies(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    result = []
    for c in companies:
        stats = _company_stats(db, c.id)
        result.append(CompanyWithStats(
            **CompanyOut.model_validate(c).model_dump(),
            **stats,
        ))
    return result


@router.post("/companies", response_model=CompanyOut, status_code=201)
def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    company = Company(**data.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.put("/companies/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: int,
    data: CompanyUpdateAdmin,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return company


@router.delete("/companies/{company_id}")
def deactivate_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    company.is_active = False
    db.commit()
    return {"message": "Empresa desactivada"}


@router.post("/companies/{company_id}/admin")
def create_company_admin(
    company_id: int,
    data: CompanyAdminCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        role=UserRole.company_admin,
        company_id=company_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "message": "Administrador de empresa creado",
        "user_id": user.id,
        "email": user.email,
        "company": company.name,
    }


@router.get("/companies/{company_id}/stats")
def company_stats(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    total_emp = db.query(func.count(Employee.id)).filter(Employee.company_id == company_id).scalar() or 0
    active_emp = db.query(func.count(Employee.id)).filter(
        Employee.company_id == company_id, Employee.is_active == True
    ).scalar() or 0
    total_payrolls = db.query(func.count(PayrollRun.id)).filter(PayrollRun.company_id == company_id).scalar() or 0
    total_users = db.query(func.count(User.id)).filter(User.company_id == company_id).scalar() or 0

    last_run = db.query(PayrollRun).filter(
        PayrollRun.company_id == company_id,
    ).order_by(PayrollRun.period_year.desc(), PayrollRun.period_month.desc()).first()

    return {
        "company_id": company_id,
        "company_name": company.name,
        "plan": company.plan,
        "is_active": company.is_active,
        "total_employees": total_emp,
        "active_employees": active_emp,
        "max_employees": company.max_employees,
        "total_payroll_runs": total_payrolls,
        "total_users": total_users,
        "last_payroll": f"{last_run.period_year}-{last_run.period_month:02d}" if last_run else None,
        "created_at": company.created_at,
    }


# ─── Global Legal Parameters ────────────────────────────────────────────────────

@router.delete("/companies/{company_id}/payroll-data")
def delete_company_payroll_data(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Delete all payroll runs and entries for a company (test data cleanup)."""
    from models.payroll import PayrollRun, PayrollEntry
    from models.accounting import JournalEntry, JournalEntryLine
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    runs = db.query(PayrollRun).filter(PayrollRun.company_id == company_id).all()
    run_ids = [r.id for r in runs]
    if run_ids:
        # Delete accounting journal lines and entries linked to these runs
        journal_ids = [j.id for j in db.query(JournalEntry).filter(JournalEntry.payroll_run_id.in_(run_ids)).all()]
        if journal_ids:
            db.query(JournalEntryLine).filter(JournalEntryLine.journal_entry_id.in_(journal_ids)).delete(synchronize_session=False)
            db.query(JournalEntry).filter(JournalEntry.id.in_(journal_ids)).delete(synchronize_session=False)
        db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id.in_(run_ids)).delete(synchronize_session=False)
        db.query(PayrollRun).filter(PayrollRun.company_id == company_id).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Eliminadas {len(run_ids)} nóminas de {company.name}", "runs_deleted": len(run_ids)}


@router.get("/global-params")
def list_global_params(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """List all global legal parameters (company_id=NULL)."""
    params = db.query(LegalParameter).filter(
        LegalParameter.company_id == None,
        LegalParameter.is_active == True,
    ).order_by(LegalParameter.key).all()
    return params


@router.put("/global-params/{key}")
def update_global_param(
    key: str,
    data: GlobalParamUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Update a global legal parameter."""
    param = db.query(LegalParameter).filter(
        LegalParameter.key == key,
        LegalParameter.company_id == None,
        LegalParameter.is_active == True,
    ).first()
    if not param:
        raise HTTPException(status_code=404, detail="Parámetro no encontrado")
    param.value = data.value
    if data.description:
        param.description = data.description
    if data.source:
        param.source = data.source
    from datetime import date
    param.effective_date = date.today()
    db.commit()
    db.refresh(param)
    return param
