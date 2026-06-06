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


def generate_previred_excel(run, entries, employees: Dict) -> str:
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
    ws["A1"] = f"ARCHIVO PREVIRED - {settings.COMPANY_NAME} - RUT {settings.COMPANY_RUT} - Período {run.period_month:02d}/{run.period_year}"
    ws["A1"].font = Font(bold=True, size=11, color=BLUE)
    ws["A1"].alignment = Alignment(horizontal="center")

    headers = [
        "RUT Trabajador", "Nombre", "Apellido Paterno", "Apellido Materno",
        "AFP", "Renta Imponible AFP", "Cotización AFP", "Cotización Voluntaria AFP",
        "Sistema Salud", "Renta Imponible Salud", "Cotización Salud",
        "Seg. Cesantía Trabajador", "Seg. Cesantía Empleador",
        "SIS Empleador", "Días Trabajados", "Renta Bruta",
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

        # Clean RUT (remove dots, keep dash)
        rut_clean = emp.rut.replace(".", "")
        base_afp = min(float(entry.remuneracion_imponible), float(entry.breakdown.get("tope_imponible_afp_clp", 9999999) if entry.breakdown else 9999999))

        ws.cell(row=row, column=1, value=rut_clean)
        ws.cell(row=row, column=2, value=emp.first_name)
        ws.cell(row=row, column=3, value=emp.last_name)
        ws.cell(row=row, column=4, value=emp.second_last_name or "")
        ws.cell(row=row, column=5, value=entry.afp_name or str(emp.afp))
        ws.cell(row=row, column=6, value=int(base_afp))
        ws.cell(row=row, column=7, value=int(float(entry.descuento_afp)))
        ws.cell(row=row, column=8, value=0)  # Cotización voluntaria
        ws.cell(row=row, column=9, value=entry.health_system or str(emp.health_system))
        ws.cell(row=row, column=10, value=int(float(entry.remuneracion_imponible)))
        ws.cell(row=row, column=11, value=int(float(entry.descuento_salud)))
        ws.cell(row=row, column=12, value=int(float(entry.descuento_cesantia)))
        ws.cell(row=row, column=13, value=int(float(entry.aporte_cesantia_empleador)))
        ws.cell(row=row, column=14, value=int(float(entry.aporte_sis)))
        ws.cell(row=row, column=15, value=int(entry.dias_trabajados))
        ws.cell(row=row, column=16, value=int(float(entry.total_haberes)))
        ws.cell(row=row, column=17, value=int(float(entry.remuneracion_tributable)))
        ws.cell(row=row, column=18, value=int(float(entry.impuesto_unico)))

        # Format money columns
        for col in [6, 7, 10, 11, 12, 13, 14, 16, 17, 18]:
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

    for col in [6, 7, 10, 11, 12, 13, 14, 16, 17, 18]:
        col_letter = get_column_letter(col)
        ws.cell(row=total_row, column=col, value=f"=SUM({col_letter}3:{col_letter}{total_row-1})")
        ws.cell(row=total_row, column=col).number_format = '#,##0'
        ws.cell(row=total_row, column=col).font = Font(bold=True)
        ws.cell(row=total_row, column=col).fill = PatternFill("solid", fgColor=LIGHT_BLUE)

    # Column widths
    col_widths = [14, 15, 18, 18, 10, 18, 16, 18, 10, 20, 16, 18, 18, 14, 12, 14, 16, 14]
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
        ("Empresa", settings.COMPANY_NAME),
        ("RUT Empresa", settings.COMPANY_RUT),
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
    "habitat":   33,
    "provida":   34,
    "capital":   26,
    "cuprum":    28,
    "planvital": 35,
    "modelo":    36,
    "uno":       37,
}

ISAPRE_CODES = {
    "banmedica":   2,
    "colmena":     5,
    "consalud":    6,
    "cruz blanca": 3,
    "masvida":     9,
    "nueva masvida": 9,
    "vida tres":   10,
    "esencial":    11,
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
    Generate Previred 'Estándar por Separador 105 campos' text file.
    Each row = 105 fields separated by semicolons.
    """
    filename = f"previred_{run.period_year}_{run.period_month:02d}_{uuid.uuid4().hex[:8]}.txt"
    filepath = os.path.join(UPLOAD_DIR, filename)

    lines = []
    for entry in entries:
        emp = employees.get(entry.employee_id)
        if not emp:
            continue

        afp_raw = str(emp.afp).split(".")[-1].lower()
        afp_code = AFP_CODES.get(afp_raw, 33)
        renta_imp_afp = int(float(entry.remuneracion_imponible))
        cot_afp = int(float(entry.descuento_afp))

        hs_raw = str(emp.health_system).split(".")[-1].upper()
        if hs_raw == "FONASA":
            salud_codigo = 7
            rut_isapre = 0
        else:
            isapre_name = str(emp.isapre_name or "").lower()
            salud_codigo = ISAPRE_CODES.get(isapre_name, 8)
            rut_isapre = 0
        cot_salud = int(float(entry.descuento_salud))

        ces_trab = int(float(entry.descuento_cesantia))
        ces_emp = int(float(entry.aporte_cesantia_empleador))
        sis = int(float(entry.aporte_sis))

        renta_bruta = int(float(entry.total_haberes))
        renta_trib = int(float(entry.remuneracion_tributable))
        iusc = int(float(entry.impuesto_unico))

        nacimiento = _fmt_date(getattr(emp, "birth_date", None))
        ingreso = _fmt_date(getattr(emp, "hire_date", None))
        rut = emp.rut.replace(".", "")

        # 105 fields — unused fields = 0
        f = [0] * 105

        f[0]  = rut
        f[1]  = emp.first_name
        f[2]  = emp.last_name
        f[3]  = emp.second_last_name or ""
        f[4]  = 0                            # sexo (0=no declarado)
        f[5]  = nacimiento
        f[6]  = int(entry.dias_trabajados)
        f[7]  = afp_code
        f[8]  = renta_imp_afp
        f[9]  = cot_afp
        f[10] = 0                            # cotiz voluntaria AFP
        f[11] = 0                            # depósito convenido
        f[12] = 0                            # APV A
        f[13] = 0                            # APV B
        f[14] = salud_codigo
        f[15] = rut_isapre
        f[16] = renta_imp_afp               # renta imponible salud = misma base
        f[17] = cot_salud
        f[18] = 0                            # cotiz adicional ISAPRE
        f[19] = 0                            # ISAPRE GES
        f[20] = ces_trab
        f[21] = ces_emp
        f[22] = sis
        f[23] = renta_bruta
        f[24] = renta_trib
        f[25] = iusc
        f[26] = ingreso

        lines.append(";".join(str(v) for v in f))

    with open(filepath, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    return filepath


def generate_dj1887_excel(year: int, entries: list, employees: Dict) -> str:
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
    ws["A2"] = f"{settings.COMPANY_NAME} — RUT: {settings.COMPANY_RUT}"
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
        ("Empresa:", settings.COMPANY_NAME),
        ("RUT Empresa:", settings.COMPANY_RUT),
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
