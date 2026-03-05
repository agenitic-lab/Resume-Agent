#!/usr/bin/env python3
"""Test script to debug email sending issues"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.email import send_support_email
from config import settings
import logging

# Set up logging to see debug info
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

print("=== Email Debug Test ===")
print(f"SMTP_HOST: {settings.SMTP_HOST}")
print(f"SMTP_PORT: {settings.SMTP_PORT}")
print(f"SMTP_USER: {settings.SMTP_USER}")
print(f"SUPPORT_EMAIL: {settings.SUPPORT_EMAIL}")
print(f"SMTP_PASSWORD configured: {'Yes' if settings.SMTP_PASSWORD else 'No'}")
print()

# Test email sending
print("Testing email sending...")
try:
    result = send_support_email(
        name="Test User",
        email="cinaney@gmail.com",
        subject="Test Email - Debug",
        message="This is a test email to debug the email functionality."
    )
    
    if result:
        print("✅ Email sent successfully!")
    else:
        print("❌ Email sending failed!")
        
except Exception as e:
    print(f"❌ Exception during email sending: {e}")
    import traceback
    traceback.print_exc()