import os
from dotenv import load_dotenv

load_dotenv()

client_id = os.getenv("GOOGLE_CLIENT_ID")
if client_id:
    masked = client_id[:5] + "..." + client_id[-5:]
    print(f"GOOGLE_CLIENT_ID loaded: {masked}")
else:
    print("GOOGLE_CLIENT_ID NOT LOADED")
