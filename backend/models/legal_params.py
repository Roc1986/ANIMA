from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Text, Boolean, Date
from sqlalchemy.sql import func
from database import Base


class LegalParameter(Base):
    """
    Stores all Chilean legal thresholds and rates.
    company_id=NULL means global default; company-specific rows override the global.
    """
    __tablename__ = "legal_parameters"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    key = Column(String(100), nullable=False, index=True)
    value = Column(Numeric(18, 6), nullable=False)
    description = Column(String(255))
    unit = Column(String(50))  # CLP, UF, UTM, %, etc.
    effective_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    is_active = Column(Boolean, default=True)
    source = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LegalParamAudit(Base):
    """Audit log for all changes to legal parameters."""
    __tablename__ = "legal_param_audits"

    id = Column(Integer, primary_key=True, index=True)
    parameter_key = Column(String(100), nullable=False)
    old_value = Column(Numeric(18, 6))
    new_value = Column(Numeric(18, 6))
    changed_by = Column(Integer, ForeignKey("users.id"))
    change_reason = Column(Text)
    ai_proposed = Column(Boolean, default=False)
    ai_analysis = Column(Text)
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
