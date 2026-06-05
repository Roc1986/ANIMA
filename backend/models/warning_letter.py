from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class WarningType(str, enum.Enum):
    verbal = "verbal"
    escrita = "escrita"
    grave = "grave"


class WarningLetter(Base):
    __tablename__ = "warning_letters"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(Enum(WarningType), nullable=False)
    reason = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    signature_required = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee")
    creator = relationship("User", foreign_keys=[created_by])
