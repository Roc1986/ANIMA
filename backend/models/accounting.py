from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class AccountType(str, enum.Enum):
    activo = "activo"
    pasivo = "pasivo"
    patrimonio = "patrimonio"
    ingreso = "ingreso"
    gasto = "gasto"


class EntryType(str, enum.Enum):
    provision = "provision"
    pago_cotizaciones = "pago_cotizaciones"
    apertura = "apertura"
    movimientos_historicos = "movimientos_historicos"


class AccountingAccount(Base):
    __tablename__ = "accounting_accounts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    code = Column(String(20), nullable=False)
    name = Column(String(200), nullable=False)
    account_type = Column(Enum(AccountType), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company")
    lines = relationship("JournalEntryLine", back_populates="account")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=True)
    entry_type = Column(String(50), nullable=False)
    period_year = Column(Integer, nullable=False)
    period_month = Column(Integer, nullable=False)
    description = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))

    company = relationship("Company")
    payroll_run = relationship("PayrollRun")
    created_by_user = relationship("User", foreign_keys=[created_by])
    lines = relationship("JournalEntryLine", back_populates="journal_entry", cascade="all, delete-orphan")


class JournalEntryLine(Base):
    __tablename__ = "journal_entry_lines"

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounting_accounts.id"), nullable=False)
    glosa = Column(String(200))
    debe = Column(Numeric(14, 2), default=0)
    haber = Column(Numeric(14, 2), default=0)

    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("AccountingAccount", back_populates="lines")


def get_default_accounts():
    return [
        {"code": "1-01-001", "name": "Banco / Cuenta Corriente", "account_type": "activo"},
        {"code": "2-01-001", "name": "Remuneraciones por Pagar", "account_type": "pasivo"},
        {"code": "2-01-002", "name": "AFP por Pagar", "account_type": "pasivo"},
        {"code": "2-01-003", "name": "Salud por Pagar", "account_type": "pasivo"},
        {"code": "2-01-004", "name": "Impuesto Único por Pagar", "account_type": "pasivo"},
        {"code": "2-01-005", "name": "Cesantía Trabajador por Pagar", "account_type": "pasivo"},
        {"code": "2-01-006", "name": "Cesantía Empleador por Pagar", "account_type": "pasivo"},
        {"code": "2-01-007", "name": "SIS por Pagar", "account_type": "pasivo"},
        {"code": "5-01-001", "name": "Gasto Remuneraciones", "account_type": "gasto"},
        {"code": "5-01-002", "name": "Gasto Previsión Empleador", "account_type": "gasto"},
        {"code": "3-01-001", "name": "Saldos Iniciales / Apertura", "account_type": "patrimonio"},
    ]
