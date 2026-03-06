import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
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


def send_support_reply(ticket_subject: str, user_email: str, user_name: str, reply_message: str) -> bool:
    """
    Sends a reply to a support ticket via email.
    Returns True if successful, False otherwise.
    """
    logger.info(f"=== Starting support reply send process ===")
    logger.info(f"Replying to: {user_email}, Subject: {ticket_subject}")
    
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.error("SMTP configuration is missing")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Re: {ticket_subject}"
        msg["From"] = settings.SMTP_USER
        msg["To"] = user_email

        # Create plain-text and HTML versions
        text = f"Hi {user_name},\n\n{reply_message}\n\nBest regards,\nResiko Support"
        
        safe_message = escape(reply_message).replace("\n", "<br>")
        html = f"""\
        <html>
          <body>
            <p>Hi {escape(user_name)},</p>
            <p>{safe_message}</p>
            <hr>
            <p>Best regards,<br><strong>Resiko Support</strong></p>
          </body>
        </html>
        """

        part1 = MIMEText(text, "plain", "utf-8")
        part2 = MIMEText(html, "html", "utf-8")

        msg.attach(part1)
        msg.attach(part2)

        logger.info("Reply message created, attempting SMTP connection...")
        server = _open_smtp_connection()
        try:
            logger.info(f"Sending reply to {user_email}")
            server.sendmail(settings.SMTP_USER, [user_email], msg.as_string())
            logger.info("Reply email sent successfully")
        finally:
            server.quit()
            logger.info("SMTP connection closed")

        logger.info(f"Support reply sent successfully")
        return True
    except Exception as e:
        logger.error(f"=== FAILED TO SEND REPLY ===")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception message: {e}")
        logger.exception(f"Full traceback:")
        return False


def _get_logo_path() -> str | None:
    """Find the Resiko logo file from known locations."""
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "resiko-logo.png"),
        os.path.join(os.path.dirname(__file__), "..", "resiko-logo-enhanced.png"),
    ]
    for path in candidates:
        abs_path = os.path.abspath(path)
        if os.path.isfile(abs_path):
            return abs_path
    return None


def send_welcome_email(name: str, email: str) -> bool:
    """
    Sends a welcome email to a newly signed-up user with the Resiko logo.
    Returns True if successful, False otherwise.
    """
    logger.info(f"=== Starting welcome email send process ===")
    logger.info(f"Recipient: {email}, Name: {name}")

    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.error("SMTP configuration is missing — skipping welcome email")
        return False

    try:
        # Use "related" so we can embed the logo inline via CID
        msg = MIMEMultipart("related")
        msg["Subject"] = f"Welcome to Resiko, {name}!"
        msg["From"] = settings.SMTP_USER
        msg["To"] = email

        safe_name = escape(name)

        html_body = f"""\
        <html>
          <body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <!-- Header with logo -->
                    <tr>
                      <td align="center" style="background-color:#0f172a; padding:32px 40px;">
                        <img src="cid:resiko_logo" alt="Resiko" width="160" style="display:block;" />
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:40px;">
                        <h1 style="color:#0f172a; font-size:24px; margin:0 0 16px 0;">Welcome aboard, {safe_name}!</h1>
                        <p style="color:#475569; font-size:16px; line-height:1.6; margin:0 0 16px 0;">
                          Thank you for signing up with <strong>Resiko</strong> — your AI-powered resume optimization platform.
                        </p>
                        <p style="color:#475569; font-size:16px; line-height:1.6; margin:0 0 16px 0;">
                          We're excited to help you craft the perfect resume that stands out to recruiters and passes ATS screening with confidence.
                        </p>
                        <p style="color:#475569; font-size:16px; line-height:1.6; margin:0 0 24px 0;">
                          Here's what you can do with Resiko:
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                          <tr>
                            <td style="padding:8px 0; color:#475569; font-size:15px;">&#10003;&nbsp; Upload your resume and get an instant ATS compatibility score</td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0; color:#475569; font-size:15px;">&#10003;&nbsp; Receive AI-driven suggestions tailored to your target job</td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0; color:#475569; font-size:15px;">&#10003;&nbsp; Optimize your resume with one click and download the improved version</td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0; color:#475569; font-size:15px;">&#10003;&nbsp; Choose from professional templates to match your style</td>
                          </tr>
                        </table>
                        <p style="color:#475569; font-size:16px; line-height:1.6; margin:0 0 8px 0;">
                          If you have any questions, feel free to reach out to our support team — we're always here to help.
                        </p>
                        <p style="color:#0f172a; font-size:16px; line-height:1.6; margin:24px 0 0 0;">
                          Best regards,<br><strong>The Resiko Team</strong>
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td align="center" style="background-color:#f8fafc; padding:20px 40px; border-top:1px solid #e2e8f0;">
                        <p style="color:#94a3b8; font-size:13px; margin:0;">
                          &copy; 2025 Resiko. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        """

        plain_text = (
            f"Welcome to Resiko, {name}!\n\n"
            "Thank you for signing up with Resiko — your AI-powered resume optimization platform.\n\n"
            "We're excited to help you craft the perfect resume that stands out to recruiters "
            "and passes ATS screening with confidence.\n\n"
            "Here's what you can do with Resiko:\n"
            "  - Upload your resume and get an instant ATS compatibility score\n"
            "  - Receive AI-driven suggestions tailored to your target job\n"
            "  - Optimize your resume with one click and download the improved version\n"
            "  - Choose from professional templates to match your style\n\n"
            "If you have any questions, feel free to reach out to our support team.\n\n"
            "Best regards,\n"
            "The Resiko Team"
        )

        # Build the alternative part (plain text + HTML)
        msg_alternative = MIMEMultipart("alternative")
        msg_alternative.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg_alternative.attach(MIMEText(html_body, "html", "utf-8"))
        msg.attach(msg_alternative)

        # Attach the logo image inline
        logo_path = _get_logo_path()
        if logo_path:
            with open(logo_path, "rb") as img_file:
                logo_image = MIMEImage(img_file.read(), _subtype="png")
                logo_image.add_header("Content-ID", "<resiko_logo>")
                logo_image.add_header("Content-Disposition", "inline", filename="resiko-logo.png")
                msg.attach(logo_image)
            logger.info(f"Logo attached from: {logo_path}")
        else:
            logger.warning("Logo file not found — sending welcome email without logo")

        logger.info("Welcome email message created, attempting SMTP connection...")
        server = _open_smtp_connection()
        try:
            logger.info(f"Sending welcome email to {email}")
            server.sendmail(settings.SMTP_USER, [email], msg.as_string())
            logger.info("Welcome email sent successfully")
        finally:
            server.quit()
            logger.info("SMTP connection closed")

        return True
    except Exception as e:
        logger.error(f"=== FAILED TO SEND WELCOME EMAIL ===")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception message: {e}")
        logger.exception(f"Full traceback:")
        return False
