import pdfplumber
from io import BytesIO

def extract_text_from_pdf(file_bytes: bytes) -> dict:
    # Extract text from PDF using pdfplumber
    text_parts = []
    
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        if len(pdf.pages) == 0:
            raise ValueError("PDF has no pages")
        
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    
    if not text_parts:
        raise ValueError("Could not extract any text from PDF")
    
    return {
        "text": "\n\n".join(text_parts),
        "pages": len(pdf.pages)
    }
