import requests
import json
import sys

# Login to get admin token
login_data = {
    "email": "admin@test.com",
    "password": "testpassword123"
}

resp = requests.post("http://localhost:8000/api/auth/login", json=login_data)
if resp.status_code != 200:
    print(f"Login failed: {resp.text}")
    sys.exit(1)

token = resp.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

# Get global activity to find an ID to test
act_resp = requests.get("http://localhost:8000/api/admin/activity/global?page=1&size=5", headers=headers)
if act_resp.status_code != 200:
    print(f"Activity fetch failed: {act_resp.text}")
    sys.exit(1)

items = act_resp.json().get("items", [])
if not items:
    print("No items found")
    sys.exit(0)

# Fetch details for the first item
item = items[0]
print(f"Testing details for {item['type']} with ID {item['id']}")

details_resp = requests.get(f"http://localhost:8000/api/admin/activity/details/{item['type']}/{item['id']}", headers=headers)

print(f"Status Code: {details_resp.status_code}")
try:
    print("Response JSON:")
    print(json.dumps(details_resp.json(), indent=2))
except Exception as e:
    print(f"Error parsing JSON: {e}")
    print(f"Raw text: {details_resp.text}")
