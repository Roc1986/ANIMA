from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.accounting import AccountingAccount, JournalEntry, JournalEntryLine, get_default_accounts, EntryType
from models.payroll import PayrollRun, PayrollEntry, PayrollStatus
from schemas.accounting import AccountingAccountOut, AccountingAccountUpdate, JournalEntryOut
from auth.jwt_handler import get_current_user, require_admin
from models.user import User

router = APIRouter()


def _get_company_id(current_user: User) -> int:
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Usuario no tiene empresa asignada")
    return current_user.company_id


def _seed_accounts(db: Session, company_id: int):
    defaults = get_default_accounts()
    for acc in defaults:
        obj = AccountingAccount(
            company_id=company_id,
            code=acc["code"],
            name=acc["name"],
            account_type=acc["account_type"],
        )
        db.add(obj)
    db.commit()


def _get_account_by_code(db: Session, company_id: int, code: str) -> AccountingAccount:
    acc = db.query(AccountingAccount).filter(
        AccountingAccount.company_id == company_id,
        AccountingAccount.code == code,
        AccountingAccount.is_active == True,
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail=f"Cuenta {code} no encontrada")
    return acc


@router.get("/accounts", response_model=List[AccountingAccountOut])
def list_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    accounts = db.query(AccountingAccount).filter(
        AccountingAccount.company_id == company_id,
        AccountingAccount.is_active == True,
    ).order_by(AccountingAccount.code).all()

    if not accounts:
        _seed_accounts(db, company_id)
        accounts = db.query(AccountingAccount).filter(
            AccountingAccount.company_id == company_id,
            AccountingAccount.is_active == True,
        ).order_by(AccountingAccount.code).all()

    return accounts


@router.put("/accounts/{account_id}", response_model=AccountingAccountOut)
def update_account(
    account_id: int,
    data: AccountingAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    account = db.query(AccountingAccount).filter(
        AccountingAccount.id == account_id,
        AccountingAccount.company_id == company_id,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    account.code = data.code
    account.name = data.name
    db.commit()
    db.refresh(account)
    return account


@router.post("/journal/provision/{run_id}", response_model=JournalEntryOut)
def generate_provision(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    company_id = _get_company_id(current_user)

    run = db.query(PayrollRun).filter(
        PayrollRun.id == run_id,
        PayrollRun.company_id == company_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")
    if run.status != PayrollStatus.approved:
        raise HTTPException(status_code=400, detail="La nómina debe estar aprobada para generar asientos")

    entries = db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id == run_id).all()
    if not entries:
        raise HTTPException(status_code=400, detail="La nómina no tiene entradas")

    total_bruto = sum(float(e.remuneracion_imponible or 0) for e in entries)
    total_afp = sum(float(e.descuento_afp or 0) for e in entries)
    total_salud = sum(float(e.descuento_salud or 0) for e in entries)
    total_iusc = sum(float(e.impuesto_unico or 0) for e in entries)
    total_cesantia_trabajador = sum(float(e.descuento_cesantia or 0) for e in entries)
    total_cesantia_empleador = sum(float(e.aporte_cesantia_empleador or 0) for e in entries)
    total_sis = sum(float(e.aporte_sis or 0) for e in entries)
    costo_empleador = total_cesantia_empleador + total_sis
    liquido = sum(float(e.liquido_pagar or 0) for e in entries)

    # Ensure accounts exist
    accounts = db.query(AccountingAccount).filter(
        AccountingAccount.company_id == company_id,
        AccountingAccount.is_active == True,
    ).count()
    if accounts == 0:
        _seed_accounts(db, company_id)

    journal = JournalEntry(
        company_id=company_id,
        payroll_run_id=run_id,
        entry_type=EntryType.provision,
        period_year=run.period_year,
        period_month=run.period_month,
        description=f"Provisión de remuneraciones {run.period_month:02d}/{run.period_year}",
        created_by=current_user.id,
    )
    db.add(journal)
    db.flush()

    lines_data = [
        (_get_account_by_code(db, company_id, "5-01-001"), "Gasto Remuneraciones", total_bruto, 0),
        (_get_account_by_code(db, company_id, "5-01-002"), "Gasto Previsión Empleador", costo_empleador, 0),
        (_get_account_by_code(db, company_id, "2-01-001"), "Remuneraciones por Pagar", 0, liquido),
        (_get_account_by_code(db, company_id, "2-01-002"), "AFP por Pagar", 0, total_afp),
        (_get_account_by_code(db, company_id, "2-01-003"), "Salud por Pagar", 0, total_salud),
        (_get_account_by_code(db, company_id, "2-01-004"), "Impuesto Único por Pagar", 0, total_iusc),
        (_get_account_by_code(db, company_id, "2-01-005"), "Cesantía Trabajador por Pagar", 0, total_cesantia_trabajador),
        (_get_account_by_code(db, company_id, "2-01-006"), "Cesantía Empleador por Pagar", 0, total_cesantia_empleador),
        (_get_account_by_code(db, company_id, "2-01-007"), "SIS por Pagar", 0, total_sis),
    ]

    for account, glosa, debe, haber in lines_data:
        line = JournalEntryLine(
            journal_entry_id=journal.id,
            account_id=account.id,
            glosa=glosa,
            debe=debe,
            haber=haber,
        )
        db.add(line)

    db.commit()
    db.refresh(journal)
    return journal


@router.post("/journal/pago-cotizaciones/{run_id}", response_model=JournalEntryOut)
def generate_pago_cotizaciones(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    company_id = _get_company_id(current_user)

    run = db.query(PayrollRun).filter(
        PayrollRun.id == run_id,
        PayrollRun.company_id == company_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")
    if run.status != PayrollStatus.approved:
        raise HTTPException(status_code=400, detail="La nómina debe estar aprobada para generar asientos")

    entries = db.query(PayrollEntry).filter(PayrollEntry.payroll_run_id == run_id).all()
    if not entries:
        raise HTTPException(status_code=400, detail="La nómina no tiene entradas")

    total_afp = sum(float(e.descuento_afp or 0) for e in entries)
    total_salud = sum(float(e.descuento_salud or 0) for e in entries)
    total_cesantia_trabajador = sum(float(e.descuento_cesantia or 0) for e in entries)
    total_cesantia_empleador = sum(float(e.aporte_cesantia_empleador or 0) for e in entries)
    total_sis = sum(float(e.aporte_sis or 0) for e in entries)
    total_banco = total_afp + total_salud + total_cesantia_trabajador + total_cesantia_empleador + total_sis

    accounts = db.query(AccountingAccount).filter(
        AccountingAccount.company_id == company_id,
        AccountingAccount.is_active == True,
    ).count()
    if accounts == 0:
        _seed_accounts(db, company_id)

    journal = JournalEntry(
        company_id=company_id,
        payroll_run_id=run_id,
        entry_type=EntryType.pago_cotizaciones,
        period_year=run.period_year,
        period_month=run.period_month,
        description=f"Pago cotizaciones previsionales {run.period_month:02d}/{run.period_year}",
        created_by=current_user.id,
    )
    db.add(journal)
    db.flush()

    lines_data = [
        (_get_account_by_code(db, company_id, "2-01-002"), "AFP por Pagar", total_afp, 0),
        (_get_account_by_code(db, company_id, "2-01-003"), "Salud por Pagar", total_salud, 0),
        (_get_account_by_code(db, company_id, "2-01-005"), "Cesantía Trabajador por Pagar", total_cesantia_trabajador, 0),
        (_get_account_by_code(db, company_id, "2-01-006"), "Cesantía Empleador por Pagar", total_cesantia_empleador, 0),
        (_get_account_by_code(db, company_id, "2-01-007"), "SIS por Pagar", total_sis, 0),
        (_get_account_by_code(db, company_id, "1-01-001"), "Banco / Cuenta Corriente", 0, total_banco),
    ]

    for account, glosa, debe, haber in lines_data:
        line = JournalEntryLine(
            journal_entry_id=journal.id,
            account_id=account.id,
            glosa=glosa,
            debe=debe,
            haber=haber,
        )
        db.add(line)

    db.commit()
    db.refresh(journal)
    return journal


@router.get("/journal", response_model=List[JournalEntryOut])
def list_journal_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    entries = db.query(JournalEntry).filter(
        JournalEntry.company_id == company_id,
    ).order_by(JournalEntry.created_at.desc()).all()
    return entries


@router.get("/journal/{entry_id}", response_model=JournalEntryOut)
def get_journal_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = _get_company_id(current_user)
    entry = db.query(JournalEntry).filter(
        JournalEntry.id == entry_id,
        JournalEntry.company_id == company_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Asiento no encontrado")
    return entry
