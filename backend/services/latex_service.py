import httpx

def compile_latex(latex_code: str) -> bytes:
    # Call latex.ytotech.com to compile LaTeX to PDF
    url = "https://latex.ytotech.com/builds/sync"
    
    payload = {
        "compiler": "pdflatex",
        "resources": [{
            "main": True,
            "content": latex_code
        }]
    }
    
    response = httpx.post(url, json=payload, timeout=30.0)
    
    if response.status_code not in range(200, 300):
        raise Exception(f"LaTeX compilation failed: {response.text}")
    
    # The API returns the PDF binary directly
    return response.content
