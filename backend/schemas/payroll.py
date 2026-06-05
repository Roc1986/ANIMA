from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime
from decimal import Decimal
from models.payroll import PayrollStatus


class PayrollRunCreate(BaseModel):
    period_year: int
    period_month: int
    uf_value: Decimal
    utm_value: Decimal
    imm_value: Decimal
    payment_date: Optional[date] = None
    notes: Optional[str] = None


class PayrollRunOut(BaseModel):
    id: int
    period_year: int
    period_month: int
    status: PayrollStatus
    uf_value: Decimal
    utm_value: Decimal
    imm_value: Decimal
    payment_date: Optional[date]
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class PayrollEntryOut(BaseModel):
    id: int
    employee_id: int
    payroll_run_id: int
    base_salary: Decimal
    overtime_weekday: Decimal
    overtime_sunday: Decimal
    gratificacion: Decimal
    bono_colacion: Decimal
    bono_movilizacion: Decimal
    bono_otros: Decimal
    asignacion_familiar: Decimal
    total_haberes: Decimal
    remuneracion_imponible: Decimal
    remuneracion_tributable: Decimal
    descuento_afp: Decimal
    descuento_salud: Decimal
    descuento_cesantia: Decimal
    total_descuentos_previsionales: Decimal
    impuesto_unico: Decimal
    descuento_otros: Decimal
    adelanto: Decimal
    aporte_cesantia_empleador: Decimal
    aporte_sis: Decimal
    total_costo_empleador: Decimal
    liquido_pagar: Decimal
    dias_trabajados: int
    horas_extra_habiles: Decimal
    horas_extra_domingo: Decimal
    afp_name: Optional[str]
    afp_rate: Optional[Decimal]
    health_system: Optional[str]
    contract_type: Optional[str]
    breakdown: Optional[Any]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class PayrollRunDetail(BaseModel):
    run: PayrollRunOut
    entries: List[PayrollEntryOut]
    total_liquido: Decimal
    total_costo_empresa: Decimal
    total_trabajadores: int

    class Config:
        from_attributes = True


class PayrollCalculateRequest(BaseModel):
    employee_id: int
    dias_trabajados: int = 30
    horas_extra_habiles: Decimal = Decimal("0")
    horas_extra_domingo: Decimal = Decimal("0")
    bono_colacion: Decimal = Decimal("0")
    bono_movilizacion: Decimal = Decimal("0")
    bono_otros: Decimal = Decimal("0")
    asignacion_familiar: Decimal = Decimal("0")
    adelanto: Decimal = Decimal("0")
    descuento_otros: Decimal = Decimal("0")
