from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, Enum, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class ContractType(str, enum.Enum):
    indefinido = "indefinido"
    plazo_fijo = "plazo_fijo"
    obra_faena = "obra_faena"
    part_time = "part_time"


class WorkSchedule(str, enum.Enum):
    full_time_40 = "40hrs"
    part_time_30 = "30hrs"
    part_time_20 = "20hrs"
    custom = "custom"


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    contract_type = Column(Enum(ContractType), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    work_schedule = Column(Enum(WorkSchedule), default=WorkSchedule.full_time_40)
    weekly_hours = Column(Integer, default=40)
    base_salary = Column(Numeric(12, 2), nullable=False)
    gratificacion_type = Column(String(20), default="legal")  # legal | garantizada
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    signed_at = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", back_populates="contracts")
