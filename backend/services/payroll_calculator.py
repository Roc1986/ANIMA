"""
Chilean Payroll Calculator - 2026
Implements Chilean labor law (Código del Trabajo) for payroll calculations.

Key legal references:
- AFP rates: Superintendencia de Pensiones
- Salud: 7% FONASA/ISAPRE, tope 90.0 UF (vigente desde feb 2026, SP)
- Seguro Cesantía AFC: tope 135.2 UF (vigente desde feb 2026, SP)
- SIS: Seguro Invalidez y Sobrevivencia 1.62% empleador (tasa vigente 2026, SP)
- IUSC: Impuesto Único de Segunda Categoría (tabla SII mensual en UTM)
- Gratificación: Art. 50 Código del Trabajo
- Jornada: 40 horas semanales (Ley 21.561)
- Pensión alimenticia: Ley 21.484, tope 50% remuneración total
- Descuentos voluntarios: Art. 58 CT, tope 15% remuneración total
- Descuento vivienda: Art. 58 CT, tope 30% remuneración total
"""

import math
from decimal import Decimal
from typing import Optional, List


# AFP rates map (key = AFP enum value)
AFP_RATES = {
    "Habitat": 0.1127,
    "Provida": 0.1144,
    "Capital": 0.1144,
    "Cuprum": 0.1144,
    "Planvital": 0.1116,
    "Model": 0.1058,
    "Uno": 0.1049,
}

# IUSC tabla progresiva mensual en UTM (2024)
# Formato: (tramo_desde_utm, tramo_hasta_utm, tasa_marginal, cantidad_a_rebajar_utm)
# Fuente: SII Art. 43 N°1 LIR (actualizado 2024)
IUSC_TABLE_UTM = [
    (0,        13.5,   0.00,  0.000),
    (13.5,     30.0,   0.04,  0.540),
    (30.0,     50.0,   0.08,  1.740),
    (50.0,     70.0,   0.135, 4.490),
    (70.0,     90.0,   0.23,  11.140),
    (90.0,     120.0,  0.304, 17.800),
    (120.0,    150.0,  0.355, 23.920),
    (150.0,    float('inf'), 0.40, 30.670),
]

# Previred movement codes
PREVIRED_CODES = {
    "activo": "0",
    "primer_mes": "1",
    "retiro": "2",
    "licencia_medica": "5",
    "permiso_sin_goce": "6",
}


class ChileanPayrollCalculator:
    """
    Calculates Chilean payroll (liquidación de sueldo) per labor law.
    All monetary values in CLP (pesos chilenos).
    """

    def __init__(
        self,
        uf_value: float,
        utm_value: float,
        imm_value: float,
        legal_params: Optional[dict] = None,
    ):
        self.uf_value = uf_value          # UF value in CLP for the month
        self.utm_value = utm_value        # UTM value in CLP for the month
        self.imm_value = imm_value        # IMM (Ingreso Mínimo Mensual) in CLP

        # Override rates from DB if provided
        lp = legal_params or {}
        self.tope_afp_uf = lp.get("TOPE_IMPONIBLE_AFP_UF", 90.0)
        self.tope_salud_uf = lp.get("TOPE_IMPONIBLE_SALUD_UF", 90.0)
        # AFC (Cesantía) has a DIFFERENT and HIGHER tope than AFP/salud
        self.tope_afc_uf = lp.get("TOPE_IMPONIBLE_AFC_UF", 135.2)
        self.tasa_salud = lp.get("TASA_SALUD", 7.0) / 100
        self.cesantia_trabajador = lp.get("CESANTIA_TRABAJADOR", 0.6) / 100
        self.cesantia_empleador_indefinido = lp.get("CESANTIA_EMPLEADOR_INDEFINIDO", 2.4) / 100
        self.cesantia_empleador_fijo = lp.get("CESANTIA_EMPLEADOR_PLAZO_FIJO", 3.0) / 100
        self.sis_empleador = lp.get("SIS_EMPLEADOR", 1.62) / 100
        self.gratif_multiplicador = lp.get("GRATIFICACION_TOPE_IMM_MULTIPLICADOR", 4.75)
        self.gratif_porcentaje = lp.get("GRATIFICACION_PORCENTAJE", 25.0) / 100
        self.recargo_habiles = lp.get("RECARGO_HH_EE_HABILES", 50.0) / 100
        self.recargo_domingo = lp.get("RECARGO_HH_EE_DOMINGO", 100.0) / 100

        # Topes imponibles en CLP
        self.tope_imponible_afp_clp = self.tope_afp_uf * self.uf_value
        self.tope_imponible_salud_clp = self.tope_salud_uf * self.uf_value
        self.tope_imponible_afc_clp = self.tope_afc_uf * self.uf_value  # UF 128.4

    def _get_afp_rate(self, afp_name: str, legal_params: dict = None) -> float:
        """Get AFP rate from legal params or fallback to hardcoded."""
        if legal_params:
            key = f"AFP_{afp_name.upper()}"
            if key in legal_params:
                return legal_params[key] / 100
        return AFP_RATES.get(afp_name, 0.1127)

    def _calculate_gratificacion(self, sueldo_base: float) -> float:
        """
        Gratificación legal mensual Art. 50 CT:
        25% del sueldo base mensual con tope de 4.75 IMM / 12
        """
        tope_mensual = (self.gratif_multiplicador * self.imm_value) / 12
        gratif = sueldo_base * self.gratif_porcentaje
        return min(gratif, tope_mensual)

    def _calculate_overtime(
        self,
        sueldo_base: float,
        weekly_hours: int,
        horas_extra_habiles: float,
        horas_extra_domingo: float,
    ) -> tuple[float, float]:
        """
        Horas extras:
        - Días hábiles: 50% de recargo sobre valor hora ordinaria
        - Domingos y festivos: 100% de recargo
        """
        horas_mensuales = weekly_hours * (52 / 12)
        valor_hora = sueldo_base / horas_mensuales if horas_mensuales > 0 else 0

        oe_habiles = horas_extra_habiles * valor_hora * (1 + self.recargo_habiles)
        oe_domingo = horas_extra_domingo * valor_hora * (1 + self.recargo_domingo)

        return oe_habiles, oe_domingo

    def _calculate_iusc(self, renta_tributable: float) -> float:
        """
        Impuesto Único de Segunda Categoría (Art. 43 N°1 LIR).
        Tabla progresiva mensual en UTM.
        """
        if renta_tributable <= 0:
            return 0.0

        renta_en_utm = renta_tributable / self.utm_value

        impuesto = 0.0
        for desde, hasta, tasa, rebaja in IUSC_TABLE_UTM:
            if renta_en_utm > desde:
                if renta_en_utm <= hasta:
                    impuesto = (renta_en_utm * tasa - rebaja) * self.utm_value
                    break
            else:
                break

        return max(0.0, impuesto)

    def _convert_pension_to_clp(
        self,
        tipo: str,
        raw_value: float,
        remuneracion_total: float,
    ) -> float:
        """
        Convierte la pensión alimenticia a CLP según tipo:
        - 'pesos': valor directo en CLP
        - 'utm': múltiplo de UTM del mes (Ley 21.484)
        - 'porcentaje_imm': porcentaje del sueldo mínimo
        - 'porcentaje_sueldo': porcentaje de la remuneración total
        """
        if tipo == "pesos":
            return raw_value
        elif tipo == "utm":
            return raw_value * self.utm_value
        elif tipo == "porcentaje_imm":
            return (raw_value / 100) * self.imm_value
        elif tipo == "porcentaje_sueldo":
            return (raw_value / 100) * remuneracion_total
        return raw_value

    def _get_previred_movement_code(
        self,
        dias_licencia: int,
        is_first_month: bool,
        permiso_sin_goce: bool = False,
    ) -> str:
        """
        Códigos de movimiento Previred:
        0 = Activo normal
        1 = Primer mes de cotizaciones
        5 = En licencia médica
        6 = Permiso sin goce de sueldo
        """
        if permiso_sin_goce:
            return PREVIRED_CODES["permiso_sin_goce"]
        if dias_licencia > 0:
            return PREVIRED_CODES["licencia_medica"]
        if is_first_month:
            return PREVIRED_CODES["primer_mes"]
        return PREVIRED_CODES["activo"]

    def _round_clp(self, value: float) -> float:
        """Round to nearest peso (CLP has no cents in practice)."""
        return math.floor(value)

    def calculate(
        self,
        employee,
        contract_type: str = "indefinido",
        dias_trabajados: int = 30,
        dias_licencia: int = 0,
        dias_vacaciones: int = 0,
        horas_extra_habiles: float = 0,
        horas_extra_domingo: float = 0,
        bono_colacion: float = 0,
        bono_movilizacion: float = 0,
        bono_otros: float = 0,
        asignacion_familiar: float = 0,
        adelanto: float = 0,
        descuento_otros: float = 0,
        # Pensión alimenticia (Ley 21.484)
        pension_alimenticia_tipo: str = "pesos",
        pension_alimenticia_raw: float = 0,
        # Descuentos Art. 58 CT
        descuento_voluntario: float = 0,   # tope 15% remuneración total
        descuento_vivienda: float = 0,     # tope 30% remuneración total
        descuento_ccaf: float = 0,         # cuota crédito CCAF
        # Primer mes (para código Previred)
        is_first_month: bool = False,
        permiso_sin_goce: bool = False,
    ) -> dict:
        """
        Full Chilean payroll calculation.
        Returns a dict matching PayrollEntry fields.
        """
        warnings: List[str] = []

        sueldo_base = float(employee.base_salary)
        afp_raw = employee.afp.value if hasattr(employee.afp, 'value') else str(employee.afp)
        afp_name = afp_raw.split('.')[-1].capitalize() if '.' in afp_raw else afp_raw
        hs_raw = employee.health_system.value if hasattr(employee.health_system, 'value') else str(employee.health_system)
        health_system = hs_raw.split('.')[-1].upper() if '.' in hs_raw else hs_raw
        weekly_hours = 40  # Ley 21.561

        # --- Proporcionalidad por días trabajados efectivos ---
        # dias_trabajados ya debe venir como días efectivos (descontando licencia/vacaciones)
        if dias_trabajados < 30:
            factor = dias_trabajados / 30.0
            sueldo_base_efectivo = sueldo_base * factor
        else:
            sueldo_base_efectivo = sueldo_base

        # --- Advertencia licencia médica ---
        if dias_licencia >= 4:
            warnings.append(
                f"LICENCIA MÉDICA: El trabajador tiene {dias_licencia} días de licencia. "
                f"Los primeros 3 días son de cargo del empleador. "
                f"Los días 4 en adelante deben ser cubiertos por subsidio CCAF/FONASA. "
                f"Verifique que el subsidio no esté siendo pagado doble."
            )
        elif dias_licencia > 0:
            warnings.append(
                f"LICENCIA MÉDICA CORTA: {dias_licencia} día(s). "
                f"Licencias de 1-3 días son de cargo del empleador sin subsidio."
            )

        # --- Gratificación legal (mensualizada) ---
        gratificacion = self._calculate_gratificacion(sueldo_base_efectivo)

        # --- Horas extra ---
        oe_habiles, oe_domingo = self._calculate_overtime(
            sueldo_base=sueldo_base,
            weekly_hours=weekly_hours,
            horas_extra_habiles=horas_extra_habiles,
            horas_extra_domingo=horas_extra_domingo,
        )

        # --- Total haberes imponibles ---
        total_imponible_bruto = (
            sueldo_base_efectivo + gratificacion + oe_habiles + oe_domingo + bono_otros
        )

        # --- Topes imponibles (AFP/Salud vs AFC son DIFERENTES) ---
        base_afp = min(total_imponible_bruto, self.tope_imponible_afp_clp)
        base_salud = min(total_imponible_bruto, self.tope_imponible_salud_clp)
        # AFC tope UF 128.4 — DISTINTO al tope AFP (UF 81.6)
        base_afc = min(total_imponible_bruto, self.tope_imponible_afc_clp)

        # --- Descuentos previsionales trabajador ---
        afp_rate = self._get_afp_rate(afp_name)
        descuento_afp = base_afp * afp_rate

        # Salud: 7% sobre base con tope, o plan ISAPRE (el mayor)
        isapre_amount_raw = float(employee.isapre_monthly_amount or 0)
        isapre_amount_type = getattr(employee, 'isapre_amount_type', 'pesos') or 'pesos'
        if isapre_amount_type == "uf":
            isapre_amount = isapre_amount_raw * self.uf_value
        else:
            isapre_amount = isapre_amount_raw
        if health_system == "ISAPRE" and isapre_amount > 0:
            descuento_salud = max(base_salud * self.tasa_salud, isapre_amount)
        else:
            descuento_salud = base_salud * self.tasa_salud

        # Cesantía trabajador: 0.6% indefinido/part_time, 0% plazo_fijo/obra_faena (Ley 19.728 Art. 5)
        if contract_type in ("plazo_fijo", "obra_faena"):
            descuento_cesantia_trabajador = 0.0
        else:
            descuento_cesantia_trabajador = base_afc * self.cesantia_trabajador

        total_descuentos_prev = descuento_afp + descuento_salud + descuento_cesantia_trabajador

        # --- Renta tributable para IUSC ---
        renta_tributable = total_imponible_bruto - total_descuentos_prev

        # --- Impuesto Único de Segunda Categoría ---
        impuesto_unico = self._calculate_iusc(renta_tributable)

        # --- Total haberes (incluyendo no imponibles) ---
        total_haberes = (
            total_imponible_bruto + bono_colacion + bono_movilizacion + asignacion_familiar
        )

        # --- Aportes empleador ---
        if contract_type in ("plazo_fijo", "obra_faena"):
            # Plazo fijo: solo empleador paga cesantía (3%), con tope AFC
            aporte_cesantia_empleador = base_afc * self.cesantia_empleador_fijo
        else:
            aporte_cesantia_empleador = base_afc * self.cesantia_empleador_indefinido

        aporte_sis = base_afp * self.sis_empleador

        total_costo_empleador = total_haberes + aporte_cesantia_empleador + aporte_sis

        # --- Pensión alimenticia (Ley 21.484) ---
        pension_alimenticia_clp = 0.0
        if pension_alimenticia_raw > 0:
            pension_alimenticia_clp = self._convert_pension_to_clp(
                tipo=pension_alimenticia_tipo,
                raw_value=pension_alimenticia_raw,
                remuneracion_total=total_haberes,
            )
            # Tope legal: 50% de la remuneración total
            tope_pension = total_haberes * 0.50
            if pension_alimenticia_clp > tope_pension:
                warnings.append(
                    f"PENSIÓN ALIMENTICIA: El monto calculado (${pension_alimenticia_clp:,.0f}) "
                    f"supera el tope legal del 50% de la remuneración total (${tope_pension:,.0f}). "
                    f"Se aplicará el tope máximo legal. Consulte al tribunal si corresponde acumulación."
                )
                pension_alimenticia_clp = tope_pension

        # --- Validación descuentos voluntarios Art. 58 CT (tope 15%) ---
        tope_voluntario = total_imponible_bruto * 0.15
        if descuento_voluntario > tope_voluntario:
            warnings.append(
                f"DESCUENTO VOLUNTARIO: El total de descuentos voluntarios (${descuento_voluntario:,.0f}) "
                f"supera el tope legal del 15% de la remuneración imponible (${tope_voluntario:,.0f}). "
                f"Art. 58 Código del Trabajo. Se aplicará el tope máximo legal."
            )
            descuento_voluntario = tope_voluntario

        # --- Validación descuento vivienda Art. 58 CT (tope 30%) ---
        tope_vivienda = total_imponible_bruto * 0.30
        if descuento_vivienda > tope_vivienda:
            warnings.append(
                f"DESCUENTO VIVIENDA: El descuento por vivienda (${descuento_vivienda:,.0f}) "
                f"supera el tope legal del 30% de la remuneración imponible (${tope_vivienda:,.0f}). "
                f"Art. 58 Código del Trabajo. Se aplicará el tope máximo legal."
            )
            descuento_vivienda = tope_vivienda

        # --- Líquido a pagar ---
        total_descuentos_no_prev = (
            impuesto_unico
            + pension_alimenticia_clp
            + descuento_voluntario
            + descuento_vivienda
            + descuento_ccaf
            + descuento_otros
            + adelanto
        )
        total_descuentos = total_descuentos_prev + total_descuentos_no_prev
        liquido_pagar = total_haberes - total_descuentos

        # --- Advertencia sueldo líquido insuficiente ---
        descuentos_fijos = pension_alimenticia_clp + descuento_ccaf
        if liquido_pagar < 0:
            warnings.append(
                f"SUELDO INSUFICIENTE: El líquido calculado es negativo (${liquido_pagar:,.0f}). "
                f"Los descuentos superan el total de haberes. "
                f"Revise los descuentos o registre la diferencia como deuda laboral para el mes siguiente."
            )
        elif descuentos_fijos > 0 and liquido_pagar < descuentos_fijos * 0.1:
            warnings.append(
                f"SUELDO BAJO: El líquido resultante (${liquido_pagar:,.0f}) es muy bajo para cubrir "
                f"los descuentos obligatorios fijos (pensión alimenticia, CCAF). "
                f"Verifique si aplica acumulación de deuda para el mes siguiente."
            )

        # --- Código de movimiento Previred ---
        previred_movement_code = self._get_previred_movement_code(
            dias_licencia=dias_licencia,
            is_first_month=is_first_month,
            permiso_sin_goce=permiso_sin_goce,
        )

        breakdown = {
            "sueldo_base_efectivo": self._round_clp(sueldo_base_efectivo),
            "gratificacion_calculada": self._round_clp(gratificacion),
            "tope_imponible_afp_clp": self._round_clp(self.tope_imponible_afp_clp),
            "tope_imponible_salud_clp": self._round_clp(self.tope_imponible_salud_clp),
            "tope_imponible_afc_clp": self._round_clp(self.tope_imponible_afc_clp),
            "base_afp": self._round_clp(base_afp),
            "base_salud": self._round_clp(base_salud),
            "base_afc": self._round_clp(base_afc),
            "afp_rate_pct": afp_rate * 100,
            "renta_tributable": self._round_clp(renta_tributable),
            "renta_en_utm": round(renta_tributable / self.utm_value, 4),
            "pension_alimenticia_tipo": pension_alimenticia_tipo,
            "pension_alimenticia_raw": pension_alimenticia_raw,
            "pension_alimenticia_clp": self._round_clp(pension_alimenticia_clp),
            "tope_pension_50pct": self._round_clp(total_haberes * 0.50),
            "tope_voluntario_15pct": self._round_clp(tope_voluntario),
            "tope_vivienda_30pct": self._round_clp(tope_vivienda),
            "uf_value": self.uf_value,
            "utm_value": self.utm_value,
            "imm_value": self.imm_value,
            "previred_movement_code": previred_movement_code,
            "warnings": warnings,
        }

        return {
            "base_salary": self._round_clp(sueldo_base_efectivo),
            "overtime_weekday": self._round_clp(oe_habiles),
            "overtime_sunday": self._round_clp(oe_domingo),
            "gratificacion": self._round_clp(gratificacion),
            "bono_colacion": self._round_clp(bono_colacion),
            "bono_movilizacion": self._round_clp(bono_movilizacion),
            "bono_otros": self._round_clp(bono_otros),
            "asignacion_familiar": self._round_clp(asignacion_familiar),
            "total_haberes": self._round_clp(total_haberes),
            "remuneracion_imponible": self._round_clp(total_imponible_bruto),
            "remuneracion_tributable": self._round_clp(renta_tributable),
            "descuento_afp": self._round_clp(descuento_afp),
            "descuento_salud": self._round_clp(descuento_salud),
            "descuento_cesantia": self._round_clp(descuento_cesantia_trabajador),
            "total_descuentos_previsionales": self._round_clp(total_descuentos_prev),
            "impuesto_unico": self._round_clp(impuesto_unico),
            "pension_alimenticia": self._round_clp(pension_alimenticia_clp),
            "pension_alimenticia_tipo": pension_alimenticia_tipo,
            "pension_alimenticia_raw": pension_alimenticia_raw,
            "descuento_voluntario": self._round_clp(descuento_voluntario),
            "descuento_vivienda": self._round_clp(descuento_vivienda),
            "descuento_ccaf": self._round_clp(descuento_ccaf),
            "descuento_otros": self._round_clp(descuento_otros),
            "adelanto": self._round_clp(adelanto),
            "aporte_cesantia_empleador": self._round_clp(aporte_cesantia_empleador),
            "aporte_sis": self._round_clp(aporte_sis),
            "total_costo_empleador": self._round_clp(total_costo_empleador),
            "liquido_pagar": self._round_clp(liquido_pagar),
            "dias_trabajados": dias_trabajados,
            "dias_licencia": dias_licencia,
            "dias_vacaciones": dias_vacaciones,
            "horas_extra_habiles": horas_extra_habiles,
            "horas_extra_domingo": horas_extra_domingo,
            "afp_name": afp_name,
            "afp_rate": afp_rate,
            "health_system": health_system,
            "contract_type": contract_type,
            "previred_movement_code": previred_movement_code,
            "warnings": warnings,
            "breakdown": breakdown,
        }
