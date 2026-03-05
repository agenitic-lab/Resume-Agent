import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = "smtp.zoho.com"
SMTP_PORT = 465
SMTP_USER = "support@resiko.app"
SMTP_PASSWORD = "SxwusmvxsGXt"

print("Testing SMTP Connection...")
print(f"Host: {SMTP_HOST}:{SMTP_PORT}")
print(f"User: {SMTP_USER}")
print()

try:
    # Test connection
    server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)
    print("✓ Connected to SMTP server")
    
    # Test login
    server.login(SMTP_USER, SMTP_PASSWORD)
    print("✓ Login successful!")
    
    # Try sending a test email
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "[Test] Email Configuration"
    msg["From"] = SMTP_USER
    msg["To"] = "support@resiko.app"
    
    text = "This is a test email to verify SMTP is working."
    msg.attach(MIMEText(text, "plain"))
    
    server.sendmail(SMTP_USER, ["support@resiko.app"], msg.as_string())
    print("✓ Test email sent successfully!")
    
    server.quit()
    
except smtplib.SMTPAuthenticationError as e:
    print(f"✗ Authentication Failed: {e}")
    print("  The password may be incorrect or the account needs special setup.")
except Exception as e:
    print(f"✗ Error: {e}")
