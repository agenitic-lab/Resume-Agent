#!/usr/bin/env python
"""
Email Configuration Diagnostic Tool
Tests if your SMTP credentials are working
"""
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

print("=" * 60)
print(" EMAIL CONFIGURATION DIAGNOSTIC")
print("=" * 60)
print()

# Check configuration
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = os.getenv("SMTP_PORT")
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

print("Current Configuration:")
print(f"  SMTP_HOST: {SMTP_HOST}")
print(f"  SMTP_PORT: {SMTP_PORT}")
print(f"  SMTP_USER: {SMTP_USER}")
print(f"  Password: {'SET' if SMTP_PASSWORD else 'NOT SET'}")
print()

if not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD]):
    print("ERROR: Missing SMTP configuration in .env file")
    exit(1)

# Test SMTP connection
print("Testing SMTP Connection...")
print()

import smtplib

try:
    if int(SMTP_PORT) == 465:
        server = smtplib.SMTP_SSL(SMTP_HOST, int(SMTP_PORT), timeout=10)
        print("✓ Connected to SMTP server (SSL)")
    else:
        server = smtplib.SMTP(SMTP_HOST, int(SMTP_PORT), timeout=10)
        server.starttls()
        print("✓ Connected to SMTP server (TLS)")
    
    # Test login
    server.login(SMTP_USER, SMTP_PASSWORD)
    print("✓ Login successful!")
    print()
    print("SUCCESS: Your SMTP configuration is working correctly!")
    server.quit()
    
except smtplib.SMTPAuthenticationError as e:
    print(f"✗ Authentication Failed: {e}")
    print()
    print("SOLUTION: Your SMTP password may be incorrect.")
    print()
    print("For Zoho Mail:")
    print("  1. Go to https://mailadmin.zoho.com/")
    print("  2. Settings → Security → Generate App Password")
    print("  3. Update SMTP_PASSWORD in .env file")
    print()
    
except smtplib.SMTPException as e:
    print(f"✗ SMTP Error: {e}")
    print()
    print("Check your SMTP_HOST and SMTP_PORT settings")
    
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")

print()
print("=" * 60)
