import os
import psycopg2
from cryptography.fernet import Fernet
import requests

db_url = "postgresql://postgres.jclcmpmrprccywmpylvb:resumeagent9400850450@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
enc_key = b"SrRCV5aKdhcwhprMwDqdUUUX5zywn5uU6_B3XzcStj0="
fernet = Fernet(enc_key)

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute("SELECT email, encrypted_api_key FROM users WHERE email='sinan@gmail.com';")
    row = cursor.fetchone()

    if row and row[1]:
        raw_key = fernet.decrypt(row[1].encode("utf-8")).decode("utf-8")
        print(f"Decrypted Key for sinan@gmail.com: {raw_key[:10]}...{raw_key[-5:]}")
        res = requests.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {raw_key}"}
        )
        print(f"Groq API Response: {res.status_code}")
    else:
        print("No key found in DB for sinan@gmail.com")
            
    conn.close()
except Exception as e:
    print(f"Error: {e}")
