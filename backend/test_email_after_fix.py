#!/usr/bin/env python3
"""
Email Test Script - Run this after updating SMTP password
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.email import send_support_email
from config import settings
import smtplib

def test_smtp_connection():
    """Test basic SMTP connection"""
    try:
        print("Testing SMTP connection...")
        server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        print("✅ SMTP connection successful!")
        server.quit()
        return True
    except Exception as e:
        print(f"❌ SMTP connection failed: {e}")
        return False

def test_email_sending():
    """Test actual email sending"""
    try:
        print("Testing email sending...")
        result = send_support_email(
            name="Test User", 
            email="cinaney@gmail.com",
            subject="Email Test - System Working",
            message="This is a test email to confirm the email system is now working correctly."
        )
        
        if result:
            print("✅ Email sent successfully!")
            print("Check both:")
            print("  📧 support@resiko.app inbox for the support ticket")
            print("  📧 cinaney@gmail.com inbox for confirmation")
        else:
            print("❌ Email sending failed!")
        
        return result
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

if __name__ == "__main__":
    print("=== EMAIL SYSTEM TEST ===")
    print(f"SMTP Host: {settings.SMTP_HOST}")
    print(f"SMTP User: {settings.SMTP_USER}")
    print(f"Support Email: {settings.SUPPORT_EMAIL}")
    print()
    
    if test_smtp_connection():
        test_email_sending()
    else:
        print("Cannot test email sending - SMTP connection failed")
        print("Please check your SMTP password in the .env file")