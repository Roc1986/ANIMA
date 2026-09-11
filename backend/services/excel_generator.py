"""
Excel Generator for Chilean payroll reports.
Generates:
  - Previred upload file (formato oficial AFC/Previred)
  - Declaración Jurada Anual F1887 (SII)
"""

import os
import uuid
from typing import Dict, List
from datetime import date as date_type
from datetime import datetime

import openpyxl
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, numbers
)
from openpyxl.utils import get_column_letter

from config import settings

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

BLUE = "1e3a5f"
LIGHT_BLUE = "e8f0fe"
GREEN = "2e7d32"
LIGHT_GREEN = "e8f5e9"
GRAY = "f5f5f5"
WHITE = "FFFFFF"


def _header_style(wb, color=BLUE):
    font = Font(bold=True, color=WHITE, size=9)
    fill = PatternFill("solid", fgColor=color)
    align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    return font, fill, align


def _money_format(ws, cell):
    cell.number_format = '#,##0'


def generate_previred_excel(run, entries, employees: Dict, company=None) -> str:
    """
    Generate Previred-compatible Excel file.
    Format based on Previred manual de carga masiva.
    Columns match the standard Previred template.
    """
    filename = f"previred_{run.period_year}_{run.period_month:02d}_{uuid.uuid4().hex[:8]}.xlsx"
    filepath = os.path.join(UPLOAD_DIR, filename)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Previred {run.period_month:02d}-{run.period_year}"

    # Period info
    ws.merge_cells("A1:R1")
    co_name = (company.name if company and company.name else settings.COMPANY_NAME)
    co_rut = (company.rut if company and company.rut else settings.COMPANY_RUT)
    ws["A1"] = f"ARCHIVO PREVIRED - {co_name} - RUT {co_rut} - Período {run.period_month:02d}/{run.period_year}"
    ws["A1"].font = Font(bold=True, size=11, color=BLUE)
    ws["A1"].alignment = Alignment(horizontal="center")

    headers = [
        "RUT Trabajador", "Nombre", "Apellido Paterno", "Apellido Materno",
        "AFP", "Renta Imponible AFP", "Cotización AFP", "Mayor Retención (0.1%)", "Cotización AFP Total",
        "Sistema Salud", "Renta Imponible Salud", "Cotización Salud",
        "Seg. Cesantía Trabajador", "Seg. Cesantía Empleador",
        "SIS Empleador (1.62%)", "Días Trabajados", "Renta Bruta",
        "Renta Tributable", "IUSC",
    ]

    font, fill, align = _header_style(wb)
    for col, header in enumerate(headers, start=1):
        cell = ws.cell(row=2, column=col, value=header)
        cell.font = font
        cell.fill = fill
        cell.alignment = align

    # Data rows
    row = 3
    for entry in entries:
        emp = employees.get(entry.employee_id)
        if not emp:
            continue

        import math as _math
        rut_clean = emp.rut.replace(".", "")
        renta_imp    = int(float(entry.remuneracion_imponible))
        cot_afp_base = int(float(entry.descuento_afp))
        mayor_ret    = _math.ceil(renta_imp * 0.001)
        cot_afp_total = cot_afp_base + mayor_ret
        from services.payroll_calculator import get_sis_rate as _get_sis
        cot_sis_real = round(renta_imp * _get_sis(run.period_year, run.period_month))

        ws.cell(row=row, column=1,  value=rut_clean)
        ws.cell(row=row, column=2,  value=emp.first_name)
        ws.cell(row=row, column=3,  value=emp.last_name)
        ws.cell(row=row, column=4,  value=emp.second_last_name or "")
        ws.cell(row=row, column=5,  value=entry.afp_name or str(emp.afp))
        ws.cell(row=row, column=6,  value=renta_imp)
        ws.cell(row=row, column=7,  value=cot_afp_base)
        ws.cell(row=row, column=8,  value=mayor_ret)
        ws.cell(row=row, column=9,  value=cot_afp_total)
        ws.cell(row=row, column=10, value=entry.health_system or str(emp.health_system))
        ws.cell(row=row, column=11, value=renta_imp)
        ws.cell(row=row, column=12, value=int(float(entry.descuento_salud)))
        ws.cell(row=row, column=13, value=int(float(entry.descuento_cesantia)))
        ws.cell(row=row, column=14, value=int(float(entry.aporte_cesantia_empleador)))
        ws.cell(row=row, column=15, value=cot_sis_real)
        ws.cell(row=row, column=16, value=int(entry.dias_trabajados))
        ws.cell(row=row, column=17, value=int(float(entry.total_haberes)))
        ws.cell(row=row, column=18, value=int(float(entry.remuneracion_tributable)))
        ws.cell(row=row, column=19, value=int(float(entry.impuesto_unico)))

        # Format money columns
        for col in [6, 7, 8, 9, 11, 12, 13, 14, 15, 17, 18, 19]:
            ws.cell(row=row, column=col).number_format = '#,##0'

        # Alternate row colors
        fill_color = LIGHT_BLUE if row % 2 == 0 else WHITE
        for col in range(1, len(headers) + 1):
            ws.cell(row=row, column=col).fill = PatternFill("solid", fgColor=fill_color)

        row += 1

    # Totals row
    total_row = row
    ws.cell(row=total_row, column=1, value="TOTALES")
    ws.cell(row=total_row, column=1).font = Font(bold=True)

    for col in [6, 7, 8, 9, 11, 12, 13, 14, 15, 17, 18, 19]:
        col_letter = get_column_letter(col)
        ws.cell(row=total_row, column=col, value=f"=SUM({col_letter}3:{col_letter}{total_row-1})")
        ws.cell(row=total_row, column=col).number_format = '#,##0'
        ws.cell(row=total_row, column=col).font = Font(bold=True)
        ws.cell(row=total_row, column=col).fill = PatternFill("solid", fgColor=LIGHT_BLUE)

    # Column widths (19 columns now)
    col_widths = [14, 15, 18, 18, 10, 16, 14, 16, 16, 12, 16, 14, 16, 16, 16, 10, 14, 16, 10]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.freeze_panes = "A3"

    # Reference sheet
    ws2 = wb.create_sheet("Referencia")
    ws2["A1"] = "Valores de Referencia del Período"
    ws2["A1"].font = Font(bold=True, size=12)
    refs = [
        ("Período", f"{run.period_month:02d}/{run.period_year}"),
        ("UF", float(run.uf_value)),
        ("UTM", float(run.utm_value)),
        ("IMM", float(run.imm_value)),
        ("Empresa", co_name),
        ("RUT Empresa", co_rut),
        ("Generado", datetime.now().strftime("%d/%m/%Y %H:%M")),
    ]
    for i, (label, value) in enumerate(refs, 3):
        ws2.cell(row=i, column=1, value=label).font = Font(bold=True)
        ws2.cell(row=i, column=2, value=value)

    wb.save(filepath)
    return filepath


# ---------------------------------------------------------------------------
# AFP codes used by Previred (código institución previsional)
# ---------------------------------------------------------------------------
AFP_CODES = {
    # Por clave del enum (minúscula)
    "habitat":   "05",
    "provida":   "08",
    "capital":   "33",
    "cuprum":    "03",
    "planvital": "29",
    "modelo":    "34",
    "model":     "34",   # compatibilidad con valor antiguo "Model"
    "uno":       "35",
    # Por valor del enum (capitalizado)
    "Habitat":   "05",
    "Provida":   "08",
    "Capital":   "33",
    "Cuprum":    "03",
    "Planvital": "29",
    "Modelo":    "34",
    "Model":     "34",
    "Uno":       "35",
}

ISAPRE_CODES = {
    # Tabla N°16 Previred — códigos 2 dígitos
    "fonasa":        "07",
    "banmedica":     "01",
    "banmédica":     "01",
    "consalud":      "02",
    "vida tres":     "03",
    "vidatres":      "03",
    "colmena":       "04",
    "cruz blanca":   "05",
    "cruzblanca":    "05",
    "masvida":       "10",
    "nueva masvida": "10",
    "nuevamasvida":  "10",
    "esencial":      "11",
    "codelco":       "11",
    "banco estado":  "12",
    "bancoestado":   "12",
    "cruz del norte": "25",
}


def _fmt_date(d) -> str:
    if d is None:
        return ""
    if isinstance(d, str):
        try:
            d = date_type.fromisoformat(d)
        except Exception:
            return ""
    try:
        return d.strftime("%d%m%Y")
    except Exception:
        return ""


def generate_previred_txt(run, entries, employees: Dict) -> str:
    """
    Formato Estándar Largo Variable por Separador — 105 campos, separador ';'.
    Versión actualizada con campos 93 (Tipo Jornada) y 94 (Expectativa de Vida).
    Referencia: Manual Previred v58+ con reforma previsional 2025.
    """
    import math as _math
    from services.payroll_calculator import get_ley21735_rates, get_sis_rate

    filename = f"previred_{run.period_year}_{run.period_month:02d}_{uuid.uuid4().hex[:8]}.txt"
    filepath = os.path.join(UPLOAD_DIR, filename)

    periodo = f"{run.period_month:02d}{run.period_year}"  # mmaaaa

    lines = []
    for entry in entries:
        emp = employees.get(entry.employee_id)
        if not emp:
            continue

        # RUT: separar número de DV
        rut_full = str(emp.rut or "").replace(".", "").replace("-", "")
        if len(rut_full) > 1:
            rut_num = rut_full[:-1]
            rut_dv  = rut_full[-1]
        else:
            rut_num = rut_full
            rut_dv  = "0"

        afp_str  = str(emp.afp or "")
        afp_raw  = afp_str.split(".")[-1]          # clave enum o valor
        afp_code = AFP_CODES.get(afp_raw) or AFP_CODES.get(afp_raw.lower()) or "05"

        hs_raw = str(emp.health_system or "").split(".")[-1].upper()
        is_fonasa = (hs_raw == "FONASA")
        # Para Isapre, el nombre específico está en emp.isapre_name (ej: "Consalud", "Banmedica")
        isapre_name_key = str(emp.isapre_name or "").strip().lower()

        renta_imp     = int(float(entry.remuneracion_imponible or 0))
        cot_afp_base  = int(float(entry.descuento_afp or 0))
        mayor_ret     = _math.ceil(renta_imp * 0.001)   # 0.1% mayor retención (ceil)
        cot_afp_total = cot_afp_base + mayor_ret
        _sis_rate     = get_sis_rate(run.period_year, run.period_month)
        cot_sis       = round(renta_imp * _sis_rate)     # SIS tasa vigente por período
        _cap_pct, _crp_pct = get_ley21735_rates(run.period_year, run.period_month)
        exp_vida      = round(renta_imp * 0.009)         # Cotización Expectativa de Vida (0.9%)
        crp           = round(renta_imp * _crp_pct)      # CRP empleador campo 95 (0.9% desde ago 2025)
        cot_salud     = int(float(entry.descuento_salud or 0))
        cot_cesantia  = int(float(entry.descuento_cesantia or 0))
        afc_emp       = int(float(entry.aporte_cesantia_empleador or 0))
        # Días = 0 → mes completo (Previred usa 0 para mes sin ausencias).
        # Días > 0 activa validación ISL obligatoria en Previred.
        dias_raw = int(entry.dias_trabajados or 0)
        dias = 0 if dias_raw >= 30 else dias_raw

        f = [""] * 105

        # ── Bloque 1: Datos del Trabajador (campos 1-25) ───────────────────────
        f[0]  = rut_num          # 1  RUT trabajador (sin DV)
        f[1]  = rut_dv           # 2  DV trabajador
        f[2]  = emp.last_name or ""          # 3  Apellido Paterno
        f[3]  = emp.second_last_name or ""   # 4  Apellido Materno
        f[4]  = emp.first_name or ""         # 5  Nombres
        f[5]  = "M"              # 6  Sexo (M/F) — M por defecto; adaptar si se almacena
        f[6]  = "0"              # 7  Nacionalidad (0=Chileno)
        f[7]  = "01"             # 8  Tipo Pago (01=Remuneraciones mes)
        f[8]  = periodo          # 9  Período Desde (mmaaaa)
        f[9]  = periodo          # 10 Período Hasta (mmaaaa)
        f[10] = "AFP"            # 11 Régimen Previsional
        f[11] = "0"              # 12 Tipo Trabajador (0=Activo no pensionado)
        f[12] = str(dias)        # 13 Días Trabajados
        f[13] = "00"             # 14 Tipo de Línea (00=Principal)
        f[14] = "00"             # 15 Código Movimiento Personal (00=Sin movimiento)
        f[15] = ""               # 16 Fecha Desde movimiento
        f[16] = ""               # 17 Fecha Hasta movimiento
        f[17] = "D"              # 18 Tramo Asig. Familiar (D=Sin Derecho)
        f[18] = "0"              # 19 N° Cargas Simples
        f[19] = "0"              # 20 N° Cargas Maternales
        f[20] = "0"              # 21 N° Cargas Inválidas
        f[21] = "0"              # 22 Asignación Familiar
        f[22] = "0"              # 23 Asig. Familiar Retroactiva
        f[23] = "0"              # 24 Reintegro Cargas Familiares
        f[24] = "N"              # 25 Solicitud Trabajador Joven

        # ── Bloque 2: AFP (campos 26-39) ──────────────────────────────────────
        f[25] = afp_code         # 26 Código AFP
        f[26] = str(renta_imp)   # 27 Renta Imponible AFP
        f[27] = str(cot_afp_total)  # 28 Cot. Obligatoria AFP (incluye 0.1% mayor retención)
        f[28] = str(cot_sis)     # 29 SIS empleador (1.62%)
        f[29] = "0"              # 30 Cuenta Ahorro Voluntario AFP
        f[30] = "0"              # 31 Renta Imp. Sustitutiva AFP
        f[31] = "0"              # 32 Tasa Pactada
        f[32] = "0"              # 33 Aporte Indemnización
        f[33] = "0"              # 34 N° Períodos Sustitutivos
        f[34] = ""               # 35 Período desde Sust.
        f[35] = ""               # 36 Período hasta Sust.
        f[36] = ""               # 37 Puesto Trabajo Pesado
        f[37] = "0"              # 38 % Cotización Trabajo Pesado
        f[38] = "0"              # 39 Cotización Trabajo Pesado

        # ── Bloque 3: APVI (campos 40-44) ─────────────────────────────────────
        f[39] = "0"; f[40] = ""; f[41] = "0"; f[42] = "0"; f[43] = "0"

        # ── Bloque 4: APVC (campos 45-49) ─────────────────────────────────────
        f[44] = "0"; f[45] = ""; f[46] = "0"; f[47] = "0"; f[48] = "0"

        # ── Bloque 5: Afiliado Voluntario (campos 50-61) ──────────────────────
        f[49] = "0"; f[50] = ""; f[51] = ""; f[52] = ""; f[53] = ""
        f[54] = "0"; f[55] = ""; f[56] = ""; f[57] = "0"
        f[58] = "0"; f[59] = "0"; f[60] = "0"

        # ── Bloque 6: IPS / ISL / FONASA (campos 62-74) ───────────────────────
        # Todos los trabajadores aquí son AFP: Bloque 6 (IPS) va todo en 0.
        # Campo 64 > 0 hace que Previred los trate como IPS y exija ISL ex-INP.
        f[61] = "0"              # 62 Código Ex-Caja Régimen
        f[62] = "0"              # 63 Tasa Cotización Ex-Caja
        f[63] = "0"              # 64 Renta Imponible IPS (0 para AFP)
        f[64] = "0"              # 65 Cotización Obligatoria IPS
        f[65] = "0"              # 66 Renta Imponible Desahucio
        f[66] = "0"              # 67 Cotización Desahucio
        f[67] = "0"              # 68 Código Ex-Caja Desahucio
        f[68] = "0"              # 69 Tasa Cotización Desahucio
        # Campo 70: Cotización FONASA — solo para AFP+FONASA (no IPS)
        f[69] = str(cot_salud) if is_fonasa else "0"
        f[70] = "0"              # 71 Cotización ISL ex-INP (0 para AFP)
        f[71] = "0"              # 72 Bonificación Ley 15.386
        f[72] = "0"              # 73 Descuento cargas IPS
        f[73] = "0"              # 74 Bonos Gobierno

        # ── Bloque 7: Salud (campos 75-82) ────────────────────────────────────
        # FONASA: código 07, cotización en campo 70 (arriba), campo 80 = 0
        # Isapre: código Tabla N°16, cotización en campo 80
        if is_fonasa:
            inst_code = "07"
            cot_campo80 = "0"
        else:
            inst_code = (
                ISAPRE_CODES.get(isapre_name_key)
                or ISAPRE_CODES.get(isapre_name_key.replace(" ", ""))
                or "02"  # Consalud por defecto si no se encuentra nombre
            )
            cot_campo80 = str(cot_salud)
        f[74] = inst_code        # 75 Código institución salud (Tabla N°16 Previred)
        f[75] = ""               # 76 N° FUN (solo Isapre)
        f[76] = str(renta_imp)   # 77 Renta Imponible Salud
        f[77] = "0"              # 78 Moneda Plan Isapre
        f[78] = "0"              # 79 Cotización Pactada Isapre
        f[79] = cot_campo80      # 80 Cotización Obligatoria Isapre (0 para FONASA)
        f[80] = "0"              # 81 Cotización Adicional Voluntaria
        f[81] = "0"              # 82 GES

        # ── Bloque 8: CCAF (campos 83-95) ─────────────────────────────────────
        for i in range(82, 92):
            f[i] = "0"
        f[92] = "1"              # 93 Tipo Jornada (1=Completa, 2=Parcial)
        f[93] = str(exp_vida)    # 94 Cotización Expectativa de Vida (0.9%)
        f[94] = str(crp)         # 95 CRP — Cotización con Rentabilidad Protegida (empleador)

        # ── Bloque 9: Mutualidad (campos 96-99) ───────────────────────────────
        # Código 00 = empresa paga ISL directo fuera de Previred.
        # Para código 00 Previred no requiere ni renta ni cotización (todos 0).
        # El pago de ISL se realiza directamente a SUSESO/ISL.
        f[95] = "0"   # 96 Código Mutualidad: 0 = sin mutual (ISL directo)
        f[96] = "0"   # 97 Renta Imponible Mutual (0 para código 00)
        f[97] = "0"   # 98 Cotización Accidente Trabajo Mutual (0 para código 00)
        f[98] = "0"   # 99 Sucursal pago Mutual

        # ── Bloque 10: Seguro Cesantía (campos 100-102) ───────────────────────
        f[99]  = str(renta_imp)       # 100 Renta Imponible SC
        f[100] = str(cot_cesantia)    # 101 Aporte Trabajador SC
        f[101] = str(afc_emp)         # 102 Aporte Empleador SC

        # ── Bloque 11-12: Subsidio / Centro costos (103-105) ──────────────────
        f[102] = "0"; f[103] = ""; f[104] = ""

        lines.append(";".join(f))

    with open(filepath, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    return filepath


def generate_dj1887_excel(year: int, entries: list, employees: Dict, company=None) -> str:
    """
    Generate Declaración Jurada Anual F1887 (SII).
    Resumen anual de rentas e impuestos retenidos por empleador.
    """
    filename = f"DJ1887_{year}_{uuid.uuid4().hex[:8]}.xlsx"
    filepath = os.path.join(UPLOAD_DIR, filename)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"DJ1887 {year}"

    # Header
    ws.merge_cells("A1:L1")
    ws["A1"] = f"DECLARACIÓN JURADA ANUAL F1887 - AÑO TRIBUTARIO {year+1} (RENTAS AÑO {year})"
    ws["A1"].font = Font(bold=True, size=12, color=BLUE)
    ws["A1"].alignment = Alignment(horizontal="center")

    ws.merge_cells("A2:L2")
    dj_co_name = (company.name if company and company.name else settings.COMPANY_NAME)
    dj_co_rut = (company.rut if company and company.rut else settings.COMPANY_RUT)
    ws["A2"] = f"{dj_co_name} — RUT: {dj_co_rut}"
    ws["A2"].alignment = Alignment(horizontal="center")

    headers = [
        "RUT Trabajador", "Apellido Paterno", "Apellido Materno", "Nombres",
        "Renta Bruta Anual", "Cotiz. Previsionales", "Renta Tributable Anual",
        "IUSC Retenido Anual", "Crédito por ISC", "Renta Exenta",
        "Meses Trabajados", "Observaciones",
    ]

    font, fill, align = _header_style(wb, GREEN)
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=3, column=col, value=header)
        cell.font = font
        cell.fill = fill
        cell.alignment = align

    # Aggregate by employee
    employee_totals: Dict[int, dict] = {}
    for entry in entries:
        eid = entry.employee_id
        if eid not in employee_totals:
            employee_totals[eid] = {
                "renta_bruta": 0, "cotiz_prev": 0,
                "renta_tributable": 0, "iusc": 0, "meses": 0,
            }
        et = employee_totals[eid]
        et["renta_bruta"] += float(entry.total_haberes)
        et["cotiz_prev"] += float(entry.total_descuentos_previsionales)
        et["renta_tributable"] += float(entry.remuneracion_tributable)
        et["iusc"] += float(entry.impuesto_unico)
        et["meses"] += 1

    row = 4
    for eid, totals in employee_totals.items():
        emp = employees.get(eid)
        if not emp:
            continue

        rut_clean = emp.rut.replace(".", "")
        ws.cell(row=row, column=1, value=rut_clean)
        ws.cell(row=row, column=2, value=emp.last_name)
        ws.cell(row=row, column=3, value=emp.second_last_name or "")
        ws.cell(row=row, column=4, value=emp.first_name)
        ws.cell(row=row, column=5, value=int(totals["renta_bruta"]))
        ws.cell(row=row, column=6, value=int(totals["cotiz_prev"]))
        ws.cell(row=row, column=7, value=int(totals["renta_tributable"]))
        ws.cell(row=row, column=8, value=int(totals["iusc"]))
        ws.cell(row=row, column=9, value=0)  # Crédito ISC (simplificado)
        ws.cell(row=row, column=10, value=0)  # Renta exenta
        ws.cell(row=row, column=11, value=totals["meses"])
        ws.cell(row=row, column=12, value="")

        for col in [5, 6, 7, 8, 9, 10]:
            ws.cell(row=row, column=col).number_format = '#,##0'

        fill_color = LIGHT_GREEN if row % 2 == 0 else WHITE
        for col in range(1, len(headers) + 1):
            ws.cell(row=row, column=col).fill = PatternFill("solid", fgColor=fill_color)

        row += 1

    # Totals
    total_row = row
    ws.cell(row=total_row, column=1, value="TOTALES").font = Font(bold=True)
    for col in [5, 6, 7, 8]:
        col_letter = get_column_letter(col)
        ws.cell(row=total_row, column=col, value=f"=SUM({col_letter}4:{col_letter}{total_row-1})")
        ws.cell(row=total_row, column=col).number_format = '#,##0'
        ws.cell(row=total_row, column=col).font = Font(bold=True)
        ws.cell(row=total_row, column=col).fill = PatternFill("solid", fgColor=LIGHT_GREEN)

    # Column widths
    col_widths = [14, 18, 18, 18, 20, 20, 20, 18, 16, 14, 14, 20]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.freeze_panes = "A4"

    # Notes sheet
    ws3 = wb.create_sheet("Instrucciones")
    notes = [
        ("Declaración Jurada F1887", ""),
        ("", ""),
        ("Esta planilla genera el resumen anual para declarar ante el SII.", ""),
        ("El archivo final debe ser importado al portal del SII (www.sii.cl).", ""),
        ("Año Tributario:", year + 1),
        ("Rentas devengadas en:", year),
        ("Empresa:", dj_co_name),
        ("RUT Empresa:", dj_co_rut),
        ("Generado:", datetime.now().strftime("%d/%m/%Y %H:%M")),
        ("", ""),
        ("IMPORTANTE: Verificar los valores antes de declarar al SII.", ""),
        ("Las cotizaciones previsionales incluyen AFP, Salud y Cesantía.", ""),
    ]
    for i, (label, value) in enumerate(notes, 1):
        ws3.cell(row=i, column=1, value=label)
        if label and not value:
            ws3.cell(row=i, column=1).font = Font(bold=(i == 1))
        if value:
            ws3.cell(row=i, column=2, value=value)

    wb.save(filepath)
    return filepath


def generate_dj1887_csv(year: int, entries: list, employees: Dict, company=None) -> str:
    """
    Generate DJ F1887 CSV for SII upload.

    Format rules (SII specifications):
    - Semicolon separator, no thousand separators, no decimals
    - RUT without dots, hyphen kept, K uppercase
    - Empty numeric cells → 0 (months column stays as number)
    - Data starts at line 6 (5 header lines before)
    - 12 columns per row, identical separator count throughout

    Columns:
    1  RUT Trabajador        2  Apellido Paterno     3  Apellido Materno
    4  Nombres               5  Renta Bruta Anual    6  Cotiz. Previsionales
    7  Renta Tributable      8  IUSC Retenido        9  Crédito por ISC
    10 Renta Exenta          11 Meses Trabajados     12 Observaciones
    """
    filename = f"DJ1887_{year}_{uuid.uuid4().hex[:8]}.csv"
    filepath = os.path.join(UPLOAD_DIR, filename)

    co_rut = (company.rut if company and company.rut else settings.COMPANY_RUT)
    co_name = (company.name if company and company.name else settings.COMPANY_NAME)
    co_rut_clean = co_rut.replace(".", "").upper()

    SEP = ";"
    NUM_COLS = 12

    def blank_row():
        return SEP * (NUM_COLS - 1)

    def fmt_rut(rut: str) -> str:
        return rut.replace(".", "").upper()

    # Aggregate totals per employee across all runs of the year
    employee_totals: Dict[int, dict] = {}
    for entry in entries:
        eid = entry.employee_id
        if eid not in employee_totals:
            employee_totals[eid] = {
                "renta_bruta": 0.0, "cotiz_prev": 0.0,
                "renta_tributable": 0.0, "iusc": 0.0, "meses": 0,
            }
        et = employee_totals[eid]
        et["renta_bruta"] += float(entry.total_haberes)
        et["cotiz_prev"] += float(entry.total_descuentos_previsionales)
        et["renta_tributable"] += float(entry.remuneracion_tributable)
        et["iusc"] += float(entry.impuesto_unico)
        et["meses"] += 1

    lines: list = []

    # Lines 1-5: blank rows (SII does not require headers, data starts at line 6)
    for _ in range(5):
        lines.append(blank_row())

    # Data rows from line 6
    for eid, totals in employee_totals.items():
        emp = employees.get(eid)
        if not emp:
            continue

        row = SEP.join([
            fmt_rut(emp.rut),
            emp.last_name or "0",
            emp.second_last_name or "0",
            emp.first_name or "0",
            str(int(round(totals["renta_bruta"]))),
            str(int(round(totals["cotiz_prev"]))),
            str(int(round(totals["renta_tributable"]))),
            str(int(round(totals["iusc"]))),
            "0",                        # Credito ISC
            "0",                        # Renta exenta zona extrema
            str(int(totals["meses"])),
            "0",                        # Observaciones
        ])
        lines.append(row)

    with open(filepath, "w", encoding="iso-8859-1") as fh:
        fh.write("\n".join(lines))

    return filepath


# ─── LRE (Libro de Remuneraciones Electrónico) ─────────────────────────────────

LRE_HEADERS = [
    "RUT Trabajador", "Nombre", "Apellido Paterno", "Apellido Materno",
    "Período (AAAAMM)", "Días Trabajados", "Sueldo Base",
    "Horas Extras Monto", "Bonos Afectos", "Bonos No Afectos",
    "Total Haberes Imponibles", "Total Haberes No Imponibles", "Total Haberes",
    "Cotización AFP", "Cotización Salud", "Cotización AFC Trabajador",
    "IUSC", "Otros Descuentos", "Total Descuentos",
    "Alcance Líquido",
    "Cotización AFC Empleador", "SIS (Empleador)", "Mutual/ACHS",
    "Total Costo Empresa",
    "Factor Actualización", "Renta Actualizada",
]


def generate_lre_excel(
    year: int,
    runs: list,
    entries_by_run: Dict,
    employees: Dict,
    company=None,
    correction_factors: Dict = None,
) -> str:
    """
    Generate LRE Excel: 1 row per employee per month, up to 12 rows per year.
    correction_factors: {month_number: factor} e.g. {6: 1.0}
    """
    if correction_factors is None:
        correction_factors = {}

    filename = f"lre_{year}_{uuid.uuid4().hex[:8]}.xlsx"
    filepath = os.path.join(UPLOAD_DIR, filename)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"LRE {year}"

    company_name = company.name if company else "Empresa"
    ws.merge_cells("A1:Z1")
    title_cell = ws["A1"]
    title_cell.value = f"LIBRO DE REMUNERACIONES ELECTRÓNICO — {company_name} — AÑO {year}"
    title_cell.font = Font(bold=True, size=11, color=WHITE)
    title_cell.fill = PatternFill("solid", fgColor=BLUE)
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 22

    hfont, hfill, halign = _header_style(wb)
    for col_idx, header in enumerate(LRE_HEADERS, start=1):
        cell = ws.cell(row=2, column=col_idx, value=header)
        cell.font = hfont
        cell.fill = hfill
        cell.alignment = halign
    ws.row_dimensions[2].height = 40
    ws.freeze_panes = "A3"

    sorted_runs = sorted(runs, key=lambda r: (r.period_year, r.period_month))

    data_row = 3
    alt = False
    for run in sorted_runs:
        month = run.period_month
        factor = correction_factors.get(month, 1.0)
        entries = entries_by_run.get(run.id, [])
        row_fill = PatternFill("solid", fgColor=LIGHT_BLUE if alt else WHITE)
        alt = not alt

        for entry in entries:
            emp = employees.get(entry.employee_id)
            if not emp:
                continue

            periodo = f"{run.period_year}{month:02d}"
            sueldo_base = float(entry.base_salary or 0)
            horas_extras = float((entry.overtime_weekday or 0) + (entry.overtime_sunday or 0))
            bonos_afectos = float((entry.gratificacion or 0))
            bonos_no_afectos = float((entry.bono_colacion or 0) + (entry.bono_movilizacion or 0) + (entry.bono_otros or 0) + (entry.asignacion_familiar or 0))
            total_imponible = float(entry.remuneracion_imponible or 0)
            total_no_imponible = bonos_no_afectos
            total_haberes = float(entry.total_haberes or 0)
            afp = float(entry.descuento_afp or 0)
            salud = float(entry.descuento_salud or 0)
            afc_trabajador = float(entry.descuento_cesantia or 0)
            iusc = float(entry.impuesto_unico or 0)
            otros_desc = float((entry.descuento_otros or 0) + (entry.adelanto or 0))
            total_desc = float(entry.total_descuentos_previsionales or 0) + iusc + otros_desc
            liquido = float(entry.liquido_pagar or 0)
            afc_empleador = float(entry.aporte_cesantia_empleador or 0)
            sis = float(entry.aporte_sis or 0)
            mutual = 0.0
            costo_empresa = float(entry.total_costo_empleador or 0)
            renta_act = round(total_imponible * factor)
            dias = int(entry.dias_trabajados or 30)

            values = [
                emp.rut or "",
                emp.first_name or "",
                emp.last_name or "",
                emp.second_last_name or "",
                periodo,
                dias,
                sueldo_base,
                horas_extras,
                bonos_afectos,
                bonos_no_afectos,
                total_imponible,
                total_no_imponible,
                total_haberes,
                afp,
                salud,
                afc_trabajador,
                iusc,
                otros_desc,
                total_desc,
                liquido,
                afc_empleador,
                sis,
                mutual,
                costo_empresa,
                factor,
                renta_act,
            ]

            for col_idx, val in enumerate(values, start=1):
                cell = ws.cell(row=data_row, column=col_idx, value=val)
                cell.fill = row_fill
                cell.alignment = Alignment(
                    horizontal="right" if isinstance(val, (int, float)) else "left",
                    vertical="center",
                )
                if col_idx >= 7 and isinstance(val, float) and col_idx != 25:
                    cell.number_format = '#,##0'
            data_row += 1

    col_widths = [14, 14, 16, 16, 10, 6, 12, 12, 12, 12, 14, 14, 12,
                  12, 12, 12, 10, 12, 12, 12, 14, 10, 10, 14, 8, 14]
    for i, w in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    if data_row > 3:
        ws.cell(row=data_row, column=1, value="TOTAL").font = Font(bold=True)
        for col_idx in range(7, 27):
            col_letter = get_column_letter(col_idx)
            cell = ws.cell(
                row=data_row, column=col_idx,
                value=f"=SUM({col_letter}3:{col_letter}{data_row - 1})",
            )
            cell.font = Font(bold=True)
            cell.fill = PatternFill("solid", fgColor=LIGHT_BLUE)
            cell.number_format = '#,##0'

    wb.save(filepath)
    return filepath
