from sqlalchemy import Column, Integer, Date, Numeric, String, DateTime
from sqlalchemy.sql import func
from database import Base

class UFValue(Base):
    __tablename__ = "uf_values"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    value = Column(Numeric(12, 2), nullable=False)
    source = Column(String(100), default="manual")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
