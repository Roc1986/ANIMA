import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import date

logger = logging.getLogger(__name__)

SMTP_HOST = "smtp.zoho.com"
SMTP_PORT = 465


def _get_smtp_config():
    """Read email config from environment variables."""
    import os
    return {
        "host": os.environ.get("SMTP_HOST", SMTP_HOST),
        "port": int(os.environ.get("SMTP_PORT", SMTP_PORT)),
        "user": os.environ.get("SMTP_USER", ""),
        "password": os.environ.get("SMTP_PASSWORD", ""),
        "from_name": os.environ.get("SMTP_FROM_NAME", "ANIMA HR"),
    }


def send_email(to: str, subject: str, html_body: str) -> bool:
    cfg = _get_smtp_config()
    if not cfg["user"] or not cfg["password"]:
        logger.warning("Email not configured — skipping send to %s", to)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{cfg['from_name']} <{cfg['user']}>"
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html", "utf-8"))
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(cfg["host"], cfg["port"], context=ctx) as server:
            server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["user"], to, msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)
        return False


def _reminder_html(event_name: str, event_date: date, days_left: int, company_name: str) -> str:
    date_str = event_date.strftime("%d/%m/%Y")
    urgency_color = "#e53e3e" if days_left <= 2 else "#d97706"
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f7fafc; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
    <div style="background: #1e3a5f; padding: 24px 32px;">
      <h1 style="color: white; margin: 0; font-size: 22px;">ANIMA HR</h1>
      <p style="color: #93c5fd; margin: 4px 0 0; font-size: 13px;">Sistema de Recursos Humanos</p>
    </div>
    <div style="padding: 32px;">
      <div style="background: {urgency_color}15; border-left: 4px solid {urgency_color};
                  padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <p style="margin: 0; color: {urgency_color}; font-weight: 700; font-size: 15px;">
          ⏰ Recordatorio: quedan <strong>{days_left} día{'s' if days_left != 1 else ''}</strong>
        </p>
      </div>
      <h2 style="color: #1e3a5f; margin: 0 0 8px; font-size: 20px;">{event_name}</h2>
      <p style="color: #4a5568; font-size: 15px; margin: 0 0 24px;">
        Fecha límite: <strong>{date_str}</strong>
      </p>
      <p style="color: #718096; font-size: 13px; margin: 0;">
        Este recordatorio fue generado automáticamente por ANIMA HR para <strong>{company_name}</strong>.
      </p>
    </div>
    <div style="background: #f7fafc; padding: 16px 32px; text-align: center;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">
        Ingresa a <a href="http://animahr.cl" style="color: #1e3a5f;">animahr.cl</a> para más detalles
      </p>
    </div>
  </div>
</body>
</html>
"""


def send_deadline_reminder(to: str, event_name: str, event_date: date, days_left: int, company_name: str) -> bool:
    subject = f"[ANIMA HR] Recordatorio: {event_name} — {days_left} día{'s' if days_left != 1 else ''} restante{'s' if days_left != 1 else ''}"
    html = _reminder_html(event_name, event_date, days_left, company_name)
    return send_email(to, subject, html)
