import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from config import settings
from html import escape
from typing import List

logger = logging.getLogger(__name__)


def _parse_recipients(value: str) -> List[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _open_smtp_connection():
    if settings.SMTP_PORT == 465:
        server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        return server

    server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
    return server

def send_support_email(name: str, email: str, subject: str, message: str) -> bool:
    """
    Sends a support ticket email using SMTP.
    Returns True if successful, False otherwise.
    """
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP configuration is missing. Cannot send support email.")
        return False

    recipients = _parse_recipients(settings.SUPPORT_EMAIL) or [settings.SMTP_USER]

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[Support Ticket] {subject}"
        msg["From"] = settings.SMTP_USER
        msg["To"] = ", ".join(recipients)
        msg["Reply-To"] = email

        # Create plain-text and HTML versions
        text = f"Name: {name}\nEmail: {email}\nSubject: {subject}\n\nMessage:\n{message}"
        
        safe_message = escape(message).replace("\n", "<br>")
        html = f"""\
        <html>
          <body>
            <h2>New Support Ticket</h2>
            <p><strong>Name:</strong> {escape(name)}</p>
            <p><strong>Email:</strong> {escape(email)}</p>
            <p><strong>Subject:</strong> {escape(subject)}</p>
            <hr>
            <p><strong>Message:</strong></p>
            <p>{safe_message}</p>
          </body>
        </html>
        """

        part1 = MIMEText(text, "plain", "utf-8")
        part2 = MIMEText(html, "html", "utf-8")

        msg.attach(part1)
        msg.attach(part2)

        user_ack = MIMEMultipart("alternative")
        user_ack["Subject"] = f"We received your request: {subject}"
        user_ack["From"] = settings.SMTP_USER
        user_ack["To"] = email
        user_ack["Reply-To"] = recipients[0]

        ack_text = (
            f"Hi {name},\n\n"
            "Thanks for contacting Resiko support. We have received your request and will get back to you soon.\n\n"
            "Your message summary:\n"
            f"Subject: {subject}\n"
            f"Message: {message}\n\n"
            "Best regards,\nResiko Support"
        )
        ack_html = f"""\
        <html>
          <body>
            <p>Hi {escape(name)},</p>
            <p>Thanks for contacting <strong>Resiko support</strong>. We received your request and will get back to you soon.</p>
            <p><strong>Your message summary</strong></p>
            <p><strong>Subject:</strong> {escape(subject)}<br>
            <strong>Message:</strong> {safe_message}</p>
            <p>Best regards,<br>Resiko Support</p>
          </body>
        </html>
        """

        user_ack.attach(MIMEText(ack_text, "plain", "utf-8"))
        user_ack.attach(MIMEText(ack_html, "html", "utf-8"))

        server = _open_smtp_connection()
        try:
            server.sendmail(settings.SMTP_USER, recipients, msg.as_string())
            server.sendmail(settings.SMTP_USER, [email], user_ack.as_string())
        finally:
            server.quit()

        logger.info(f"Support email sent successfully for subject: {subject}")
        return True
    except Exception as e:
        logger.exception(f"Failed to send support email: {e}")
        return False
