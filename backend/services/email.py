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
    try:
        logger.info(f"Attempting SMTP connection to {settings.SMTP_HOST}:{settings.SMTP_PORT}")
        logger.info(f"Using account: {settings.SMTP_USER}")
        
        if settings.SMTP_PORT == 465:
            logger.info("Using SMTP_SSL (port 465)")
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
            logger.info("SSL connection established, attempting login...")
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            logger.info("SMTP_SSL login successful")
            return server
        else:
            logger.info(f"Using SMTP (port {settings.SMTP_PORT}) with STARTTLS")
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
            server.ehlo()
            server.starttls()
            server.ehlo()
            logger.info("TLS connection established, attempting login...")
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            logger.info("SMTP login successful")
            return server
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Authentication Error: {e}")
        logger.error(f"Error code: {e.smtp_code}, Message: {e.smtp_error}")
        raise
    except smtplib.SMTPException as e:
        logger.error(f"SMTP Error: {e}")
        raise
    except Exception as e:
        logger.error(f"Connection Error: {type(e).__name__}: {e}")
        raise

def send_support_email(name: str, email: str, subject: str, message: str) -> bool:
    """
    Sends a support ticket email using SMTP.
    Returns True if successful, False otherwise.
    """
    logger.info(f"=== Starting email send process ===")
    logger.info(f"Recipient: {email}, Subject: {subject}")
    
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.error("SMTP configuration is missing:")
        logger.error(f"  SMTP_HOST: {settings.SMTP_HOST}")
        logger.error(f"  SMTP_USER: {settings.SMTP_USER}")
        logger.error(f"  SMTP_PASSWORD: {'SET' if settings.SMTP_PASSWORD else 'NOT SET'}")
        return False

    recipients = _parse_recipients(settings.SUPPORT_EMAIL) or [settings.SMTP_USER]
    logger.info(f"Support email recipients: {recipients}")

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

        logger.info("Messages created, attempting SMTP connection...")
        server = _open_smtp_connection()
        try:
            logger.info(f"Sending support ticket to {recipients}")
            server.sendmail(settings.SMTP_USER, recipients, msg.as_string())
            logger.info("Support ticket email sent successfully")
            
            logger.info(f"Sending confirmation to user {email}")
            server.sendmail(settings.SMTP_USER, [email], user_ack.as_string())
            logger.info("User confirmation email sent successfully")
        finally:
            server.quit()
            logger.info("SMTP connection closed")

        logger.info(f"Support email process completed successfully for subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"=== FAILED TO SEND EMAIL ===")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception message: {e}")
        logger.exception(f"Full traceback:")
        return False
