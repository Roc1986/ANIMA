from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, Enum, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class VacationStatus(str, enum.Enum):
    active = "active"
    closed = "closed"


class VacationRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class VacationBalance(Base):
    __tablename__ = "vacation_balances"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, unique=True)
    year = Column(Integer, nullable=False)
    days_earned = Column(Float, default=0.0)
    days_taken = Column(Float, default=0.0)
    status = Column(Enum(VacationStatus), default=VacationStatus.active)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    employee = relationship("Employee", back_populates="vacation_balance")
    requests = relationship("VacationRequest", back_populates="balance", cascade="all, delete-orphan")

    @property
    def days_pending(self):
        return max(0.0, self.days_earned - self.days_taken)


class VacationRequest(Base):
    __tablename__ = "vacation_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    balance_id = Column(Integer, ForeignKey("vacation_balances.id"), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    days_requested = Column(Float, nullable=False)
    reason = Column(Text)
    status = Column(Enum(VacationRequestStatus), default=VacationRequestStatus.pending)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", back_populates="vacation_requests")
    balance = relationship("VacationBalance", back_populates="requests")
    approver = relationship("User", foreign_keys=[approved_by])
