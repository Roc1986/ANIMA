from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class DocumentType(str, enum.Enum):
    liquidacion = "liquidacion"
    contrato = "contrato"
    finiquito = "finiquito"
    certificado_afp = "certificado_afp"
    certificado_renta = "certificado_renta"
    libro_remuneraciones = "libro_remuneraciones"
    previred = "previred"
    dj1887 = "dj1887"
    otro = "otro"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    document_type = Column(Enum(DocumentType), nullable=False)
    title = Column(String(255), nullable=False)
    file_path = Column(String(512))
    period_year = Column(Integer)
    period_month = Column(Integer)
    generated_by = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", back_populates="documents")
