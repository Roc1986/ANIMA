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
from reportlab.lib.pagesizes import A4, letter
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

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        leftMargin=2*cm,
        rightMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    elements = []
    primary_color, company_name, company_rut, company_address, company_phone, company_city = \
        _company_header_elements(company, elements, getSampleStyleSheet())

    title_style = ParagraphStyle("FT", fontSize=15, fontName="Helvetica-Bold",
                                  textColor=primary_color, alignment=TA_CENTER, spaceAfter=4)
    elements.append(Paragraph("FINIQUITO DE CONTRATO DE TRABAJO", title_style))
    elements.append(Paragraph(
        "Artículo 177 del Código del Trabajo",
        ParagraphStyle("Sub", fontSize=9, textColor=DARK_GRAY, alignment=TA_CENTER)
    ))
    elements.append(Spacer(1, 12))

    # Party info
    body_style = ParagraphStyle("Body", fontSize=9, leading=14, alignment=TA_JUSTIFY)
    city = company_city or "Santiago"
    term_date_str = data.get("termination_date", "")
    if term_date_str:
        try:
            td = datetime.strptime(term_date_str, "%Y-%m-%d")
            term_date_str = f"{td.day} de {MONTH_NAMES[td.month]} de {td.year}"
        except Exception:
            pass

    intro = (
        f"En {city}, a {term_date_str}, entre <b>{company_name}</b>, RUT {company_rut}, "
        f"domiciliada en {company_address} (en adelante "la Empresa"), representada para estos efectos por su empleador, "
        f"y el(la) trabajador(a) <b>{data.get('employee_name', '')}</b>, RUT <b>{data.get('employee_rut', '')}</b>, "
        f"domiciliado(a) en Chile (en adelante "el(la) Trabajador(a)"), se ha convenido el siguiente finiquito:"
    )
    elements.append(Paragraph(intro, body_style))
    elements.append(Spacer(1, 10))

    # Work details
    emp_data = [
        ["Trabajador(a):", data.get("employee_name", "")],
        ["RUT:", data.get("employee_rut", "")],
        ["Cargo:", data.get("employee_position", "")],
        ["Fecha de Ingreso:", data.get("hire_date", "")],
        ["Fecha de Término:", data.get("termination_date", "")],
        ["Causal de Término:", data.get("termination_cause", "")],
        ["Años de servicio:", f"{data.get('years_of_service', 0):.2f} años ({data.get('months_of_service', 0)} meses)"],
        ["Última remuneración:", _fmt_clp(data.get("last_salary", 0))],
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
    elements.append(Spacer(1, 12))

    # Legal reference for causal
    cause = data.get("termination_cause", "")
    if "159" in cause:
        cause_text = (
            "El contrato de trabajo termina por la causal establecida en el <b>Artículo 159 del Código del Trabajo</b> "
            "(mutuo acuerdo / vencimiento del plazo / conclusión del trabajo o servicio / caso fortuito o fuerza mayor)."
        )
    elif "160" in cause:
        cause_text = (
            "El contrato de trabajo termina por la causal establecida en el <b>Artículo 160 del Código del Trabajo</b>, "
            "imputable al trabajador, no dando lugar al pago de indemnización por años de servicio."
        )
    elif "161" in cause:
        cause_text = (
            "El contrato de trabajo termina por la causal de necesidades de la empresa establecida en el "
            "<b>Artículo 161 del Código del Trabajo</b>, dando lugar al pago de indemnización por años de servicio "
            "conforme al Artículo 163 del mismo cuerpo legal."
        )
    else:
        cause_text = f"El contrato de trabajo termina por la causal: {cause}."

    elements.append(Paragraph(cause_text, body_style))
    elements.append(Spacer(1, 10))

    # Settlement table
    elements.append(Paragraph("<b>LIQUIDACIÓN DE HABERES</b>",
                               ParagraphStyle("LH", fontSize=10, fontName="Helvetica-Bold", textColor=primary_color)))
    elements.append(Spacer(1, 6))

    breakdown = data.get("breakdown", {})
    settlement_rows = [
        [Paragraph("<b>Concepto</b>", ParagraphStyle("H", fontSize=8, textColor=colors.white, fontName="Helvetica-Bold")),
         Paragraph("<b>Detalle</b>", ParagraphStyle("H", fontSize=8, textColor=colors.white, fontName="Helvetica-Bold")),
         Paragraph("<b>Monto</b>", ParagraphStyle("H", fontSize=8, textColor=colors.white, fontName="Helvetica-Bold", alignment=TA_RIGHT))],
    ]

    def add_concept(label, detail, amount):
        settlement_rows.append([
            label, detail,
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
        vac_detail = (f"{breakdown.get('total_vacation_days', 0):.2f} días × {_fmt_clp(breakdown.get('daily_salary', 0))}/día "
                      f"({breakdown.get('vacation_earned_days', 0):.2f} ganados + {breakdown.get('pending_vacation_days', 0):.2f} pendientes)")
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
    elements.append(st)
    elements.append(Spacer(1, 8))

    # UF reference
    uf_val = breakdown.get("uf_value", 0)
    if uf_val:
        elements.append(Paragraph(
            f"Valor UF a la fecha: {_fmt_clp(uf_val)} | Tope indemnización (90 UF): {_fmt_clp(breakdown.get('uf_cap', 0))}",
            ParagraphStyle("UF", fontSize=7, textColor=DARK_GRAY)
        ))
    elements.append(Spacer(1, 10))

    # Declaration
    declaration = (
        "El trabajador declara recibir a su entera satisfacción las sumas indicadas, y otorga el más amplio "
        "y completo finiquito a la empresa, sin reserva ni condición alguna, renunciando expresamente a "
        "cualquier acción, derecho o reclamación de carácter laboral, previsional o de cualquier otro tipo "
        "que pudiera corresponderle con ocasión del presente contrato de trabajo y su término, "
        "conforme al <b>Artículo 177 del Código del Trabajo</b>."
    )
    elements.append(Paragraph(declaration, body_style))
    elements.append(Spacer(1, 24))

    # Signatures — 4 signature lines
    sig_data = [
        ["_______________________", "_______________________", "_______________________", "_______________________"],
        ["Empleador", "Trabajador(a)", "Testigo", "Delegado Sindical (si aplica)"],
        [company_name, data.get("employee_name", ""), "", ""],
        [f"RUT: {company_rut}", f"RUT: {data.get('employee_rut', '')}", "RUT:", ""],
    ]
    sig_table = Table(sig_data, colWidths=[4*cm, 4*cm, 4*cm, 4.5*cm])
    sig_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 2), (-1, -1), DARK_GRAY),
    ]))
    elements.append(sig_table)
    elements.append(Spacer(1, 10))

    elements.append(Paragraph(
        "Este finiquito debe ser ratificado ante Notario Público o Inspector del Trabajo para tener plena validez.",
        ParagraphStyle("Note", fontSize=7, textColor=DARK_GRAY, alignment=TA_CENTER, fontName="Helvetica-BoldOblique")
    ))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    elements.append(Paragraph(
        f"Generado por ANIMA HR | {datetime.now().strftime('%d/%m/%Y %H:%M')} | "
        f"Documento sujeto a ratificación conforme Art. 177 Código del Trabajo",
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
