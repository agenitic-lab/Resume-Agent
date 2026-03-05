#!/usr/bin/env python3
"""
Comprehensive SMTP Diagnostic Script
This will show you exactly what's happening with your email configuration
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import smtplib
from config import settings
import logging

# Set up detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(name)s - %(levelname)s - %(message)s'
)

print("=" * 80)
print("COMPREHENSIVE EMAIL DIAGNOSTIC")
print("=" * 80)
print()

print("1. CONFIGURATION LOADED FROM .ENV")
print("-" * 80)
print(f"SMTP_HOST:     {settings.SMTP_HOST}")
print(f"SMTP_PORT:     {settings.SMTP_PORT}")
print(f"SMTP_USER:     {settings.SMTP_USER}")
print(f"SMTP_PASSWORD: {settings.SMTP_PASSWORD}")
print(f"SUPPORT_EMAIL: {settings.SUPPORT_EMAIL}")
print()

print("2. TESTING SMTP CONNECTION")
print("-" * 80)
try:
    print(f"Connecting to {settings.SMTP_HOST}:{settings.SMTP_PORT}...")
    
    if settings.SMTP_PORT == 465:
        print("Using SSL connection...")
        server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
        print("✓ SSL connection established")
        
        print(f"Logging in as {settings.SMTP_USER}...")
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        print("✓ Login successful")
    else:
        print("Using STARTTLS connection...")
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
        print("✓ SMTP connection established")
        server.ehlo()
        server.starttls()
        server.ehlo()
        print("✓ STARTTLS negotiation completed")
        
        print(f"Logging in as {settings.SMTP_USER}...")
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        print("✓ Login successful")
    
    # Get server capabilities
    print()
    print("Server capabilities:")
    print(f"  {server.ehlo_resp.decode() if hasattr(server.ehlo_resp, 'decode') else server.ehlo_resp}")
    
    server.quit()
    print()
    print("=" * 80)
    print("SUCCESS! Your SMTP configuration is working correctly.")
    print("=" * 80)
    print()
    print("NEXT STEP: Test the actual email sending")
    print("Run: python test_email_after_fix.py")
    
except smtplib.SMTPAuthenticationError as e:
    print()
    print("=" * 80)
    print("ERROR: SMTP AUTHENTICATION FAILED")
    print("=" * 80)
    print(f"Error Code: {e.smtp_code}")
    print(f"Error Message: {e.smtp_error}")
    print()
    print("POSSIBLE SOLUTIONS:")
    print("1. Your password may have expired or been reset by Zoho")
    print("2. You may not have App Passwords enabled in Zoho")
    print("3. Your account may require 2-Factor Authentication setup")
    print("4. Zoho may have rate-limited this account")
    print()
    print("ACTION REQUIRED:")
    print("1. Login to https://accounts.zoho.com/")
    print("2. Go to Security Settings")
    print("3. Check if App Passwords are enabled")
    print("4. Generate a NEW app-specific password")
    print("5. Update the SMTP_PASSWORD in .env with the new password")
    print("6. Run this script again to verify")
    
except smtplib.SMTPException as e:
    print()
    print("=" * 80)
    print(f"ERROR: SMTP ERROR - {type(e).__name__}")
    print("=" * 80)
    print(f"Message: {e}")
    print()
    print("This could be a temporary server issue or network problem.")
    print("Please check your internet connection and try again.")
    
except Exception as e:
    print()
    print("=" * 80)
    print(f"ERROR: {type(e).__name__}")
    print("=" * 80)
    print(f"Message: {e}")
    print()
    print("Unexpected error. Please check your configuration.")
    import traceback
    traceback.print_exc()
