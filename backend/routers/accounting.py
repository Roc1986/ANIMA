from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.accounting import AccountingAccount, JournalEntry, JournalEntryLine, get_default_accounts, EntryType
from models.payroll import PayrollRun, PayrollEntry, PayrollStatus
from schemas.accounting import AccountingAccountOut, AccountingAccountUpdate, JournalEntryOut, ManualJournalEntryIn
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

    total_bruto = sum(float(e.total_haberes or 0) for e in entries)
    total_afp = sum(float(e.descuento_afp or 0) for e in entries)
    total_salud = sum(float(e.descuento_salud or 0) for e in entries)
    total_iusc = sum(float(e.impuesto_unico or 0) for e in entries)
    total_cesantia_trabajador = sum(float(e.descuento_cesantia or 0) for e in entries)
    total_cesantia_empleador = sum(float(e.aporte_cesantia_empleador or 0) for e in entries)
    total_sis = sum(float(e.aporte_sis or 0) for e in entries)
    total_mutual_isl = sum(float(e.aporte_mutual_isl or 0) for e in entries)
    total_seguro_social = sum(float(e.aporte_seguro_social or 0) for e in entries)
    total_reforma_afp = sum(float(e.aporte_empleador_afp_reforma or 0) for e in entries)
    total_otros_desc = sum(float((e.descuento_otros or 0) + (e.adelanto or 0) + (e.pension_alimenticia or 0) + (e.descuento_voluntario or 0) + (e.descuento_vivienda or 0) + (e.descuento_ccaf or 0)) for e in entries)
    costo_empleador = total_cesantia_empleador + total_sis + total_mutual_isl + total_seguro_social + total_reforma_afp
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
        (_get_account_by_code(db, company_id, "2-01-008"), "Mutual ISL por Pagar", 0, total_mutual_isl),
        (_get_account_by_code(db, company_id, "2-01-009"), "Seguro Social Ley 21.735 por Pagar", 0, total_seguro_social),
        (_get_account_by_code(db, company_id, "2-01-010"), "Reforma AFP Empleador por Pagar", 0, total_reforma_afp),
    ]

    if total_otros_desc > 0:
        lines_data.append(
            (_get_account_by_code(db, company_id, "2-01-011"), "Otros Descuentos por Pagar", 0, total_otros_desc)
        )

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


@router.post("/journal/manual", response_model=JournalEntryOut, status_code=201)
def create_manual_journal_entry(
    data: ManualJournalEntryIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a manual journal entry (apertura or movimientos_historicos)."""
    company_id = _get_company_id(current_user)

    allowed = {EntryType.apertura.value, EntryType.movimientos_historicos.value}
    if data.entry_type not in allowed:
        raise HTTPException(status_code=400, detail="Tipo de asiento inválido. Use 'apertura' o 'movimientos_historicos'")

    if not data.lines:
        raise HTTPException(status_code=400, detail="El asiento debe tener al menos una línea")

    total_debe = sum(l.debe for l in data.lines)
    total_haber = sum(l.haber for l in data.lines)
    if abs(total_debe - total_haber) > 1:
        raise HTTPException(
            status_code=400,
            detail=f"El asiento no cuadra: Debe ${total_debe:,.0f} ≠ Haber ${total_haber:,.0f}"
        )

    accounts_count = db.query(AccountingAccount).filter(
        AccountingAccount.company_id == company_id,
        AccountingAccount.is_active == True,
    ).count()
    if accounts_count == 0:
        _seed_accounts(db, company_id)

    journal = JournalEntry(
        company_id=company_id,
        payroll_run_id=None,
        entry_type=data.entry_type,
        period_year=data.period_year,
        period_month=data.period_month,
        description=data.description or f"Asiento {data.entry_type} {data.period_month:02d}/{data.period_year}",
        created_by=current_user.id,
    )
    db.add(journal)
    db.flush()

    for line in data.lines:
        account = db.query(AccountingAccount).filter(
            AccountingAccount.id == line.account_id,
            AccountingAccount.company_id == company_id,
        ).first()
        if not account:
            raise HTTPException(status_code=404, detail=f"Cuenta ID {line.account_id} no encontrada")
        db.add(JournalEntryLine(
            journal_entry_id=journal.id,
            account_id=line.account_id,
            glosa=line.glosa,
            debe=line.debe,
            haber=line.haber,
        ))

    db.commit()
    db.refresh(journal)
    return journal


@router.delete("/journal/{entry_id}", status_code=204)
def delete_journal_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a manual journal entry (only apertura and movimientos_historicos)."""
    company_id = _get_company_id(current_user)
    entry = db.query(JournalEntry).filter(
        JournalEntry.id == entry_id,
        JournalEntry.company_id == company_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Asiento no encontrado")
    if entry.entry_type not in (EntryType.apertura.value, EntryType.movimientos_historicos.value):
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar asientos manuales")
    db.query(JournalEntryLine).filter(JournalEntryLine.journal_entry_id == entry_id).delete()
    db.delete(entry)
    db.commit()
