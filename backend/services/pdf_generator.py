"""
PDF Generator using ReportLab for Chilean payroll documents.
Generates:
  - Liquidación de sueldo (payslip)
  - Libro de remuneraciones mensual
  - Carta de amonestación
  - Finiquito
"""

import os
import uuid
from datetime import datetime, date
from typing import Dict, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, A3, letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    HRFlowable, KeepTogether, Image
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
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


def _fmt_rut(rut: str) -> str:
    """Format RUT as 12.345.678-9."""
    if not rut:
        return rut
    clean = rut.replace(".", "").replace("-", "").upper()
    if len(clean) < 2:
        return rut
    body = clean[:-1]
    dv = clean[-1]
    formatted = ""
    for i, ch in enumerate(reversed(body)):
        if i > 0 and i % 3 == 0:
            formatted = "." + formatted
        formatted = ch + formatted
    return f"{formatted}-{dv}"


def _fmt_date_cl(iso_date: str) -> str:
    """Format ISO date YYYY-MM-DD as DD/MM/YYYY."""
    if not iso_date:
        return iso_date
    try:
        parts = str(iso_date).split("-")
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0]}"
    except Exception:
        pass
    return str(iso_date)


def generate_liquidacion_pdf(entry, employee, payroll_run, company=None) -> str:
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

    # Company data — use company object if available, fallback to settings
    co_name = (company.name if company and company.name else settings.COMPANY_NAME)
    co_rut = (company.rut if company and company.rut else settings.COMPANY_RUT)
    co_address = (company.address if company and getattr(company, 'address', None) else getattr(settings, 'COMPANY_ADDRESS', 'Santiago, Chile'))
    co_phone = (company.phone if company and getattr(company, 'phone', None) else getattr(settings, 'COMPANY_PHONE', ''))

    elements = []

    # Header - Company info
    header_data = [
        [
            Paragraph(f"<b>{co_name}</b>", ParagraphStyle("CH", fontSize=13, textColor=BLUE, fontName="Helvetica-Bold")),
            Paragraph(f"<b>LIQUIDACIÓN DE SUELDO</b>", ParagraphStyle("LH", fontSize=13, textColor=BLUE, alignment=TA_RIGHT, fontName="Helvetica-Bold")),
        ],
        [
            Paragraph(f"RUT: {co_rut}<br/>{co_address}<br/>{co_phone}", small_style),
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
    pension = float(getattr(entry, 'pension_alimenticia', 0) or 0)
    desc_voluntario = float(getattr(entry, 'descuento_voluntario', 0) or 0)
    desc_vivienda = float(getattr(entry, 'descuento_vivienda', 0) or 0)
    desc_ccaf = float(getattr(entry, 'descuento_ccaf', 0) or 0)
    if pension > 0:
        descuentos_rows.append(["Retención Judicial (Pensión Alimenticia)", _fmt_clp(pension)])
    if desc_voluntario > 0:
        descuentos_rows.append(["Descuentos Voluntarios (Art. 58)", _fmt_clp(desc_voluntario)])
    if desc_vivienda > 0:
        descuentos_rows.append(["Descuento Vivienda (Art. 58)", _fmt_clp(desc_vivienda)])
    if desc_ccaf > 0:
        descuentos_rows.append(["Crédito CCAF", _fmt_clp(desc_ccaf)])
    if float(entry.descuento_otros) > 0:
        descuentos_rows.append(["Otros Descuentos", _fmt_clp(entry.descuento_otros)])
    if float(entry.adelanto) > 0:
        descuentos_rows.append(["Adelanto", _fmt_clp(entry.adelanto)])
    total_descuentos_final = (
        float(entry.total_descuentos_previsionales) + float(entry.impuesto_unico)
        + pension + desc_voluntario + desc_vivienda + desc_ccaf
        + float(entry.descuento_otros) + float(entry.adelanto)
    )
    descuentos_rows.append([
        Paragraph("<b>TOTAL DESCUENTOS</b>", ParagraphStyle("TDL", fontSize=9, fontName="Helvetica-Bold")),
        Paragraph(f"<b>{_fmt_clp(total_descuentos_final)}</b>",
                  ParagraphStyle("TDR", fontSize=9, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
    ])

    def style_detail_table(rows, color=BLUE):
        t = Table(rows, colWidths=[6.5*cm, 2.5*cm])
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
    combined = Table([[hab_table, desc_table]], colWidths=[9.2*cm, 9.2*cm])
    combined.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (1, 0), (1, -1), 8),
    ]))
    elements.append(combined)
    elements.append(Spacer(1, 10))

    # Aportes empleador box
    from services.payroll_calculator import get_ley21735_rates as _get_rates
    _cap_pct, _crp_pct = _get_rates(payroll_run.period_year, payroll_run.period_month)

    employer_rows = [
        [section_header("APORTES EMPLEADOR (COSTO EMPRESA)", DARK_GRAY), ""],
        ["Seguro Cesantía Empleador", _fmt_clp(entry.aporte_cesantia_empleador)],
        ["SIS (Seg. Invalidez y Sobrevivencia 1.62%)", _fmt_clp(entry.aporte_sis)],
    ]
    # CRP (Cotización Rentabilidad Protegida 0.9%) — desde ago 2025, Campo 95 Previred
    if _crp_pct > 0:
        employer_rows.append([f"CRP (Cotiz. Rentabilidad Protegida {_crp_pct*100:.1f}%)", _fmt_clp(entry.aporte_seguro_social)])
    # Capitalización Individual — desde ago 2025, va a cuenta AFP del trabajador
    if _cap_pct > 0:
        employer_rows.append([f"Capitalización Individual ({_cap_pct*100:.1f}%)", _fmt_clp(entry.aporte_empleador_afp_reforma)])
    employer_rows.append([
        Paragraph("<b>TOTAL COSTO EMPRESA</b>", ParagraphStyle("TC", fontSize=9, fontName="Helvetica-Bold")),
        Paragraph(f"<b>{_fmt_clp(entry.total_costo_empleador)}</b>", ParagraphStyle("TC", fontSize=9, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
    ])
    employer_data = employer_rows
    emp_cost_table = Table(employer_data, colWidths=[14.2*cm, 4*cm])
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
        [co_name, full_name],
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


def _company_fields(company):
    """Extract company display fields without rendering anything."""
    primary_color = BLUE
    if company and company.primary_color:
        try:
            primary_color = colors.HexColor(company.primary_color)
        except Exception:
            pass
    name = (company.name if company and company.name else settings.COMPANY_NAME)
    rut = (company.rut if company and company.rut else settings.COMPANY_RUT)
    address = (company.address if company and company.address else settings.COMPANY_ADDRESS)
    phone = (company.phone if company and company.phone else settings.COMPANY_PHONE)
    city = (company.city if company and company.city else "Santiago")
    legal_rep_name = (company.legal_rep_name if company and getattr(company, 'legal_rep_name', None) else "")
    legal_rep_rut = (company.legal_rep_rut if company and getattr(company, 'legal_rep_rut', None) else "")
    return primary_color, name, rut, address, phone, city, legal_rep_name, legal_rep_rut


def _company_header_elements(company, elements, styles):
    """Render company logo + info header block into elements list."""
    primary_color = BLUE
    if company and company.primary_color:
        try:
            primary_color = colors.HexColor(company.primary_color)
        except Exception:
            pass

    name = (company.name if company and company.name else settings.COMPANY_NAME)
    rut = (company.rut if company and company.rut else settings.COMPANY_RUT)
    address = (company.address if company and company.address else settings.COMPANY_ADDRESS)
    phone = (company.phone if company and company.phone else settings.COMPANY_PHONE)
    city = (company.city if company and company.city else "Santiago")

    logo_cell = ""
    if company and company.logo_path and os.path.exists(company.logo_path):
        try:
            logo_cell = Image(company.logo_path, width=3*cm, height=2*cm)
        except Exception:
            logo_cell = ""

    info_para = Paragraph(
        f"<b>{name}</b><br/>RUT: {rut}<br/>{address}<br/>{phone}",
        ParagraphStyle("CI", fontSize=9, leading=13)
    )

    header_data = [[logo_cell, info_para]]
    header_table = Table(header_data, colWidths=[4*cm, 14*cm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=2, color=primary_color, spaceAfter=8))
    return primary_color, name, rut, address, phone, city


def generate_warning_letter_pdf(warning_letter, employee, company) -> str:
    """Generate a Carta de Amonestación PDF."""
    filename = f"amonestacion_{employee.rut}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        leftMargin=2.5*cm,
        rightMargin=2.5*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    elements = []
    primary_color, company_name, company_rut, company_address, company_phone, company_city = \
        _company_header_elements(company, elements, getSampleStyleSheet())

    # Warning type label
    type_labels = {
        "verbal": "VERBAL",
        "escrita": "ESCRITA",
        "grave": "GRAVE",
    }
    wtype = str(warning_letter.type.value if hasattr(warning_letter.type, 'value') else warning_letter.type)
    type_label = type_labels.get(wtype, wtype.upper())

    title_style = ParagraphStyle("WT", fontSize=14, fontName="Helvetica-Bold",
                                  textColor=primary_color, alignment=TA_CENTER, spaceAfter=6)
    elements.append(Paragraph(f"CARTA DE AMONESTACIÓN {type_label}", title_style))
    elements.append(Spacer(1, 8))

    # Date & city header
    letter_date = warning_letter.date
    month_name = MONTH_NAMES.get(letter_date.month, str(letter_date.month))
    date_str = f"{company_city}, {letter_date.day} de {month_name} de {letter_date.year}"
    elements.append(Paragraph(date_str, ParagraphStyle("Date", fontSize=10, alignment=TA_RIGHT)))
    elements.append(Spacer(1, 14))

    # Employee info box
    full_name = employee.full_name if hasattr(employee, 'full_name') else f"{employee.first_name} {employee.last_name}"
    emp_data = [
        ["Señor(a):", full_name],
        ["RUT:", employee.rut],
        ["Cargo:", employee.position],
        ["Departamento:", employee.department or "—"],
        ["Fecha Ingreso:", str(employee.hire_date)],
    ]
    emp_table = Table(emp_data, colWidths=[4*cm, 11*cm])
    emp_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [GRAY, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(emp_table)
    elements.append(Spacer(1, 14))

    # Body text
    body_style = ParagraphStyle("Body", fontSize=10, leading=16, alignment=TA_JUSTIFY)
    bold_style = ParagraphStyle("Bold", fontSize=10, leading=16, fontName="Helvetica-Bold")

    elements.append(Paragraph("Estimado(a) trabajador(a):", body_style))
    elements.append(Spacer(1, 8))

    salutation = (
        f"Por medio de la presente, la empresa <b>{company_name}</b>, RUT {company_rut}, "
        f"representada para estos efectos por su empleador, viene en hacer presente la siguiente "
        f"amonestación <b>{type_label}</b> en su contra, de conformidad a lo dispuesto en el "
        f"Reglamento Interno de la empresa y el Código del Trabajo."
    )
    elements.append(Paragraph(salutation, body_style))
    elements.append(Spacer(1, 10))

    elements.append(Paragraph("<b>Motivo de la amonestación:</b>", bold_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(warning_letter.reason, body_style))
    elements.append(Spacer(1, 10))

    elements.append(Paragraph("<b>Descripción de los hechos:</b>", bold_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(warning_letter.description, body_style))
    elements.append(Spacer(1, 10))

    # Legal references for severe type
    if wtype == "grave":
        legal_text = (
            "La conducta descrita constituye una falta grave a las obligaciones que impone el contrato de trabajo, "
            "pudiendo configurar una causal de término de contrato conforme a lo dispuesto en el "
            "<b>Artículo 160 del Código del Trabajo</b>, sin perjuicio de lo señalado en el "
            "<b>Artículo 154 N°10 del mismo cuerpo legal</b>, que faculta al empleador a aplicar "
            "medidas disciplinarias establecidas en el Reglamento Interno."
        )
        elements.append(Paragraph(legal_text, body_style))
        elements.append(Spacer(1, 10))

    general_warning = (
        "Se le hace presente que la reiteración de conductas de esta naturaleza podrá dar lugar a la "
        "aplicación de sanciones más graves, incluida la terminación del contrato de trabajo, "
        "conforme a lo establecido en la normativa laboral vigente."
    )
    elements.append(Paragraph(general_warning, body_style))
    elements.append(Spacer(1, 8))

    elements.append(Paragraph(
        "Sin perjuicio de lo anterior, se le exhorta a ajustar su conducta a las normas y obligaciones "
        "propias de su cargo y a las disposiciones del Reglamento Interno de la empresa.",
        body_style
    ))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        f"Se extiende la presente en dos ejemplares del mismo tenor y fecha, uno para el empleado y otro para la empresa.",
        body_style
    ))
    elements.append(Spacer(1, 30))

    # Signatures
    if warning_letter.signature_required:
        sig_data = [
            ["_______________________________", "_______________________________"],
            ["Firma Empleador", "Firma Trabajador"],
            [company_name, full_name],
            [f"RUT: {company_rut}", f"RUT: {employee.rut}"],
        ]
        sig_table = Table(sig_data, colWidths=[9*cm, 9*cm])
        sig_table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 2), (-1, -1), DARK_GRAY),
        ]))
        elements.append(sig_table)
    else:
        elements.append(Paragraph(
            "________________________<br/>Firma Empleador<br/>" + company_name,
            ParagraphStyle("Sig", fontSize=9, alignment=TA_CENTER)
        ))

    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    elements.append(Paragraph(
        f"Generado por ANIMA HR | {datetime.now().strftime('%d/%m/%Y %H:%M')} | "
        f"Documento emitido conforme al Código del Trabajo de Chile",
        ParagraphStyle("Footer", fontSize=6, textColor=DARK_GRAY, alignment=TA_CENTER)
    ))

    doc.build(elements)
    return filepath


def generate_finiquito_pdf(data: dict, employee, company) -> str:
    """Generate a Finiquito (Termination Settlement) PDF."""
    filename = f"finiquito_{employee.rut}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Resolve company fields up front (needed by footer callback)
    _company = company
    _primary_color = colors.HexColor(_company.primary_color) if (_company and _company.primary_color) else BLUE
    _company_name = (_company.name if _company else None) or "Empresa"
    _company_rut = (_company.rut if _company else None) or ""
    _employee_name = data.get("employee_name", "")
    _employee_rut = _fmt_rut(data.get("employee_rut", ""))
    _worker_label = ["Trabajador(a)"]  # mutable so footer closure picks up the gendered label

    # Footer height: 5.5 cm (signature lines + ratification note + ANIMA line)
    FOOTER_H = 5.5 * cm

    def _draw_footer(canv, doc):
        """Draw signature block + ratification note as a fixed page footer."""
        page_w, _ = A4
        left = 2 * cm
        right = page_w - 2 * cm
        usable_w = right - left
        col_w = usable_w / 4

        y_base = 1.5 * cm  # bottom of footer area

        # Thin separator line
        canv.saveState()
        canv.setStrokeColor(colors.lightgrey)
        canv.setLineWidth(0.5)
        canv.line(left, y_base + FOOTER_H - 0.3 * cm, right, y_base + FOOTER_H - 0.3 * cm)

        # Four signature columns
        labels = ["Empleador", _worker_label[0], "Testigo", "Delegado Sindical\n(si aplica)"]
        names  = [_company_name, _employee_name, "", ""]
        ruts   = [f"RUT: {_company_rut}", f"RUT: {_employee_rut}", "RUT:", ""]

        canv.setFont("Helvetica", 7)
        for i, (lbl, nm, rut) in enumerate(zip(labels, names, ruts)):
            x_center = left + col_w * i + col_w / 2
            y_line   = y_base + 3.5 * cm
            y_label  = y_base + 3.0 * cm
            y_name   = y_base + 2.5 * cm
            y_rut    = y_base + 2.1 * cm

            # Signature line
            canv.setStrokeColor(colors.black)
            canv.setLineWidth(0.5)
            canv.line(x_center - col_w * 0.4, y_line, x_center + col_w * 0.4, y_line)

            # Bold label
            canv.setFont("Helvetica-Bold", 7)
            # Handle multi-line label (Delegado Sindical)
            for j, part in enumerate(lbl.split("\n")):
                canv.drawCentredString(x_center, y_label - j * 9, part)

            canv.setFont("Helvetica", 6.5)
            canv.setFillColor(DARK_GRAY)
            if nm:
                canv.drawCentredString(x_center, y_name, nm)
            if rut:
                canv.drawCentredString(x_center, y_rut, rut)
            canv.setFillColor(colors.black)

        # Ratification note
        y_note = y_base + 1.5 * cm
        canv.setFont("Helvetica-BoldOblique", 6.5)
        canv.setFillColor(DARK_GRAY)
        note = "Este finiquito debe ser ratificado ante Notario Público o Inspector del Trabajo para tener plena validez."
        canv.drawCentredString(page_w / 2, y_note, note)

        # ANIMA HR line
        canv.setFont("Helvetica", 5.5)
        gen_line = (
            f"Generado por ANIMA HR | {datetime.now().strftime('%d/%m/%Y %H:%M')} | "
            f"Documento sujeto a ratificación conforme Art. 177 Código del Trabajo"
        )
        canv.drawCentredString(page_w / 2, y_base + 0.8 * cm, gen_line)
        canv.setFillColor(colors.black)
        canv.restoreState()

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        leftMargin=2*cm,
        rightMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=FOOTER_H + 1.5*cm,  # reserve space for footer
    )

    elements = []
    primary_color, company_name, company_rut, company_address, company_phone, company_city, legal_rep_name, legal_rep_rut = \
        _company_fields(company)

    title_style = ParagraphStyle("FT", fontSize=15, fontName="Helvetica-Bold",
                                  textColor=primary_color, alignment=TA_CENTER, spaceAfter=4)
    elements.append(Paragraph("FINIQUITO DE CONTRATO DE TRABAJO", title_style))
    elements.append(Paragraph(
        "Artículo 177 del Código del Trabajo",
        ParagraphStyle("Sub", fontSize=9, textColor=DARK_GRAY, alignment=TA_CENTER)
    ))
    elements.append(HRFlowable(width="100%", thickness=2, color=primary_color, spaceAfter=4))

    # Party info
    body_style = ParagraphStyle("Body", fontSize=9, leading=12, alignment=TA_JUSTIFY)
    city = company_city if (company_city and len(company_city.strip()) > 3 and not company_city.strip().isdigit()) else "Santiago"
    term_date_str = data.get("termination_date", "")
    if term_date_str:
        try:
            td = datetime.strptime(term_date_str, "%Y-%m-%d")
            term_date_str = f"{td.day} de {MONTH_NAMES[td.month]} de {td.year}"
        except Exception:
            pass

    # Worker personal data from employee object
    emp_nationality = getattr(employee, 'nationality', None) or "Chilena"
    emp_birth_date = getattr(employee, 'birth_date', None)
    emp_birth_str = ""
    if emp_birth_date:
        try:
            bd = emp_birth_date if hasattr(emp_birth_date, 'day') else datetime.strptime(str(emp_birth_date), "%Y-%m-%d")
            emp_birth_str = f"{bd.day} de {MONTH_NAMES[bd.month]} de {bd.year}"
        except Exception:
            pass
    emp_address = getattr(employee, 'address', None) or "Chile"

    # Gender-aware pronouns — use .value to handle Enum members safely across Python versions
    _gender_raw = getattr(employee, 'gender', None)
    _gender = ((_gender_raw.value if hasattr(_gender_raw, 'value') else str(_gender_raw)) or '').lower()
    if _gender == 'female':
        _el = "la"; _El = "La"; _don = "doña"; _Don = "Doña"
        _trabajador = "trabajadora"; _Trabajador = "Trabajadora"
        _domiciliado = "domiciliada"; _nacido = "nacida"
        _prestó = "prestó"; _recibió = "recibió"; _declara = "declara"
        _articulo = "la"
    elif _gender == 'male':
        _el = "el"; _El = "El"; _don = "don"; _Don = "Don"
        _trabajador = "trabajador"; _Trabajador = "Trabajador"
        _domiciliado = "domiciliado"; _nacido = "nacido"
        _prestó = "prestó"; _recibió = "recibió"; _declara = "declara"
        _articulo = "el"
    else:
        _el = "el(la)"; _El = "El(la)"; _don = "don(a)"; _Don = "Don(a)"
        _trabajador = "trabajador(a)"; _Trabajador = "Trabajador(a)"
        _domiciliado = "domiciliado(a)"; _nacido = "nacido(a)"
        _prestó = "prestó"; _recibió = "recibió"; _declara = "declara"
        _articulo = "el(la)"

    # Update the footer worker label now that gender is known
    _worker_label[0] = _Trabajador

    if legal_rep_name:
        rep_clause = f"representada legalmente por don/doña <b>{legal_rep_name}</b>, Cédula de Identidad N° {_fmt_rut(legal_rep_rut)}"
    else:
        rep_clause = "representada legalmente por su representante legal"

    worker_detail = f"de nacionalidad <b>{emp_nationality}</b>"
    if emp_birth_str:
        worker_detail += f", {_nacido}(a) el <b>{emp_birth_str}</b>"

    intro = (
        f"En {city}, a {term_date_str}, entre <b>{company_name}</b>, RUT {_fmt_rut(company_rut)}, "
        f'domiciliada en {company_address} (en adelante "la Empresa"), {rep_clause}, '
        f"y {_el} {_trabajador} <b>{data.get('employee_name', '')}</b>, RUT <b>{_fmt_rut(data.get('employee_rut', ''))}</b>, "
        f"{worker_detail}, {_domiciliado} en {emp_address} "
        f'(en adelante "{_El} {_Trabajador}"), se ha convenido el siguiente finiquito:'
    )
    elements.append(Paragraph(intro, body_style))
    elements.append(Spacer(1, 5))

    clause_title_style = ParagraphStyle("CT", fontSize=9, fontName="Helvetica-Bold", spaceBefore=5, spaceAfter=2)

    # --- PRIMERO ---
    cause = data.get("termination_cause", "")
    hire_str = _fmt_date_cl(data.get("hire_date", ""))
    term_str_short = _fmt_date_cl(data.get("termination_date", ""))
    emp_name = data.get("employee_name", "")
    emp_rut = _fmt_rut(data.get("employee_rut", ""))
    if "159" in cause:
        cause_label = f"{cause} del Código del Trabajo"
    elif "160" in cause:
        cause_label = f"{cause} del Código del Trabajo"
    elif "161" in cause:
        cause_label = f"{cause} del Código del Trabajo"
    else:
        cause_label = cause

    elements.append(Paragraph("PRIMERO:", clause_title_style))
    elements.append(Paragraph(
        f"{_El} {_trabajador} prestó servicios al empleador desde el {hire_str} hasta el {term_str_short}, "
        f"fecha esta última en que su contrato de trabajo ha terminado por <b>{cause_label}</b>.",
        body_style
    ))
    elements.append(Spacer(1, 4))

    # Data summary table
    emp_data = [
        [f"{_Trabajador}:", emp_name],
        ["RUT:", emp_rut],
        ["Cargo:", data.get("employee_position", "")],
        ["Fecha de Ingreso:", hire_str],
        ["Fecha de Término:", term_str_short],
        ["Causal de Término:", cause],
        ["Años de servicio:", f"{data.get('years_of_service', 0):.2f} años ({data.get('months_of_service', 0)} meses)"],
        ["Última rem. imponible:", _fmt_clp(data.get("last_salary", 0))],
    ]
    emp_table = Table(emp_data, colWidths=[5*cm, 11*cm])
    emp_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [GRAY, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(emp_table)
    elements.append(Spacer(1, 4))

    # --- SEGUNDO ---
    elements.append(Paragraph("SEGUNDO:", clause_title_style))
    elements.append(Paragraph(
        f"{_Don} <b>{emp_name}</b> declara recibir en este acto, a su entera satisfacción, de parte de "
        f"<b>{company_name}</b>, las sumas que se detallan en la siguiente liquidación de haberes. "
        f"{_Don} <b>{emp_name}</b> declara haber analizado y estudiado detenidamente dicha liquidación, "
        f"encontrándola en todas sus partes correcta, sin tener observación alguna que formularle.",
        body_style
    ))
    elements.append(Spacer(1, 4))

    # Settlement table
    elements.append(Paragraph("<b>LIQUIDACIÓN DE HABERES</b>",
                               ParagraphStyle("LH", fontSize=10, fontName="Helvetica-Bold", textColor=primary_color)))
    elements.append(Spacer(1, 4))

    breakdown = data.get("breakdown", {})
    settlement_rows = [
        [Paragraph("<b>Concepto</b>", ParagraphStyle("H", fontSize=8, textColor=colors.white, fontName="Helvetica-Bold")),
         Paragraph("<b>Detalle</b>", ParagraphStyle("H", fontSize=8, textColor=colors.white, fontName="Helvetica-Bold")),
         Paragraph("<b>Monto</b>", ParagraphStyle("H", fontSize=8, textColor=colors.white, fontName="Helvetica-Bold", alignment=TA_RIGHT))],
    ]

    cell_style = ParagraphStyle("Cell", fontSize=8, leading=10)

    def add_concept(label, detail, amount):
        settlement_rows.append([
            Paragraph(label, cell_style),
            Paragraph(detail, cell_style),
            Paragraph(_fmt_clp(amount), ParagraphStyle("R", fontSize=8, alignment=TA_RIGHT))
        ])

    if data.get("indemnizacion_anos", 0) > 0:
        add_concept(
            "Indemnización por años de servicio (Art. 163)",
            f"{breakdown.get('complete_years', 0)} años × {_fmt_clp(breakdown.get('capped_salary', data.get('last_salary', 0)))} (tope 90 UF: {_fmt_clp(breakdown.get('uf_cap', 0))})",
            data["indemnizacion_anos"]
        )
    if data.get("indemnizacion_aviso_previo", 0) > 0:
        add_concept(
            "Indemnización sustitutiva aviso previo (Art. 161)",
            "1 mes de remuneración por falta de aviso previo de 30 días",
            data["indemnizacion_aviso_previo"]
        )
    if data.get("vacaciones_proporcionales", 0) > 0:
        hab = breakdown.get('total_vacation_habiles', breakdown.get('pending_vacation_days', 0))
        cor = breakdown.get('total_vacation_days', 0)
        vac_detail = (f"{hab:.2f} días hábiles → {cor:.2f} días corridos × {_fmt_clp(breakdown.get('daily_salary', 0))}/día")
        add_concept("Vacaciones proporcionales (Art. 73)", vac_detail, data["vacaciones_proporcionales"])
    if data.get("remuneraciones_pendientes", 0) > 0:
        add_concept(
            "Remuneraciones pendientes",
            f"Días trabajados no pagados: {_fmt_clp(breakdown.get('daily_salary', 0))}/día",
            data["remuneraciones_pendientes"]
        )
    if data.get("gratificacion_proporcional", 0) > 0:
        add_concept("Gratificación proporcional pendiente", "Proporcional al período trabajado", data["gratificacion_proporcional"])

    # Total haberes row
    settlement_rows.append([
        Paragraph("<b>TOTAL HABERES</b>", ParagraphStyle("TH", fontSize=8, fontName="Helvetica-Bold")),
        "",
        Paragraph(f"<b>{_fmt_clp(data.get('total_haberes', 0))}</b>",
                  ParagraphStyle("TH", fontSize=8, fontName="Helvetica-Bold", alignment=TA_RIGHT))
    ])
    # Descuentos
    if data.get("descuentos_previsionales", 0) > 0:
        settlement_rows.append([
            "(-) Descuentos previsionales (AFP + Salud, aprox. 12.7%)",
            "Sobre remuneraciones pendientes imponibles",
            Paragraph(_fmt_clp(-data["descuentos_previsionales"]),
                      ParagraphStyle("DR", fontSize=8, alignment=TA_RIGHT, textColor=colors.red))
        ])
    if data.get("afc_deduction", 0) > 0:
        settlement_rows.append([
            Paragraph("(-) Descuento AFC empleador<br/>(Art. 13 Ley N° 19.728)",
                      ParagraphStyle("AFC", fontSize=8, textColor=colors.red)),
            Paragraph(f"Aporte acumulado empleador (1,6%) en cuenta individual AFC",
                      ParagraphStyle("AFCD", fontSize=8)),
            Paragraph(f"<font color='red'>−{_fmt_clp(data['afc_deduction'])}</font>",
                      ParagraphStyle("DR2", fontSize=8, alignment=TA_RIGHT))
        ])
    # Total neto
    settlement_rows.append([
        Paragraph("<b>TOTAL NETO A PAGAR</b>", ParagraphStyle("TN", fontSize=10, fontName="Helvetica-Bold", textColor=primary_color)),
        "",
        Paragraph(f"<b>{_fmt_clp(data.get('total_neto', 0))}</b>",
                  ParagraphStyle("TN", fontSize=10, fontName="Helvetica-Bold", textColor=primary_color, alignment=TA_RIGHT))
    ])

    col_widths = [6*cm, 7*cm, 3.5*cm]
    st = Table(settlement_rows, colWidths=col_widths)
    st.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, 0), primary_color),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -3), [colors.white, GRAY]),
        ("BACKGROUND", (0, -2), (-1, -2), LIGHT_BLUE),
        ("BACKGROUND", (0, -1), (-1, -1), LIGHT_BLUE),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(KeepTogether([st, Spacer(1, 8)]))

    # UF reference
    uf_val = breakdown.get("uf_value", 0)
    if uf_val:
        elements.append(Paragraph(
            f"Valor UF a la fecha: {_fmt_clp(uf_val)} | Tope indemnización (90 UF): {_fmt_clp(breakdown.get('uf_cap', 0))}",
            ParagraphStyle("UF", fontSize=7, textColor=DARK_GRAY)
        ))
    elements.append(Spacer(1, 10))

    # --- TERCERO ---
    elements.append(Paragraph("TERCERO:", clause_title_style))
    elements.append(Paragraph(
        f"En consecuencia, el empleador paga a {_don} <b>{emp_name}</b>, en dinero efectivo o transferencia bancaria, "
        f"la suma de <b>{_fmt_clp(data.get('total_neto', 0))}</b>, que {_el} {_trabajador} declara recibir en este acto "
        f"a su entera satisfacción. Las partes dejan constancia que la referida suma cubre el total de haberes "
        f"especificados en la liquidación señalada en la cláusula SEGUNDO del presente finiquito.",
        body_style
    ))
    elements.append(Spacer(1, 4))

    # --- CUARTO: Reserva de Derechos (Art. 177 CT inciso 3°) ---
    elements.append(Paragraph("CUARTO: Reserva de Derechos", clause_title_style))
    elements.append(Paragraph(
        f"De conformidad con lo dispuesto en el inciso 3° del Artículo 177 del Código del Trabajo, "
        f"{_el} {_trabajador} {_don} <b>{emp_name}</b> deja constancia de que acepta el presente finiquito "
        f"<b>sin reserva de derechos</b>, declarando que no existen conceptos pendientes ni en disputa "
        f"que deban ser excluidos del presente instrumento. En consecuencia, el finiquito produce plenos "
        f"efectos respecto de la totalidad de los conceptos derivados de la relación laboral.",
        body_style
    ))
    elements.append(Spacer(1, 4))

    # --- QUINTO: No hay deudas ---
    elements.append(Paragraph("QUINTO:", clause_title_style))
    elements.append(Paragraph(
        f"{_Don} <b>{emp_name}</b> deja constancia que durante el tiempo que prestó servicios a "
        f"<b>{company_name}</b>, recibió oportunamente el total de las remuneraciones, beneficios y demás "
        f"prestaciones convenidas de acuerdo a su contrato de trabajo, clase de trabajo ejecutado y disposiciones "
        f"legales pertinentes, y que en tal virtud el empleador nada le adeuda por tales conceptos, ni por horas "
        f"extraordinarias, asignación familiar, feriado, indemnización por años de servicios, imposiciones "
        f"previsionales, ni por ningún otro concepto, ya sea legal o contractual, derivado de la prestación de "
        f"sus servicios, de su contrato de trabajo o de la terminación del mismo.",
        body_style
    ))
    elements.append(Spacer(1, 4))

    # --- SEXTO ---
    elements.append(Paragraph("SEXTO:", clause_title_style))
    elements.append(Paragraph(
        f"En virtud de lo anteriormente expuesto, {_don} <b>{emp_name}</b> manifiesta expresamente que "
        f"<b>{company_name}</b> nada le adeuda en relación con los servicios prestados, con el contrato de trabajo "
        f"o con motivo de la terminación del mismo, por lo que libre y espontáneamente, y con el pleno y cabal "
        f"conocimiento de sus derechos, otorga a su empleador el más amplio, completo, total y definitivo "
        f"finiquito por los servicios prestados o la terminación de ellos, ya diga relación con remuneraciones, "
        f"cotizaciones previsionales, de seguridad social o de salud, subsidios, beneficios contractuales "
        f"adicionales a las remuneraciones, indemnizaciones, compensaciones, o con cualquiera causa o concepto, "
        f"sin perjuicio de lo señalado en la cláusula cuarta del presente instrumento, conforme al "
        f"<b>Artículo 177 del Código del Trabajo</b>.",
        body_style
    ))
    elements.append(Spacer(1, 4))

    # --- SÉPTIMO ---
    elements.append(Paragraph("SÉPTIMO:", clause_title_style))
    elements.append(Paragraph(
        f"Asimismo, declara {_el} {_trabajador} que, en todo caso y a todo evento, renuncia expresamente a "
        f"cualquier derecho, acción o reclamo que eventualmente tuviere o pudiere corresponderle en contra del "
        f"empleador, en relación directa o indirecta con su contrato de trabajo, con los servicios prestados, "
        f"con la terminación del referido contrato o dichos servicios, ya correspondan esos derechos o acciones "
        f"a remuneraciones, cotizaciones previsionales, de seguridad social o de salud, subsidios, beneficios "
        f"contractuales adicionales a las remuneraciones, indemnizaciones, compensaciones, o con cualquier otra "
        f"causa o concepto.",
        body_style
    ))
    elements.append(Spacer(1, 10))

    # Closing
    elements.append(Paragraph(
        f"Para constancia, las partes firman el presente finiquito en <b>tres ejemplares</b> del mismo tenor y "
        f"fecha, quedando uno en poder de cada una de ellas, y en cumplimiento de la legislación vigente, "
        f"{_don} <b>{emp_name}</b> lo lee, firma y lo ratifica ante Notario Público o Inspector del Trabajo.",
        body_style
    ))
    elements.append(Spacer(1, 4))

    # Note on commissions (DT standard footnote)
    elements.append(Paragraph(
        "<i>Nota: Las comisiones devengadas por el(la) trabajador(a) en el período en que se da término al "
        "contrato de trabajo y que por razones técnicas no fue posible liquidar y pagar en el período en que "
        "se originaron, deberán ser liquidadas y pagadas al período siguiente (Dictamen N° 4814/44 de 31.10.2012 DT).</i>",
        ParagraphStyle("Note2", fontSize=7, textColor=DARK_GRAY, leading=10)
    ))
    elements.append(Spacer(1, 6))

    doc.build(elements, onFirstPage=_draw_footer, onLaterPages=_draw_footer)
    return filepath


def generate_vacation_certificate_pdf(employee, balance_data: dict, requests: list, company) -> str:
    """Generate a Certificado de Vacaciones PDF per Chilean law (Art. 67 CT)."""
    filename = f"certificado_vacaciones_{employee.rut}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        leftMargin=2.5*cm,
        rightMargin=2.5*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    elements = []
    primary_color, company_name, company_rut, company_address, company_phone, company_city = \
        _company_header_elements(company, elements, getSampleStyleSheet())

    title_style = ParagraphStyle("VT", fontSize=14, fontName="Helvetica-Bold",
                                  textColor=primary_color, alignment=TA_CENTER, spaceAfter=4)
    elements.append(Paragraph("CERTIFICADO DE VACACIONES", title_style))
    elements.append(Paragraph(
        "Artículo 67 del Código del Trabajo — Ley N° 18.620",
        ParagraphStyle("Sub", fontSize=9, textColor=DARK_GRAY, alignment=TA_CENTER)
    ))
    elements.append(Spacer(1, 12))

    # Date
    today = date.today()
    month_name = MONTH_NAMES.get(today.month, str(today.month))
    date_str = f"{company_city}, {today.day} de {month_name} de {today.year}"
    elements.append(Paragraph(date_str, ParagraphStyle("Date", fontSize=10, alignment=TA_RIGHT)))
    elements.append(Spacer(1, 12))

    full_name = employee.full_name if hasattr(employee, 'full_name') else f"{employee.first_name} {employee.last_name}"

    # Employee data
    hire_date_str = str(employee.hire_date)
    emp_data = [
        ["Trabajador(a):", full_name],
        ["RUT:", employee.rut],
        ["Cargo:", employee.position],
        ["Departamento:", employee.department or "—"],
        ["Fecha de Ingreso:", hire_date_str],
    ]
    emp_table = Table(emp_data, colWidths=[5*cm, 11*cm])
    emp_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [GRAY, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(emp_table)
    elements.append(Spacer(1, 14))

    body_style = ParagraphStyle("Body", fontSize=10, leading=15, alignment=TA_JUSTIFY)

    # Vacation balance section
    elements.append(Paragraph("<b>SALDO DE VACACIONES</b>",
                               ParagraphStyle("SH", fontSize=11, fontName="Helvetica-Bold", textColor=primary_color)))
    elements.append(Spacer(1, 6))

    days_earned = balance_data.get("days_earned", 0)
    days_taken = balance_data.get("days_taken", 0)
    days_pending = balance_data.get("days_pending", 0)
    months_worked = balance_data.get("months_worked", 0)
    base_days = balance_data.get("base_days", 15)
    progressive_days = balance_data.get("progressive_days", 0)
    years_worked = balance_data.get("years_worked", 0)

    calc_basis = (
        f"Base legal: {base_days} días hábiles/año (Art. 67 CT)"
        + (f" + {progressive_days} día(s) feriado progresivo (>{10} años en empresa)" if progressive_days > 0 else "")
        + f" × {months_worked} meses trabajados / 12 = {days_earned:.2f} días hábiles ganados"
    )

    balance_data_table = [
        ["Concepto", "Días Hábiles"],
        ["Días ganados al " + date_str.split(",")[1].strip(), f"{days_earned:.2f}"],
        [f"Base de cálculo: {base_days + progressive_days} días/año × {months_worked}/12 meses", ""],
        ["Días tomados", f"{days_taken:.2f}"],
        ["Días disponibles (pendientes)", f"{days_pending:.2f}"],
    ]
    bal_table = Table(balance_data_table, colWidths=[12*cm, 4*cm])
    bal_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), primary_color),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), LIGHT_BLUE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("FONTSIZE", (0, 2), (0, 2), 7),
        ("TEXTCOLOR", (0, 2), (0, 2), DARK_GRAY),
    ]))
    elements.append(bal_table)
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(calc_basis, ParagraphStyle("Calc", fontSize=7, textColor=DARK_GRAY)))
    elements.append(Spacer(1, 14))

    # History of approved requests
    approved = [r for r in requests if r.get("status") == "approved"]
    if approved:
        elements.append(Paragraph("<b>PERÍODOS DE VACACIONES TOMADOS</b>",
                                   ParagraphStyle("SH2", fontSize=11, fontName="Helvetica-Bold", textColor=primary_color)))
        elements.append(Spacer(1, 6))
        hist_rows = [["Desde", "Hasta", "Días hábiles", "Estado"]]
        for req in approved:
            hist_rows.append([
                str(req.get("start_date", "")),
                str(req.get("end_date", "")),
                f"{req.get('days_requested', 0):.2f}",
                "Aprobado",
            ])
        hist_table = Table(hist_rows, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
        hist_table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BACKGROUND", (0, 0), (-1, 0), primary_color),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GRAY]),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
            ("ALIGN", (3, 0), (3, -1), "CENTER"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(hist_table)
        elements.append(Spacer(1, 14))

    # Pending approved request
    pending_approved = [r for r in requests if r.get("status") == "approved" and r.get("start_date") and str(r.get("start_date")) >= str(date.today())]
    if pending_approved:
        req = pending_approved[0]
        elements.append(Paragraph(
            f"<b>Período de vacaciones autorizado:</b> desde el {req.get('start_date')} hasta el {req.get('end_date')} "
            f"({req.get('days_requested', 0):.2f} días hábiles).",
            body_style
        ))
        elements.append(Spacer(1, 10))

    # Legal note
    legal_note = (
        "Las vacaciones constituyen un derecho irrenunciable del trabajador, conforme al <b>Artículo 67 del Código del Trabajo</b>. "
        "No pueden compensarse en dinero mientras subsista la relación laboral, salvo en caso de término del contrato "
        "(Art. 73 CT). Las vacaciones deben otorgarse dentro de los dos años siguientes a la fecha en que se genere el derecho."
    )
    elements.append(Paragraph(legal_note, ParagraphStyle("Legal", fontSize=8, leading=12, alignment=TA_JUSTIFY, textColor=DARK_GRAY)))
    elements.append(Spacer(1, 20))

    # Signatures
    sig_data = [
        ["_______________________________", "_______________________________"],
        ["Firma Empleador", "Firma Trabajador(a)"],
        [company_name, full_name],
        [f"RUT: {company_rut}", f"RUT: {employee.rut}"],
    ]
    sig_table = Table(sig_data, colWidths=[9*cm, 9*cm])
    sig_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 2), (-1, -1), DARK_GRAY),
    ]))
    elements.append(sig_table)
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    elements.append(Paragraph(
        f"Generado por ANIMA HR | {datetime.now().strftime('%d/%m/%Y %H:%M')} | "
        f"Documento emitido conforme al Código del Trabajo de Chile",
        ParagraphStyle("Footer", fontSize=6, textColor=DARK_GRAY, alignment=TA_CENTER)
    ))

    doc.build(elements)
    return filepath


def generate_contract_pdf(contract, employee, company) -> str:
    """Generate a full legal Chilean employment contract per Art. 10 CT."""
    filename = f"contrato_{employee.rut}_{contract.id}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        leftMargin=2.5*cm,
        rightMargin=2.5*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    elements = []
    primary_color, company_name, company_rut, company_address, company_phone, company_city = \
        _company_header_elements(company, elements, getSampleStyleSheet())

    # Title
    contract_type_labels = {
        "indefinido": "CONTRATO DE TRABAJO INDEFINIDO",
        "plazo_fijo": "CONTRATO DE TRABAJO A PLAZO FIJO",
        "obra_faena": "CONTRATO DE TRABAJO POR OBRA O FAENA",
        "part_time": "CONTRATO DE TRABAJO PART-TIME",
    }
    ct = str(contract.contract_type.value if hasattr(contract.contract_type, 'value') else contract.contract_type)
    title = contract_type_labels.get(ct, "CONTRATO DE TRABAJO")

    title_style = ParagraphStyle("CT", fontSize=13, fontName="Helvetica-Bold",
                                  textColor=primary_color, alignment=TA_CENTER, spaceAfter=4)
    elements.append(Paragraph(title, title_style))
    elements.append(Paragraph(
        "Artículo 10 del Código del Trabajo — República de Chile",
        ParagraphStyle("Sub", fontSize=9, textColor=DARK_GRAY, alignment=TA_CENTER)
    ))
    elements.append(Spacer(1, 12))

    body_style = ParagraphStyle("Body", fontSize=9, leading=14, alignment=TA_JUSTIFY)
    clause_title_style = ParagraphStyle("CT2", fontSize=10, fontName="Helvetica-Bold", textColor=primary_color, spaceBefore=10, spaceAfter=4)

    # Contract date
    contract_date = contract.signed_at or contract.start_date
    if contract_date:
        cd = contract_date if hasattr(contract_date, 'month') else datetime.strptime(str(contract_date), "%Y-%m-%d").date()
        month_name = MONTH_NAMES.get(cd.month, str(cd.month))
        date_str = f"{company_city or 'Santiago'}, {cd.day} de {month_name} de {cd.year}"
    else:
        date_str = f"{company_city or 'Santiago'}, {date.today().day} de {MONTH_NAMES[date.today().month]} de {date.today().year}"

    # Full name of employee
    full_name = employee.full_name if hasattr(employee, 'full_name') else f"{employee.first_name} {employee.last_name}"
    nationality = employee.nationality or "Chilena"
    birth_date_str = str(employee.birth_date) if employee.birth_date else "—"
    marital_status_labels = {
        "single": "soltero(a)", "married": "casado(a)", "divorced": "divorciado(a)",
        "widowed": "viudo(a)", "cohabiting": "conviviente civil",
    }
    ms = str(employee.marital_status.value if hasattr(employee.marital_status, 'value') else (employee.marital_status or "single"))
    marital_str = marital_status_labels.get(ms, ms)
    emp_address = employee.address or company_address or "Santiago, Chile"

    # CLÁUSULA PRIMERA
    elements.append(Paragraph("CLÁUSULA PRIMERA: PARTES CONTRATANTES", clause_title_style))
    elements.append(Paragraph(
        f"En {date_str}, entre <b>{company_name}</b>, RUT {company_rut}, "
        f'domiciliada en {company_address or "Santiago"} (en adelante "el Empleador"), '
        f"y <b>{full_name}</b>, RUT {employee.rut}, de nacionalidad {nationality}, "
        f"estado civil {marital_str}, fecha de nacimiento {birth_date_str}, "
        f'domiciliado(a) en {emp_address} (en adelante "el Trabajador"), '
        f"se ha convenido el siguiente Contrato de Trabajo:",
        body_style
    ))

    # CLÁUSULA SEGUNDA — Naturaleza de los servicios
    elements.append(Paragraph("CLÁUSULA SEGUNDA: NATURALEZA DE LOS SERVICIOS (Art. 10 N° 3 CT)", clause_title_style))
    services_desc = contract.services_description if hasattr(contract, 'services_description') and contract.services_description else (
        f"El Trabajador se obliga a prestar sus servicios como <b>{employee.position}</b>"
        + (f", en el departamento de {employee.department}" if employee.department else "")
        + f", desarrollando todas las funciones propias de dicho cargo y aquellas que el Empleador le encomiende "
        f"de conformidad a sus necesidades operativas, en la forma que el Empleador lo determine."
    )
    elements.append(Paragraph(services_desc, body_style))

    # CLÁUSULA TERCERA — Lugar de prestación de servicios
    elements.append(Paragraph("CLÁUSULA TERCERA: LUGAR DE PRESTACIÓN DE SERVICIOS (Art. 10 N° 4 CT)", clause_title_style))
    work_location = contract.work_location if hasattr(contract, 'work_location') and contract.work_location else (company_address or "Santiago, Chile")
    elements.append(Paragraph(
        f"Los servicios convenidos en el presente contrato se prestarán en <b>{work_location}</b>, "
        f"sin perjuicio de que el Empleador pueda requerir al Trabajador que preste servicios en otros "
        f"lugares o ciudades dentro del territorio nacional, previa coordinación entre las partes.",
        body_style
    ))

    # CLÁUSULA CUARTA — Remuneración
    elements.append(Paragraph("CLÁUSULA CUARTA: REMUNERACIÓN (Art. 10 N° 5 CT)", clause_title_style))
    from config import settings as cfg
    base_salary = float(contract.base_salary)
    gratif_type = contract.gratificacion_type or "legal"
    gratif_desc = (
        "conforme al Artículo 50 del Código del Trabajo (25% de las utilidades líquidas, con tope de 4,75 IMM mensual)"
        if gratif_type == "legal" else
        "garantizada equivalente al 25% de la remuneración mensual del Trabajador (Art. 50 CT)"
    )

    elements.append(Paragraph(
        f"El Empleador pagará al Trabajador una <b>remuneración mensual bruta de ${base_salary:,.0f} (pesos chilenos)</b> "
        f"por concepto de sueldo base, más gratificación {gratif_desc}. "
        f"La remuneración se pagará dentro de los primeros cinco días hábiles del mes siguiente al período trabajado, "
        f"mediante transferencia bancaria o el medio que las partes acuerden. "
        f"De la remuneración se efectuarán los descuentos previsionales y legales correspondientes "
        f"(AFP, salud, seguro de cesantía e impuesto único de segunda categoría).",
        body_style
    ))

    # CLÁUSULA QUINTA — Jornada de trabajo
    elements.append(Paragraph("CLÁUSULA QUINTA: JORNADA DE TRABAJO (Art. 10 N° 6 CT)", clause_title_style))
    weekly_hours = contract.weekly_hours or 40
    schedule = contract.schedule_details if hasattr(contract, 'schedule_details') and contract.schedule_details else (
        f"de lunes a viernes, de 9:00 a 18:00 horas, con una hora de colación"
    )
    elements.append(Paragraph(
        f"La jornada ordinaria de trabajo será de <b>{weekly_hours} horas semanales</b>, distribuidas "
        f"{schedule}, de conformidad a la Ley N° 21.561 que redujo la jornada máxima laboral. "
        f"Las horas extraordinarias que eventualmente se laboren serán remuneradas con el recargo legal "
        f"del 50% sobre el valor de la hora ordinaria (Art. 32 CT), debiendo constar en pacto escrito previo.",
        body_style
    ))

    # CLÁUSULA SEXTA — Plazo del contrato
    elements.append(Paragraph("CLÁUSULA SEXTA: PLAZO DEL CONTRATO (Art. 10 N° 7 CT)", clause_title_style))
    start_str = str(contract.start_date)
    if ct == "indefinido":
        plazo_text = (
            f"El presente contrato tendrá vigencia <b>indefinida</b> a partir del {start_str}. "
            f"Su terminación procederá únicamente por alguna de las causales establecidas en los "
            f"Artículos 159, 160 y 161 del Código del Trabajo."
        )
    elif ct == "plazo_fijo":
        end_str = str(contract.end_date) if contract.end_date else "—"
        plazo_text = (
            f"El presente contrato tendrá una vigencia de <b>plazo fijo</b>, desde el {start_str} "
            f"hasta el <b>{end_str}</b>, inclusive. De conformidad al Artículo 159 N° 4 del Código del Trabajo, "
            f"el contrato a plazo fijo no podrá exceder de un año (dos años para cargos gerenciales y técnicos). "
            f"Si el Trabajador continuare prestando servicios con conocimiento del Empleador vencido el plazo, "
            f"el contrato se transformará en indefinido. Del mismo modo, si el trabajador hubiere sido contratado "
            f"por dos o más veces seguidas mediante contratos a plazo fijo, la relación laboral se considerará "
            f"de carácter indefinido."
        )
    elif ct == "obra_faena":
        obra_desc = contract.obra_description if hasattr(contract, 'obra_description') and contract.obra_description else "la obra o faena encomendada"
        plazo_text = (
            f"El presente contrato tendrá vigencia durante la duración de <b>{obra_desc}</b>, "
            f"comenzando el {start_str}. El contrato terminará una vez concluida la obra o faena "
            f"para la cual fue contratado el Trabajador, conforme al Artículo 159 N° 5 del Código del Trabajo."
        )
    else:
        plazo_text = f"El presente contrato regirá desde el {start_str}."
    elements.append(Paragraph(plazo_text, body_style))

    # CLÁUSULA SÉPTIMA — Otros pactos
    elements.append(Paragraph("CLÁUSULA SÉPTIMA: OTROS PACTOS Y BENEFICIOS (Art. 10 N° 8 CT)", clause_title_style))
    additional = contract.additional_clauses if hasattr(contract, 'additional_clauses') and contract.additional_clauses else None
    base_otros = (
        "Las partes acuerdan que el Trabajador cumplirá con el Reglamento Interno de Orden, Higiene y Seguridad "
        "de la empresa, cuya copia le es entregada en este acto. El Trabajador declara conocer y aceptar "
        "las políticas internas de la empresa. Cualquier modificación al presente contrato deberá constar por escrito "
        "y ser firmada por ambas partes."
    )
    if additional:
        elements.append(Paragraph(base_otros + " " + additional, body_style))
    else:
        elements.append(Paragraph(base_otros, body_style))

    # CLÁUSULA OCTAVA — Confidencialidad (if applicable)
    if hasattr(contract, 'has_confidentiality') and contract.has_confidentiality:
        elements.append(Paragraph("CLÁUSULA OCTAVA: CONFIDENCIALIDAD", clause_title_style))
        elements.append(Paragraph(
            "El Trabajador se obliga a guardar estricta reserva y confidencialidad respecto de toda la información, "
            "datos, procesos, fórmulas, estrategias comerciales, información de clientes y demás antecedentes de "
            "carácter reservado del Empleador a los que tenga acceso con ocasión de sus funciones. "
            "Esta obligación subsistirá incluso después del término de la relación laboral.",
            body_style
        ))

    elements.append(Spacer(1, 16))

    # Closing
    elements.append(Paragraph(
        f"El presente contrato se firma en dos ejemplares del mismo tenor y fecha, quedando un ejemplar "
        f"en poder de cada parte contratante.",
        body_style
    ))
    elements.append(Spacer(1, 24))

    # Signatures
    sig_data = [
        ["_______________________________", "_______________________________"],
        ["Empleador", "Trabajador(a)"],
        [company_name, full_name],
        [f"RUT: {company_rut}", f"RUT: {employee.rut}"],
        [company_address or "", emp_address],
    ]
    sig_table = Table(sig_data, colWidths=[9*cm, 9*cm])
    sig_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 2), (-1, -1), DARK_GRAY),
    ]))
    elements.append(sig_table)
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    elements.append(Paragraph(
        f"Generado por ANIMA HR | {datetime.now().strftime('%d/%m/%Y %H:%M')} | "
        f"Documento emitido conforme al Artículo 10 del Código del Trabajo de Chile",
        ParagraphStyle("Footer", fontSize=6, textColor=DARK_GRAY, alignment=TA_CENTER)
    ))

    doc.build(elements)
    return filepath


def generate_libro_remuneraciones_pdf(run, entries, employees: Dict, company=None) -> str:
    """Generate monthly libro de remuneraciones."""
    filename = f"libro_rem_{run.period_year}_{run.period_month:02d}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)

    month_name = MONTH_NAMES.get(run.period_month, str(run.period_month))

    doc = SimpleDocTemplate(filepath, pagesize=landscape(A3), leftMargin=1*cm, rightMargin=1*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)

    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph(
        f"<b>LIBRO DE REMUNERACIONES</b>",
        ParagraphStyle("T", fontSize=14, fontName="Helvetica-Bold", textColor=BLUE, alignment=TA_CENTER)
    ))
    co_name = (company.name if company and company.name else settings.COMPANY_NAME)
    co_rut = (company.rut if company and company.rut else settings.COMPANY_RUT)
    elements.append(Paragraph(
        f"{co_name} — RUT {co_rut}",
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
                      float(getattr(entry, 'pension_alimenticia', 0) or 0) +
                      float(getattr(entry, 'descuento_voluntario', 0) or 0) +
                      float(getattr(entry, 'descuento_vivienda', 0) or 0) +
                      float(getattr(entry, 'descuento_ccaf', 0) or 0) +
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

    col_widths = [2.5*cm, 5.5*cm, 3.5*cm, 2.5*cm, 2.5*cm, 2.2*cm, 2.2*cm,
                  2.8*cm, 2.5*cm, 2.5*cm, 2.2*cm, 2.5*cm, 2.5*cm, 2.8*cm]

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
