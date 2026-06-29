from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class AccountingAccountCreate(BaseModel):
    code: str
    name: str
    account_type: str


class AccountingAccountUpdate(BaseModel):
    code: str
    name: str


class AccountingAccountOut(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    account_type: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class JournalEntryLineOut(BaseModel):
    id: int
    journal_entry_id: int
    account_id: int
    glosa: Optional[str]
    debe: Decimal
    haber: Decimal
    account: Optional[AccountingAccountOut]

    class Config:
        from_attributes = True


class ManualJournalLineIn(BaseModel):
    account_id: int
    glosa: Optional[str] = None
    debe: float = 0
    haber: float = 0


class ManualJournalEntryIn(BaseModel):
    entry_type: str  # "apertura" or "movimientos_historicos"
    period_year: int
    period_month: int
    description: Optional[str] = None
    lines: List[ManualJournalLineIn]


class JournalEntryOut(BaseModel):
    id: int
    company_id: int
    payroll_run_id: Optional[int]
    entry_type: str
    period_year: int
    period_month: int
    description: Optional[str]
    created_at: datetime
    created_by: Optional[int]
    lines: List[JournalEntryLineOut] = []

    class Config:
        from_attributes = True
