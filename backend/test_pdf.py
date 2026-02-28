import requests
import json

resume_data = {
    "contact": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "555-1234",
        "summary": "A great software engineer."
    },
    "field": "Software Engineering",
    "experience": [
        {
            "company": "Tech Corp",
            "title": "Software Engineer",
            "start_date": "Jan 2020",
            "end_date": "Present",
            "details": ["Did a lot of coding.", "Fixed bugs."]
        }
    ],
    "education": [
        {"school": "University", "degree": "BS CS", "start_year": "2015", "end_year": "2019"}
    ],
    "projects": [],
    "skills": ["Python", "React", "AWS"]
}

try:
    res = requests.post("http://localhost:8000/api/resume/create", json=resume_data)
    if res.status_code == 200:
        resume_id = res.json()["resume_id"]
        print("Created resume:", resume_id)
        
        pdf_res = requests.get(f"http://localhost:8000/api/resume/download/{resume_id}/clean_modern")
        print("PDF status:", pdf_res.status_code)
        
        if pdf_res.status_code == 200:
            with open("test.pdf", "wb") as f:
                f.write(pdf_res.content)
            print("Generated test.pdf")
        else:
            print("PDF error:", pdf_res.text)
    else:
        print("Create error:", res.text)
except Exception as e:
    print("Request failed:", e)
