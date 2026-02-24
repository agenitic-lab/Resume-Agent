from fastapi import APIRouter, UploadFile, File, HTTPException
from services.pdf_service import extract_text_from_pdf

router = APIRouter(prefix="/api/pdf", tags=["pdf"])

# MIME types that represent PDF files.  Mobile browsers (iOS/Android) sometimes
# send PDFs as application/octet-stream or with no content-type at all, so we
# accept those too and let pdfplumber confirm the file is actually a PDF.
_PDF_CONTENT_TYPES = {
    "application/pdf",
    "application/x-pdf",
    "application/octet-stream",  # common fallback on mobile
    "binary/octet-stream",
    "",  # no content-type header
}


def _is_likely_pdf(file: UploadFile) -> bool:
    """Return True when the uploaded file looks like a PDF (by name or MIME type)."""
    name_ok = (file.filename or "").lower().endswith(".pdf")
    mime_ok = (file.content_type or "") in _PDF_CONTENT_TYPES
    # Accept when either the name OR the MIME type says PDF.  This handles:
    #   - desktop uploads:  name=resume.pdf, type=application/pdf  ✓
    #   - iOS Files app:    name=resume.pdf, type=application/octet-stream  ✓
    #   - Android sharing:  name=document (no ext), type=application/pdf   ✓
    return name_ok or mime_ok


@router.post("/extract")
async def extract_pdf(file: UploadFile = File(...)):
    # Validate file type – accept by MIME type OR filename extension
    if not _is_likely_pdf(file):
        raise HTTPException(
            status_code=400,
            detail=(
                "Only PDF files are allowed. "
                f"Received filename='{file.filename}' content_type='{file.content_type}'."
            ),
        )

    # Read file bytes
    file_bytes = await file.read()

    # Check file size (max 5 MB)
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    try:
        result = extract_text_from_pdf(file_bytes)
        result["filename"] = file.filename
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")
