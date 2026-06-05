"""
PDF Generator using ReportLab for Chilean payroll documents.
Generates:
  - Liquidación de sueldo (payslip)
  - Libro de remuneraciones mensual
"""

import os
import uuid
from datetime import datetime
from typing import Dict

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas

from config import settings

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MONTH_NAMES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}

BLUE = colors.HexColor("#1e3a5f")
LIGHT_BLUE = colors.HexColor("#e8f0fe")
GREEN = colors.HexColor("#2e7d32")
GRAY = colors.HexColor("#f5f5f5")
DARK_GRAY = colors.HexColor("#616161")


def _fmt_clp(value) -> str:
    """Format as Chilean peso."""
    try:
        v = int(float(value))
        return f"${v:,}".replace(",", ".")
    except Exception:
        return str(value)


def generate_liquidacion_pdf(entry, employee, payroll_run) -> str:
    """Generate a complete liquidación de sueldo PDF."""
    filename = f"liquidacion_{employee.rut}_{payroll_run.period_year}_{payroll_run.period_month:02d}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        leftMargin=1.5*cm,
        rightMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=14, textColor=BLUE, alignment=TA_CENTER, spaceAfter=4)
    sub_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=9, textColor=DARK_GRAY, alignment=TA_CENTER)
    label_style = ParagraphStyle("Label", parent=styles["Normal"], fontSize=8, textColor=DARK_GRAY)
    value_style = ParagraphStyle("Value", parent=styles["Normal"], fontSize=9, fontName="Helvetica-Bold")
    small_style = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8)

    month_name = MONTH_NAMES.get(payroll_run.period_month, str(payroll_run.period_month))

    elements = []

    # Header - Company info
    header_data = [
        [
            Paragraph(f"<b>{settings.COMPANY_NAME}</b>", ParagraphStyle("CH", fontSize=13, textColor=BLUE, fontName="Helvetica-Bold")),
            Paragraph(f"<b>LIQUIDACIÓN DE SUELDO</b>", ParagraphStyle("LH", fontSize=13, textColor=BLUE, alignment=TA_RIGHT, fontName="Helvetica-Bold")),
        ],
        [
            Paragraph(f"RUT: {settings.COMPANY_RUT}<br/>{settings.COMPANY_ADDRESS}<br/>{settings.COMPANY_PHONE}", small_style),
            Paragraph(f"Período: {month_name} {payroll_run.period_year}<br/>Fecha pago: {payroll_run.payment_date or 'Por definir'}", ParagraphStyle("RH", fontSize=9, alignment=TA_RIGHT)),
        ],
    ]
    header_table = Table(header_data, colWidths=[10*cm, 8*cm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=2, color=BLUE, spaceAfter=8))

    # Employee info block
    full_name = f"{employee.first_name} {employee.last_name}"
    if employee.second_last_name:
        full_name += f" {employee.second_last_name}"

    emp_data = [
        ["Nombre:", full_name, "RUT:", employee.rut],
        ["Cargo:", employee.position, "Departamento:", employee.department or "—"],
        ["AFP:", entry.afp_name or employee.afp, "Salud:", entry.health_system or employee.health_system],
        ["Tipo Contrato:", entry.contract_type or "indefinido", "Días Trabajados:", str(entry.dias_trabajados)],
        ["Fecha Ingreso:", str(employee.hire_date), "Banco:", employee.bank_name or "—"],
    ]
    emp_table = Table(emp_data, colWidths=[3*cm, 7*cm, 3*cm, 5*cm])
    emp_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), DARK_GRAY),
        ("TEXTCOLOR", (2, 0), (2, -1), DARK_GRAY),
        ("BACKGROUND", (0, 0), (-1, -1), GRAY),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [GRAY, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(emp_table)
    elements.append(Spacer(1, 8))

    # Payroll detail in two columns: Haberes | Descuentos
    def section_header(title: str, color=BLUE):
        return Paragraph(f"<b>{title}</b>", ParagraphStyle("SH", fontSize=9, textColor=colors.white,
                                                            backColor=color, fontName="Helvetica-Bold",
                                                            leftIndent=4, rightIndent=4))

    haberes_rows = [
        [section_header("HABERES"), section_header("MONTO")],
        ["Sueldo Base", _fmt_clp(entry.base_salary)],
        ["Gratificación Legal", _fmt_clp(entry.gratificacion)],
    ]
    if float(entry.overtime_weekday) > 0:
        haberes_rows.append(["Horas Extra Días Hábiles (50%)", _fmt_clp(entry.overtime_weekday)])
    if float(entry.overtime_sunday) > 0:
        haberes_rows.append(["Horas Extra Dom/Festivos (100%)", _fmt_clp(entry.overtime_sunday)])
    if float(entry.bono_otros) > 0:
        haberes_rows.append(["Otros Bonos Imponibles", _fmt_clp(entry.bono_otros)])
    if float(entry.bono_colacion) > 0:
        haberes_rows.append(["Colación (no imponible)", _fmt_clp(entry.bono_colacion)])
    if float(entry.bono_movilizacion) > 0:
        haberes_rows.append(["Movilización (no imponible)", _fmt_clp(entry.bono_movilizacion)])
    if float(entry.asignacion_familiar) > 0:
        haberes_rows.append(["Asignación Familiar", _fmt_clp(entry.asignacion_familiar)])
    haberes_rows.append(["Remuneración Imponible", _fmt_clp(entry.remuneracion_imponible)])
    haberes_rows.append([
        Paragraph("<b>TOTAL HABERES</b>", ParagraphStyle("TH", fontSize=9, fontName="Helvetica-Bold")),
        Paragraph(f"<b>{_fmt_clp(entry.total_haberes)}</b>", ParagraphStyle("TH", fontSize=9, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
    ])

    descuentos_rows = [
        [section_header("DESCUENTOS", GREEN), section_header("MONTO", GREEN)],
        [f"AFP {entry.afp_name} ({float(entry.afp_rate or 0)*100:.2f}%)", _fmt_clp(entry.descuento_afp)],
        [f"Salud ({entry.health_system}) 7%", _fmt_clp(entry.descuento_salud)],
        ["Seg. Cesantía Trabajador (0.6%)", _fmt_clp(entry.descuento_cesantia)],
        ["Total Prev. Legales", _fmt_clp(entry.total_descuentos_previsionales)],
        ["Renta Tributable", _fmt_clp(entry.remuneracion_tributable)],
        ["Impuesto Único 2ª Cat. (IUSC)", _fmt_clp(entry.impuesto_unico)],
    ]
    if float(entry.descuento_otros) > 0:
        descuentos_rows.append(["Otros Descuentos", _fmt_clp(entry.descuento_otros)])
    if float(entry.adelanto) > 0:
        descuentos_rows.append(["Adelanto", _fmt_clp(entry.adelanto)])
    descuentos_rows.append([
        Paragraph("<b>TOTAL DESCUENTOS</b>", ParagraphStyle("TDL", fontSize=9, fontName="Helvetica-Bold")),
        Paragraph(f"<b>{_fmt_clp(float(entry.total_descuentos_previsionales) + float(entry.impuesto_unico) + float(entry.descuento_otros) + float(entry.adelanto))}</b>",
                  ParagraphStyle("TDR", fontSize=9, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
    ])

    def style_detail_table(rows, color=BLUE):
        t = Table(rows, colWidths=[7.5*cm, 3*cm])
        style = [
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, GRAY]),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("BACKGROUND", (0, -1), (-1, -1), LIGHT_BLUE),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ]
        t.setStyle(TableStyle(style))
        return t

    hab_table = style_detail_table(haberes_rows, BLUE)
    desc_table = style_detail_table(descuentos_rows, GREEN)

    # Side by side
    combined = Table([[hab_table, desc_table]], colWidths=[10.5*cm, 10.5*cm])
    combined.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (1, 0), (1, -1), 8),
    ]))
    elements.append(combined)
    elements.append(Spacer(1, 10))

    # Aportes empleador box
    employer_data = [
        [section_header("APORTES EMPLEADOR (COSTO EMPRESA)", DARK_GRAY), ""],
        ["Seguro Cesantía Empleador", _fmt_clp(entry.aporte_cesantia_empleador)],
        ["SIS (Seg. Invalidez y Sobrevivencia 1.49%)", _fmt_clp(entry.aporte_sis)],
        [Paragraph("<b>TOTAL COSTO EMPRESA</b>", ParagraphStyle("TC", fontSize=9, fontName="Helvetica-Bold")),
         Paragraph(f"<b>{_fmt_clp(entry.total_costo_empleador)}</b>", ParagraphStyle("TC", fontSize=9, fontName="Helvetica-Bold", alignment=TA_RIGHT))],
    ]
    emp_cost_table = Table(employer_data, colWidths=[14*cm, 4*cm])
    emp_cost_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("SPAN", (0, 0), (-1, 0)),
        ("BACKGROUND", (0, -1), (-1, -1), LIGHT_BLUE),
    ]))
    elements.append(emp_cost_table)
    elements.append(Spacer(1, 10))

    # Liquido a pagar - big box
    liquido_data = [
        [
            Paragraph("LÍQUIDO A PAGAR", ParagraphStyle("LP", fontSize=16, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_CENTER)),
            Paragraph(_fmt_clp(entry.liquido_pagar), ParagraphStyle("LV", fontSize=18, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_CENTER)),
        ]
    ]
    liq_table = Table(liquido_data, colWidths=[9*cm, 9*cm])
    liq_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(liq_table)
    elements.append(Spacer(1, 20))

    # UF/UTM/IMM reference
    if entry.breakdown:
        bd = entry.breakdown
        ref_data = [
            ["Valores de Referencia", "", "", ""],
            [f"UF: {_fmt_clp(bd.get('uf_value', 0))}", f"UTM: {_fmt_clp(bd.get('utm_value', 0))}", f"IMM: {_fmt_clp(bd.get('imm_value', 0))}", f"Renta en UTM: {bd.get('renta_en_utm', 0):.3f}"],
        ]
        ref_table = Table(ref_data, colWidths=[4.5*cm, 4.5*cm, 4.5*cm, 4.5*cm])
        ref_table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("TEXTCOLOR", (0, 0), (-1, -1), DARK_GRAY),
            ("BACKGROUND", (0, 0), (-1, 0), GRAY),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("SPAN", (0, 0), (-1, 0)),
        ]))
        elements.append(ref_table)
        elements.append(Spacer(1, 10))

    # Signature lines
    sig_data = [
        ["_______________________________", "_______________________________"],
        ["Firma Empleador", "Firma Trabajador"],
        [settings.COMPANY_NAME, full_name],
    ]
    sig_table = Table(sig_data, colWidths=[9*cm, 9*cm])
    sig_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("TEXTCOLOR", (0, 1), (-1, 1), DARK_GRAY),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))
    elements.append(sig_table)

    # Footer
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    elements.append(Paragraph(
        f"Generado por ANIMA HR | {datetime.now().strftime('%d/%m/%Y %H:%M')} | Documento no válido sin firma",
        ParagraphStyle("Footer", fontSize=6, textColor=DARK_GRAY, alignment=TA_CENTER)
    ))

    doc.build(elements)
    return filepath


def generate_libro_remuneraciones_pdf(run, entries, employees: Dict) -> str:
    """Generate monthly libro de remuneraciones."""
    filename = f"libro_rem_{run.period_year}_{run.period_month:02d}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)

    month_name = MONTH_NAMES.get(run.period_month, str(run.period_month))

    doc = SimpleDocTemplate(filepath, pagesize=A4, leftMargin=1*cm, rightMargin=1*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)

    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph(
        f"<b>LIBRO DE REMUNERACIONES</b>",
        ParagraphStyle("T", fontSize=14, fontName="Helvetica-Bold", textColor=BLUE, alignment=TA_CENTER)
    ))
    elements.append(Paragraph(
        f"{settings.COMPANY_NAME} — RUT {settings.COMPANY_RUT}",
        ParagraphStyle("S", fontSize=10, alignment=TA_CENTER, textColor=DARK_GRAY)
    ))
    elements.append(Paragraph(
        f"Período: {month_name} {run.period_year}",
        ParagraphStyle("P", fontSize=10, alignment=TA_CENTER)
    ))
    elements.append(Spacer(1, 10))

    # Table header
    headers = [
        "RUT", "Nombre", "Cargo",
        "S.Base", "Gratif.", "HH.EE", "Otros\nHab.",
        "Rem.\nImp.", "AFP", "Salud", "Ces.\nTrab.",
        "IUSC", "Tot.\nDesc.", "Líquido"
    ]

    data = [headers]
    totals = {k: 0 for k in ["base", "gratif", "hhee", "otros_hab", "imponible",
                               "afp", "salud", "ces", "iusc", "desc", "liquido"]}

    for entry in entries:
        emp = employees.get(entry.employee_id)
        if not emp:
            continue
        name = f"{emp.first_name} {emp.last_name}"
        hhee = float(entry.overtime_weekday) + float(entry.overtime_sunday)
        otros = float(entry.bono_colacion) + float(entry.bono_movilizacion) + float(entry.bono_otros) + float(entry.asignacion_familiar)
        total_desc = (float(entry.total_descuentos_previsionales) + float(entry.impuesto_unico) +
                      float(entry.descuento_otros) + float(entry.adelanto))

        row = [
            emp.rut, name[:22], emp.position[:15],
            _fmt_clp(entry.base_salary), _fmt_clp(entry.gratificacion),
            _fmt_clp(hhee), _fmt_clp(otros),
            _fmt_clp(entry.remuneracion_imponible),
            _fmt_clp(entry.descuento_afp), _fmt_clp(entry.descuento_salud),
            _fmt_clp(entry.descuento_cesantia), _fmt_clp(entry.impuesto_unico),
            _fmt_clp(total_desc), _fmt_clp(entry.liquido_pagar),
        ]
        data.append(row)

        totals["base"] += float(entry.base_salary)
        totals["gratif"] += float(entry.gratificacion)
        totals["hhee"] += hhee
        totals["otros_hab"] += otros
        totals["imponible"] += float(entry.remuneracion_imponible)
        totals["afp"] += float(entry.descuento_afp)
        totals["salud"] += float(entry.descuento_salud)
        totals["ces"] += float(entry.descuento_cesantia)
        totals["iusc"] += float(entry.impuesto_unico)
        totals["desc"] += total_desc
        totals["liquido"] += float(entry.liquido_pagar)

    # Totals row
    data.append([
        "", "TOTALES", "",
        _fmt_clp(totals["base"]), _fmt_clp(totals["gratif"]),
        _fmt_clp(totals["hhee"]), _fmt_clp(totals["otros_hab"]),
        _fmt_clp(totals["imponible"]),
        _fmt_clp(totals["afp"]), _fmt_clp(totals["salud"]),
        _fmt_clp(totals["ces"]), _fmt_clp(totals["iusc"]),
        _fmt_clp(totals["desc"]), _fmt_clp(totals["liquido"]),
    ])

    col_widths = [2.2*cm, 4.5*cm, 3*cm, 2.2*cm, 2.2*cm, 2*cm, 2*cm,
                  2.3*cm, 2.2*cm, 2.2*cm, 2*cm, 2.2*cm, 2.2*cm, 2.3*cm]

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, -1), (-1, -1), LIGHT_BLUE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, GRAY]),
        ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(table)

    elements.append(Spacer(1, 20))
    elements.append(Paragraph(
        f"Total empleados: {len(entries)} | UF: {_fmt_clp(run.uf_value)} | UTM: {_fmt_clp(run.utm_value)} | IMM: {_fmt_clp(run.imm_value)}",
        ParagraphStyle("F", fontSize=7, textColor=DARK_GRAY)
    ))
    elements.append(Paragraph(
        f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')} | ANIMA HR",
        ParagraphStyle("F2", fontSize=7, textColor=DARK_GRAY, alignment=TA_RIGHT)
    ))

    doc.build(elements)
    return filepath
