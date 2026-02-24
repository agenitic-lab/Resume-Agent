import pdfplumber
from io import BytesIO
import logging

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> dict:
    """Extract text from PDF bytes using pdfplumber, with pdfminer.six as fallback.

    Raises ValueError when no text can be extracted (e.g. scanned/image PDFs).
    """
    text_parts: list[str] = []
    page_count: int = 0

    # ── Primary: pdfplumber ──────────────────────────────────────────────────
    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            if page_count == 0:
                raise ValueError("PDF has no pages")

            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except ValueError:
        raise  # re-raise "PDF has no pages"
    except Exception as exc:
        logger.warning("pdfplumber failed, falling back to pdfminer.six: %s", exc)

    # ── Fallback: pdfminer.six ───────────────────────────────────────────────
    if not text_parts:
        try:
            from pdfminer.high_level import extract_text as pdfminer_extract
            from pdfminer.pdfpage import PDFPage

            # Get page count via pdfminer if pdfplumber didn't manage to open
            if page_count == 0:
                try:
                    page_count = sum(
                        1 for _ in PDFPage.get_pages(BytesIO(file_bytes))
                    )
                except Exception:
                    page_count = 0

            extracted = pdfminer_extract(BytesIO(file_bytes))
            if extracted and extracted.strip():
                text_parts = [extracted.strip()]
        except Exception as exc:
            logger.warning("pdfminer.six fallback also failed: %s", exc)

    if not text_parts:
        raise ValueError(
            "Could not extract any text from the PDF. "
            "The file may be scanned or image-based. "
            "Please copy and paste your resume text instead."
        )

    return {
        "text": "\n\n".join(text_parts),
        "pages": page_count,
    }
