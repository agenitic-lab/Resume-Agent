import requests
import json
import uuid

# Re-login to get token
login_data = {"email": "admin@test.com", "password": "testpassword123"}
resp = requests.post("http://localhost:8000/api/auth/login", json=login_data)
token = resp.json().get("access_token")
headers = {"Authorization": f"Bearer {token}", "Origin": "http://localhost:5173"}

# Test OPTIONS for CORS
options_url = "http://localhost:8000/api/admin/activity/details/resume_creation/f73e247d-852b-43b6-b13e-fd11ce24642a"
print(f"Testing OPTIONS on {options_url}")
opt_resp = requests.options(options_url, headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
print(f"OPTIONS Status: {opt_resp.status_code}")
print(f"OPTIONS Headers: {opt_resp.headers}")

# Test GET actual
print(f"\nTesting GET on {options_url}")
get_resp = requests.get(options_url, headers=headers)
print(f"GET Status: {get_resp.status_code}")
try:
    print(f"GET Response: {json.dumps(get_resp.json(), indent=2)}")
except Exception as e:
    print(f"GET failed to parse JSON: {get_resp.text}")
