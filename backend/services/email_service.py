import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from config import settings


def send_liquidacion_email(to_email: str, employee_name: str, period_month: int, period_year: int, pdf_path: str) -> None:
    """Send liquidación PDF to employee via email."""
    msg = MIMEMultipart()
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = f"Liquidación de Sueldo {period_month:02d}/{period_year}"

    body = f"""Estimado/a {employee_name},

Adjunto encontrará su liquidación de sueldo correspondiente al período {period_month:02d}/{period_year}.

Saludos,
{settings.SMTP_FROM_NAME}
"""
    msg.attach(MIMEText(body, "plain", "utf-8"))

    with open(pdf_path, "rb") as f:
        part = MIMEApplication(f.read(), Name=f"liquidacion_{period_month:02d}_{period_year}.pdf")
    part["Content-Disposition"] = f'attachment; filename="liquidacion_{period_month:02d}_{period_year}.pdf"'
    msg.attach(part)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
