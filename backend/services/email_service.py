import smtplib
import os
import re
import tempfile
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from config import settings


def rut_password(rut: str) -> str:
    """Extract last 4 digits before the verification digit from a Chilean RUT.
    E.g. '12.345.678-9' or '12345678-9' → '5678'
    """
    clean = re.sub(r'[.\s]', '', rut or '')
    # Remove verification digit (after dash)
    body = clean.split('-')[0]
    # Keep only digits
    digits = re.sub(r'\D', '', body)
    return digits[-4:] if len(digits) >= 4 else digits.zfill(4)


def encrypt_pdf(pdf_path: str, password: str) -> str:
    """Encrypt a PDF with a user password and return path to encrypted file."""
    try:
        from pypdf import PdfReader, PdfWriter
        reader = PdfReader(pdf_path)
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        writer.encrypt(user_password=password, owner_password=None, use_128bit=True)
        fd, enc_path = tempfile.mkstemp(suffix='.pdf')
        os.close(fd)
        with open(enc_path, 'wb') as f:
            writer.write(f)
        return enc_path
    except Exception:
        # If encryption fails, return original unencrypted PDF
        return pdf_path


def send_liquidacion_email(
    to_email: str,
    employee_name: str,
    period_month: int,
    period_year: int,
    pdf_path: str,
    pdf_password: str | None = None,
) -> None:
    """Send liquidación PDF to employee via email."""
    msg = MIMEMultipart()
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = f"Liquidación de Sueldo {period_month:02d}/{period_year}"

    password_line = (
        f"\nPara abrir el documento, ingrese como contraseña los últimos 4 dígitos de su RUT (antes del dígito verificador).\n"
        if pdf_password
        else ""
    )

    body = f"""Estimado/a {employee_name},

Adjunto encontrará su liquidación de sueldo correspondiente al período {period_month:02d}/{period_year}.
{password_line}
Saludos,
{settings.SMTP_FROM_NAME}
"""
    msg.attach(MIMEText(body, "plain", "utf-8"))

    # Encrypt PDF if password provided
    attachment_path = encrypt_pdf(pdf_path, pdf_password) if pdf_password else pdf_path
    enc_applied = attachment_path != pdf_path

    with open(attachment_path, "rb") as f:
        part = MIMEApplication(f.read(), Name=f"liquidacion_{period_month:02d}_{period_year}.pdf")
    part["Content-Disposition"] = f'attachment; filename="liquidacion_{period_month:02d}_{period_year}.pdf"'
    msg.attach(part)

    # Clean up temp encrypted file
    if enc_applied:
        try:
            os.unlink(attachment_path)
        except Exception:
            pass

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())


def send_deadline_reminder(to: str, event_name: str, event_date, days_left: int, company_name: str) -> None:
    """Send a deadline reminder email to an admin."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        return
    msg = MIMEMultipart()
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to
    msg["Subject"] = f"Recordatorio: {event_name} en {days_left} días — {company_name}"

    body = f"""Estimado/a administrador/a de {company_name},

Le recordamos que se acerca el siguiente vencimiento:

  {event_name}
  Fecha: {event_date.strftime('%d/%m/%Y')}
  Días restantes: {days_left}

Por favor tome las acciones necesarias a tiempo.

Saludos,
{settings.SMTP_FROM_NAME}
"""
    msg.attach(MIMEText(body, "plain", "utf-8"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, to, msg.as_string())
