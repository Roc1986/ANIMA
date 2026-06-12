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

    Field order (Largo Variable por Separador):
    1  RUT trabajador (sin puntos, con guión)
    2  Apellido paterno
    3  Apellido materno
    4  Nombres
    5  Sexo (0=no declarado, 1=M, 2=F)
    6  Fecha nacimiento (DDMMAAAA, "00000000" si no disponible)
    7  Fecha inicio labores (DDMMAAAA)
    8  Código AFP (26=Capital, 28=Cuprum, 33=Habitat, 34=Provida, 35=Planvital, 36=Modelo, 37=Uno)
    9  Renta imponible AFP
    10 Cotización obligatoria AFP trabajador
    11 Cotización voluntaria AFP
    12 Depósito convenido
    13 APV/APVC régimen A
    14 Tipo de línea (0=línea principal)
    15 Código institución salud (7=FONASA)
    16 RUT ISAPRE (0 si FONASA)
    17 Renta imponible salud
    18 Cotización salud trabajador
    19 Cotización adicional ISAPRE
    20 Monto plan ISAPRE (GES)
    21 Cotización AFC trabajador (cesantía)
    22 Cotización AFC empleador
    23 Aporte SIS empleador
    24 Renta bruta (total haberes)
    25 Renta tributable
    26 IUSC
    27 Días trabajados
    28-105 zeros (campos adicionales no aplicables)
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

        hs_raw = str(emp.health_system).split(".")[-1].upper()
        if hs_raw == "FONASA":
            salud_codigo = 7
            rut_isapre = 0
        else:
            isapre_name = str(emp.isapre_name or "").lower()
            salud_codigo = ISAPRE_CODES.get(isapre_name, 8)
            rut_isapre = 0

        nacimiento = _fmt_date(getattr(emp, "birth_date", None)) or "00000000"
        ingreso = _fmt_date(getattr(emp, "hire_date", None)) or "00000000"
        rut = emp.rut.replace(".", "")

        f = [0] * 105

        # Campo 1: Tipo de Nómina (01 = Remuneraciones del mes)
        f[0]  = "01"
        # Identificación trabajador (campos 2-8)
        f[1]  = rut                                    # 2  RUT trabajador
        f[2]  = emp.last_name                          # 3  Apellido paterno
        f[3]  = emp.second_last_name or ""             # 4  Apellido materno
        f[4]  = emp.first_name                         # 5  Nombres
        f[5]  = 0                                      # 6  Sexo
        f[6]  = nacimiento                             # 7  Fecha nacimiento
        f[7]  = ingreso                                # 8  Fecha inicio labores

        # AFP (campos 9-14)
        f[8]  = afp_code                               # 9  Código AFP
        f[9]  = int(float(entry.remuneracion_imponible))  # 10 Renta imponible AFP
        f[10] = int(float(entry.descuento_afp))        # 11 Cotización AFP
        f[11] = 0                                      # 12 Cotización voluntaria AFP
        f[12] = 0                                      # 13 Depósito convenido
        f[13] = 0                                      # 14 Tipo de línea (0=principal)

        # Salud (campos 15-20)
        f[14] = salud_codigo                           # 15 Código institución salud
        f[15] = rut_isapre                             # 16 RUT ISAPRE
        f[16] = int(float(entry.remuneracion_imponible))  # 17 Renta imponible salud
        f[17] = int(float(entry.descuento_salud))      # 18 Cotización salud
        f[18] = 0                                      # 19 Cotización adicional ISAPRE
        f[19] = 0                                      # 20 Monto plan ISAPRE

        # Cesantía y SIS (campos 21-23)
        f[20] = int(float(entry.descuento_cesantia))   # 21 AFC trabajador
        f[21] = int(float(entry.aporte_cesantia_empleador))  # 22 AFC empleador
        f[22] = int(float(entry.aporte_sis))           # 23 SIS empleador

        # Remuneraciones (campos 24-27)
        f[23] = int(float(entry.total_haberes))        # 24 Renta bruta
        f[24] = int(float(entry.remuneracion_tributable))  # 25 Renta tributable
        f[25] = int(float(entry.impuesto_unico))       # 26 IUSC
        f[26] = int(entry.dias_trabajados)             # 27 Días trabajados

        lines.append(";".join(str(v) for v in f))

    with open(filepath, "w", encoding="iso-8859-1") as fh:
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
