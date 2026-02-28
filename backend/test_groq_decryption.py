import os
import psycopg2
from cryptography.fernet import Fernet
import requests

# 1. Grab DB and decrypt keys
db_url = "postgresql://postgres.jclcmpmrprccywmpylvb:resumeagent9400850450@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
enc_key = b"SrRCV5aKdhcwhprMwDqdUUUX5zywn5uU6_B3XzcStj0="
fernet = Fernet(enc_key)

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute("SELECT email, encrypted_api_key FROM users WHERE email='mohamedsinan9400@gmail.com' OR email='mentoraa2025@gmail.com' LIMIT 2;")
    rows = cursor.fetchall()

    for email, enc_api_key in rows:
        if enc_api_key:
            try:
                raw_key = fernet.decrypt(enc_api_key.encode("utf-8")).decode("utf-8")
                print(f"User {email} decrypted key successfully! Length: {len(raw_key)}")
                
                # Check groq
                res = requests.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {raw_key}"}
                )
                print(f"Groq API Response for {email}: {res.status_code}")
                if res.status_code == 401:
                    print(f" -> Key '{raw_key[:10]}...' is REJECTED by Groq (Invalid Key!)")
            except Exception as e:
                print(f"Failed to decrypt for {email}: {e}")
        else:
            print(f"No key for {email}")
            
    conn.close()
except Exception as e:
    print(f"Error: {e}")
