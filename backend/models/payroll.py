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
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
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

    company = relationship("Company", back_populates="payroll_runs")
    entries = relationship("PayrollEntry", back_populates="payroll_run", cascade="all, delete-orphan")


class PayrollEntry(Base):
    __tablename__ = "payroll_entries"

    id = Column(Integer, primary_key=True, index=True)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    # Haberes
    base_salary = Column(Numeric(12, 2), default=0)
    overtime_weekday = Column(Numeric(12, 2), default=0)
    overtime_sunday = Column(Numeric(12, 2), default=0)
    gratificacion = Column(Numeric(12, 2), default=0)
    bono_colacion = Column(Numeric(12, 2), default=0)
    bono_movilizacion = Column(Numeric(12, 2), default=0)
    bono_otros = Column(Numeric(12, 2), default=0)
    asignacion_familiar = Column(Numeric(12, 2), default=0)
    total_haberes = Column(Numeric(12, 2), default=0)

    # Imponible / Tributable
    remuneracion_imponible = Column(Numeric(12, 2), default=0)
    remuneracion_tributable = Column(Numeric(12, 2), default=0)

    # Descuentos previsionales
    descuento_afp = Column(Numeric(12, 2), default=0)
    descuento_salud = Column(Numeric(12, 2), default=0)
    descuento_cesantia = Column(Numeric(12, 2), default=0)
    total_descuentos_previsionales = Column(Numeric(12, 2), default=0)

    # Impuesto
    impuesto_unico = Column(Numeric(12, 2), default=0)

    # Pensión alimenticia (Ley 21.484) — retención judicial
    pension_alimenticia = Column(Numeric(12, 2), default=0)
    pension_alimenticia_tipo = Column(String(30), nullable=True)   # pesos, utm, porcentaje_imm, porcentaje_sueldo
    pension_alimenticia_raw = Column(Numeric(12, 4), default=0)    # valor crudo antes de conversión

    # Descuentos Art. 58 CT (categorizados con topes legales)
    descuento_voluntario = Column(Numeric(12, 2), default=0)       # tope 15% remuneración
    descuento_vivienda = Column(Numeric(12, 2), default=0)         # tope 30% remuneración
    descuento_ccaf = Column(Numeric(12, 2), default=0)             # crédito social CCAF
    descuento_otros = Column(Numeric(12, 2), default=0)            # otros descuentos genéricos
    adelanto = Column(Numeric(12, 2), default=0)

    # Aportes empleador
    aporte_cesantia_empleador = Column(Numeric(12, 2), default=0)
    aporte_sis = Column(Numeric(12, 2), default=0)
    aporte_empleador_afp_reforma = Column(Numeric(12, 2), default=0)  # 0.1% cap. individual Ley 21.735
    aporte_seguro_social = Column(Numeric(12, 2), default=0)           # FAPP Exp. Vida y SIS Ley 21.735
    aporte_mutual_isl = Column(Numeric(12, 2), default=0)              # Seguro Ley 16.744 (0.93%)
    total_costo_empleador = Column(Numeric(12, 2), default=0)

    # Líquido
    liquido_pagar = Column(Numeric(12, 2), default=0)

    # Días y horas
    dias_trabajados = Column(Integer, default=30)
    dias_licencia = Column(Integer, default=0)
    dias_vacaciones = Column(Integer, default=0)
    horas_extra_habiles = Column(Numeric(5, 2), default=0)
    horas_extra_domingo = Column(Numeric(5, 2), default=0)

    # Metadata previsional
    afp_name = Column(String(50))
    afp_rate = Column(Numeric(6, 4))
    health_system = Column(String(20))
    contract_type = Column(String(20))
    previred_movement_code = Column(String(5), default='0')

    # Alertas y desglose calculado
    warnings = Column(JSON, default=list)
    breakdown = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    payroll_run = relationship("PayrollRun", back_populates="entries")
    employee = relationship("Employee", back_populates="payroll_entries")
