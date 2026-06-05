from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, default="Mi Empresa")
    rut = Column(String(20))
    address = Column(String(255))
    city = Column(String(100))
    phone = Column(String(30))
    email = Column(String(150))
    logo_path = Column(String(512))
    primary_color = Column(String(10), default="#1e3a5f")
    is_active = Column(Boolean, default=True)
    plan = Column(String(50), default="basic")          # basic / pro / enterprise
    max_employees = Column(Integer, default=50)
    owner_name = Column(String(150))
    owner_phone = Column(String(30))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    users = relationship("User", back_populates="company", foreign_keys="User.company_id")
    employees = relationship("Employee", back_populates="company")
    payroll_runs = relationship("PayrollRun", back_populates="company")
