from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base


class Company(Base):
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, default="Mi Empresa")
    rut = Column(String(20))
    address = Column(String(255))
    city = Column(String(100))
    phone = Column(String(30))
    email = Column(String(150))
    logo_path = Column(String(512))
    primary_color = Column(String(10), default="#1e3a5f")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
