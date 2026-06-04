from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, Numeric, ForeignKey, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class PayrollStatus(str, enum.Enum):
    draft = "draft"
    calculated = "calculated"
    approved = "approved"
    paid = "paid"
    cancelled = "cancelled"


class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id = Column(Integer, primary_key=True, index=True)
    period_year = Column(Integer, nullable=False)
    period_month = Column(Integer, nullable=False)
    status = Column(Enum(PayrollStatus), default=PayrollStatus.draft)
    uf_value = Column(Numeric(10, 4), nullable=False)
    utm_value = Column(Numeric(10, 2), nullable=False)
    imm_value = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(Date)
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    entries = relationship("PayrollEntry", back_populates="payroll_run", cascade="all, delete-orphan")


class PayrollEntry(Base):
    __tablename__ = "payroll_entries"

    id = Column(Integer, primary_key=True, index=True)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    # Haberes
    base_salary = Column(Numeric(12, 2), default=0)           # Sueldo base
    overtime_weekday = Column(Numeric(12, 2), default=0)       # HH.EE días hábiles
    overtime_sunday = Column(Numeric(12, 2), default=0)        # HH.EE domingos/festivos
    gratificacion = Column(Numeric(12, 2), default=0)          # Gratificación legal
    bono_colacion = Column(Numeric(12, 2), default=0)          # Colación (no imponible)
    bono_movilizacion = Column(Numeric(12, 2), default=0)      # Movilización (no imponible)
    bono_otros = Column(Numeric(12, 2), default=0)             # Otros bonos imponibles
    asignacion_familiar = Column(Numeric(12, 2), default=0)    # Asignación familiar
    total_haberes = Column(Numeric(12, 2), default=0)          # Total haberes

    # Imponible / No imponible
    remuneracion_imponible = Column(Numeric(12, 2), default=0) # Base cálculo descuentos
    remuneracion_tributable = Column(Numeric(12, 2), default=0)# Base IUSC

    # Descuentos previsionales (cargo trabajador)
    descuento_afp = Column(Numeric(12, 2), default=0)
    descuento_salud = Column(Numeric(12, 2), default=0)
    descuento_cesantia = Column(Numeric(12, 2), default=0)     # Cargo trabajador 0.6%
    total_descuentos_previsionales = Column(Numeric(12, 2), default=0)

    # Impuesto
    impuesto_unico = Column(Numeric(12, 2), default=0)         # IUSC

    # Otros descuentos
    descuento_otros = Column(Numeric(12, 2), default=0)
    adelanto = Column(Numeric(12, 2), default=0)

    # Aportes empleador
    aporte_cesantia_empleador = Column(Numeric(12, 2), default=0)  # 2.4% o 3%
    aporte_sis = Column(Numeric(12, 2), default=0)                  # 1.49%
    total_costo_empleador = Column(Numeric(12, 2), default=0)

    # Líquido
    liquido_pagar = Column(Numeric(12, 2), default=0)

    # Días trabajados
    dias_trabajados = Column(Integer, default=30)
    horas_extra_habiles = Column(Numeric(5, 2), default=0)
    horas_extra_domingo = Column(Numeric(5, 2), default=0)

    # Metadata
    afp_name = Column(String(50))
    afp_rate = Column(Numeric(6, 4))
    health_system = Column(String(20))
    contract_type = Column(String(20))
    breakdown = Column(JSON)  # Desglose detallado para liquidación

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    payroll_run = relationship("PayrollRun", back_populates="entries")
    employee = relationship("Employee", back_populates="payroll_entries")
