import os
import re
import base64
import tempfile
import urllib.request
import urllib.parse
import json
from config import settings


def rut_password(rut: str) -> str:
    clean = re.sub(r'[.\s]', '', rut or '')
    body = clean.split('-')[0]
    digits = re.sub(r'\D', '', body)
    return digits[-4:] if len(digits) >= 4 else digits.zfill(4)


def encrypt_pdf(pdf_path: str, password: str) -> str:
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
        return pdf_path


def _get_zoho_access_token(client_id, client_secret, refresh_token):
    token_data = urllib.parse.urlencode({
        'refresh_token': refresh_token,
        'client_id': client_id,
        'client_secret': client_secret,
        'grant_type': 'refresh_token',
    }).encode()
    req = urllib.request.Request(
        'https://accounts.zoho.com/oauth/v2/token',
        data=token_data,
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    token = data.get('access_token')
    if not token:
        raise ValueError(f"No se pudo obtener token de Zoho: {data}")
    return token


def _send_via_zoho_api(from_address, from_name, to_email, subject, body_text,
                        attachment_path, attachment_name, zoho_client_id,
                        zoho_client_secret, zoho_refresh_token, zoho_account_id):
    access_token = _get_zoho_access_token(zoho_client_id, zoho_client_secret, zoho_refresh_token)
    attachments = []
    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, 'rb') as f:
            attachments = [{'name': attachment_name, 'content': base64.b64encode(f.read()).decode(), 'mimeType': 'application/pdf'}]
    body = {'fromAddress': from_address, 'toAddress': to_email, 'subject': subject, 'content': body_text}
    if attachments:
        body['attachments'] = attachments
    payload = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(
        f'https://mail.zoho.com/api/accounts/{zoho_account_id}/messages',
        data=payload,
        headers={'Authorization': f'Zoho-oauthtoken {access_token}', 'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
    status_code = result.get('status', {}).get('code')
    if status_code not in (200, 201):
        raise ValueError(f"Error Zoho API ({status_code}): {result}")


def _send_via_smtp(host, port, user, password, from_name, to_email, subject, body_text, attachment_path, attachment_name):
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.application import MIMEApplication
    msg = MIMEMultipart()
    msg["From"] = f"{from_name} <{user}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body_text, "plain", "utf-8"))
    with open(attachment_path, "rb") as f:
        part = MIMEApplication(f.read(), Name=attachment_name)
    part["Content-Disposition"] = f'attachment; filename="{attachment_name}"'
    msg.attach(part)
    with smtplib.SMTP(host, port, timeout=30) as server:
        server.ehlo()
        server.starttls()
        server.login(user, password)
        server.sendmail(user, to_email, msg.as_string())


def _zoho_env_vars():
    return (
        os.environ.get('ZOHO_CLIENT_ID') or getattr(settings, 'ZOHO_CLIENT_ID', None),
        os.environ.get('ZOHO_CLIENT_SECRET') or getattr(settings, 'ZOHO_CLIENT_SECRET', None),
        os.environ.get('ZOHO_REFRESH_TOKEN') or getattr(settings, 'ZOHO_REFRESH_TOKEN', None),
        os.environ.get('ZOHO_ACCOUNT_ID') or getattr(settings, 'ZOHO_ACCOUNT_ID', None),
    )


def send_liquidacion_email(
    to_email, employee_name, period_month, period_year, pdf_path,
    pdf_password=None, smtp_host=None, smtp_port=None,
    smtp_user=None, smtp_password=None, smtp_from_name=None,
):
    user = smtp_user or settings.SMTP_USER
    password = smtp_password or settings.SMTP_PASSWORD
    from_name = smtp_from_name or settings.SMTP_FROM_NAME or user
    if not user or not password:
        raise ValueError("Correo de envío no configurado. Configure el correo en Configuración de Empresa.")
    subject = f"Liquidación de Sueldo {period_month:02d}/{period_year}"
    password_line = (
        "\nPara abrir el documento, ingrese como contraseña los últimos 4 dígitos de su RUT (antes del dígito verificador).\n"
        if pdf_password else ""
    )
    body_text = (
        f"Estimado/a {employee_name},\n\n"
        f"Adjunto encontrará su liquidación de sueldo correspondiente al período {period_month:02d}/{period_year}.\n"
        f"{password_line}\nSaludos,\n{from_name}\n"
    )
    attachment_path = encrypt_pdf(pdf_path, pdf_password) if pdf_password else pdf_path
    enc_applied = attachment_path != pdf_path
    attachment_name = f"liquidacion_{period_month:02d}_{period_year}.pdf"
    try:
        client_id, client_secret, refresh_token, account_id = _zoho_env_vars()
        if client_id and client_secret and refresh_token and account_id:
            _send_via_zoho_api(user, from_name, to_email, subject, body_text,
                               attachment_path, attachment_name, client_id,
                               client_secret, refresh_token, account_id)
        else:
            host = smtp_host or settings.SMTP_HOST
            port = smtp_port or settings.SMTP_PORT
            _send_via_smtp(host, port, user, password, from_name, to_email,
                          subject, body_text, attachment_path, attachment_name)
    finally:
        if enc_applied:
            try:
                os.unlink(attachment_path)
            except Exception:
                pass


def send_deadline_reminder(to, event_name, event_date, days_left, company_name):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        return
    subject = f"Recordatorio: {event_name} en {days_left} días — {company_name}"
    body_text = (
        f"Estimado/a administrador/a de {company_name},\n\n"
        f"Le recordamos que se acerca el siguiente vencimiento:\n\n"
        f"  {event_name}\n  Fecha: {event_date.strftime('%d/%m/%Y')}\n  Días restantes: {days_left}\n\n"
        f"Por favor tome las acciones necesarias a tiempo.\n\nSaludos,\n{settings.SMTP_FROM_NAME}\n"
    )
    try:
        client_id, client_secret, refresh_token, account_id = _zoho_env_vars()
        if client_id and client_secret and refresh_token and account_id:
            _send_via_zoho_api(settings.SMTP_USER, settings.SMTP_FROM_NAME, to, subject, body_text,
                               '', '', client_id, client_secret, refresh_token, account_id)
        else:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            msg = MIMEMultipart()
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
            msg["To"] = to
            msg["Subject"] = subject
            msg.attach(MIMEText(body_text, "plain", "utf-8"))
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, to, msg.as_string())
    except Exception:
        pass
