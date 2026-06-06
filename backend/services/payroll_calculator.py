"""
Chilean Payroll Calculator - 2024/2025
Implements Chilean labor law (Código del Trabajo) for payroll calculations.

Key legal references:
- AFP rates: Superintendencia de Pensiones
- Salud: 7% FONASA/ISAPRE, tope 81.6 UF
- Seguro Cesantía: AFC (Ley 19.728)
- SIS: Seguro Invalidez y Sobrevivencia 1.49% empleador
- IUSC: Impuesto Único de Segunda Categoría (tabla SII mensual en UTM)
- Gratificación: Art. 50 Código del Trabajo
- Jornada: 40 horas semanales (Ley 21.561)
"""

import math
from decimal import Decimal
from typing import Optional


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
        self.tope_afp_uf = lp.get("TOPE_IMPONIBLE_AFP_UF", 81.6)
        self.tope_salud_uf = lp.get("TOPE_IMPONIBLE_SALUD_UF", 81.6)
        self.tasa_salud = lp.get("TASA_SALUD", 7.0) / 100
        self.cesantia_trabajador = lp.get("CESANTIA_TRABAJADOR", 0.6) / 100
        self.cesantia_empleador_indefinido = lp.get("CESANTIA_EMPLEADOR_INDEFINIDO", 2.4) / 100
        self.cesantia_empleador_fijo = lp.get("CESANTIA_EMPLEADOR_PLAZO_FIJO", 3.0) / 100
        self.sis_empleador = lp.get("SIS_EMPLEADOR", 1.49) / 100
        self.gratif_multiplicador = lp.get("GRATIFICACION_TOPE_IMM_MULTIPLICADOR", 4.75)
        self.gratif_porcentaje = lp.get("GRATIFICACION_PORCENTAJE", 25.0) / 100
        self.recargo_habiles = lp.get("RECARGO_HH_EE_HABILES", 50.0) / 100
        self.recargo_domingo = lp.get("RECARGO_HH_EE_DOMINGO", 100.0) / 100

        # Tope imponible AFP en CLP
        self.tope_imponible_afp_clp = self.tope_afp_uf * self.uf_value
        # Tope imponible salud en CLP
        self.tope_imponible_salud_clp = self.tope_salud_uf * self.uf_value

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
        (si la empresa opta por prorrateo mensual, lo más común)
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
        Valor hora ordinaria = sueldo_base / (jornada_semanal * 4.333...)
        """
        # Valor hora ordinaria mensual
        horas_mensuales = weekly_hours * (52 / 12)  # weeks per month
        valor_hora = sueldo_base / horas_mensuales if horas_mensuales > 0 else 0

        oe_habiles = horas_extra_habiles * valor_hora * (1 + self.recargo_habiles)
        oe_domingo = horas_extra_domingo * valor_hora * (1 + self.recargo_domingo)

        return oe_habiles, oe_domingo

    def _calculate_iusc(self, renta_tributable: float) -> float:
        """
        Impuesto Único de Segunda Categoría (Art. 43 N°1 LIR).
        Tabla progresiva mensual en UTM.
        renta_tributable: renta imponible - descuentos previsionales
        """
        if renta_tributable <= 0:
            return 0.0

        renta_en_utm = renta_tributable / self.utm_value

        impuesto = 0.0
        for desde, hasta, tasa, rebaja in IUSC_TABLE_UTM:
            if renta_en_utm > desde:
                if renta_en_utm <= hasta:
                    # This is the applicable tramo
                    impuesto = (renta_en_utm * tasa - rebaja) * self.utm_value
                    break
                # else continue to next tramo (renta is above this tramo)
            else:
                break  # renta is below this tramo, no tax

        return max(0.0, impuesto)

    def _round_clp(self, value: float) -> float:
        """Round to nearest peso (CLP has no cents in practice)."""
        return math.floor(value)

    def calculate(
        self,
        employee,
        contract_type: str = "indefinido",
        dias_trabajados: int = 30,
        horas_extra_habiles: float = 0,
        horas_extra_domingo: float = 0,
        bono_colacion: float = 0,
        bono_movilizacion: float = 0,
        bono_otros: float = 0,
        asignacion_familiar: float = 0,
        adelanto: float = 0,
        descuento_otros: float = 0,
    ) -> dict:
        """
        Full Chilean payroll calculation.
        Returns a dict matching PayrollEntry fields.
        """
        sueldo_base = float(employee.base_salary)
        afp_raw = employee.afp.value if hasattr(employee.afp, 'value') else str(employee.afp)
        afp_name = afp_raw.split('.')[-1].capitalize() if '.' in afp_raw else afp_raw
        hs_raw = employee.health_system.value if hasattr(employee.health_system, 'value') else str(employee.health_system)
        health_system = hs_raw.split('.')[-1].upper() if '.' in hs_raw else hs_raw
        weekly_hours = 40  # default per Ley 21.561

        # --- Proporcionalidad por días trabajados ---
        # Si trabajó menos de 30 días, proporcionar el sueldo
        if dias_trabajados < 30:
            factor = dias_trabajados / 30.0
            sueldo_base_efectivo = sueldo_base * factor
        else:
            sueldo_base_efectivo = sueldo_base

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
        # Imponibles: sueldo base + gratificación + HH.EE + bono_otros
        # No imponibles: colación + movilización + asignación familiar
        total_imponible_bruto = (
            sueldo_base_efectivo + gratificacion + oe_habiles + oe_domingo + bono_otros
        )

        # Tope imponible AFP
        base_afp = min(total_imponible_bruto, self.tope_imponible_afp_clp)
        # Tope imponible salud
        base_salud = min(total_imponible_bruto, self.tope_imponible_salud_clp)

        # --- Descuentos previsionales trabajador ---
        afp_rate = self._get_afp_rate(afp_name)
        descuento_afp = base_afp * afp_rate

        # Salud: 7% sobre base con tope
        isapre_amount = float(employee.isapre_monthly_amount or 0)
        if health_system == "ISAPRE" and isapre_amount > 0:
            # Para ISAPRE, se descuenta el plan (mínimo 7%)
            descuento_salud = max(base_salud * self.tasa_salud, isapre_amount)
        else:
            # FONASA: 7% sobre base imponible con tope
            descuento_salud = base_salud * self.tasa_salud

        # Seguro Cesantía trabajador: 0.6%
        descuento_cesantia_trabajador = total_imponible_bruto * self.cesantia_trabajador

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
        # Cesantía empleador
        if contract_type in ("plazo_fijo", "obra_faena"):
            aporte_cesantia_empleador = total_imponible_bruto * self.cesantia_empleador_fijo
        else:
            aporte_cesantia_empleador = total_imponible_bruto * self.cesantia_empleador_indefinido

        # SIS: 1.49% sobre renta imponible
        aporte_sis = base_afp * self.sis_empleador

        # Costo total empleador = total haberes + aportes empleador
        total_costo_empleador = total_haberes + aporte_cesantia_empleador + aporte_sis

        # --- Líquido a pagar ---
        total_descuentos = total_descuentos_prev + impuesto_unico + descuento_otros + adelanto
        liquido_pagar = total_haberes - total_descuentos

        # Ensure minimum wage (IMM) for full month
        if dias_trabajados == 30:
            liquido_pagar = max(liquido_pagar, self.imm_value * 0.1)  # at least some amount

        # --- Round all values ---
        breakdown = {
            "sueldo_base_efectivo": self._round_clp(sueldo_base_efectivo),
            "gratificacion_calculada": self._round_clp(gratificacion),
            "tope_imponible_afp_clp": self._round_clp(self.tope_imponible_afp_clp),
            "tope_imponible_salud_clp": self._round_clp(self.tope_imponible_salud_clp),
            "base_afp": self._round_clp(base_afp),
            "base_salud": self._round_clp(base_salud),
            "afp_rate_pct": afp_rate * 100,
            "renta_tributable": self._round_clp(renta_tributable),
            "renta_en_utm": round(renta_tributable / self.utm_value, 4),
            "uf_value": self.uf_value,
            "utm_value": self.utm_value,
            "imm_value": self.imm_value,
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
            "descuento_otros": self._round_clp(descuento_otros),
            "adelanto": self._round_clp(adelanto),
            "aporte_cesantia_empleador": self._round_clp(aporte_cesantia_empleador),
            "aporte_sis": self._round_clp(aporte_sis),
            "total_costo_empleador": self._round_clp(total_costo_empleador),
            "liquido_pagar": self._round_clp(liquido_pagar),
            "dias_trabajados": dias_trabajados,
            "horas_extra_habiles": horas_extra_habiles,
            "horas_extra_domingo": horas_extra_domingo,
            "afp_name": afp_name,
            "afp_rate": afp_rate,
            "health_system": health_system,
            "contract_type": contract_type,
            "breakdown": breakdown,
        }
