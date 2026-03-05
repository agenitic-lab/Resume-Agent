import smtplib

print("Testing Zoho SMTP...")
try:
    server = smtplib.SMTP_SSL('smtp.zoho.com', 465, timeout=10)
    print("Connected")
    server.login('support@resiko.app', 'SxwusmvxsGXt')
    print("SUCCESS - Login worked!")
    server.quit()
except smtplib.SMTPAuthenticationError:
    print("FAILED - Authentication error (wrong password)")
except Exception as e:
    print(f"FAILED - {type(e).__name__}: {e}")
