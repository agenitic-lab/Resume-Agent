import httpx
import logging
import time
from config import settings

logger = logging.getLogger(__name__)

MAX_COMPILE_RETRIES = 2
RETRY_DELAY_SECONDS = 1.5


class LaTeXCompilationError(Exception):
    # Raised when LaTeX compilation fails
    pass


def compile_latex(latex_code: str, timeout: int = None) -> bytes:
    """Compile LaTeX to PDF using external API with retry on transient failures."""
    url = settings.LATEX_COMPILE_URL
    timeout = timeout or settings.LATEX_TIMEOUT

    payload = {
        "compiler": "pdflatex",
        "resources": [{
            "main": True,
            "content": latex_code
        }]
    }

    logger.info(
        f"Starting LaTeX compilation (timeout: {timeout}s, "
        f"latex length: {len(latex_code)} chars)"
    )
    logger.debug(f"LaTeX first 300 chars: {latex_code[:300]}")

    last_error = None

    for attempt in range(1, MAX_COMPILE_RETRIES + 1):
        try:
            logger.info(f"Compilation attempt {attempt}/{MAX_COMPILE_RETRIES}")

            response = httpx.post(url, json=payload, timeout=float(timeout))

            if response.status_code in range(200, 300):
                logger.info(
                    f"LaTeX compilation successful on attempt {attempt} "
                    f"(PDF size: {len(response.content)} bytes)"
                )
                return response.content

            # Non-success status — check if retryable
            error_msg = f"LaTeX compilation failed with status {response.status_code}"
            resp_text = response.text[:2000]
            logger.error(f"{error_msg} (attempt {attempt}): {resp_text}")

            # 5xx = server error (retryable), 4xx = client error (may be retryable
            # for the external API since 400 can be transient for pdflatex)
            last_error = LaTeXCompilationError(f"{error_msg}: {resp_text}")

            if attempt < MAX_COMPILE_RETRIES:
                logger.info(f"Retrying in {RETRY_DELAY_SECONDS}s...")
                time.sleep(RETRY_DELAY_SECONDS)
                continue

        except httpx.TimeoutException as e:
            logger.error(f"LaTeX compilation timed out after {timeout}s (attempt {attempt})")
            last_error = LaTeXCompilationError(
                f"Compilation timed out after {timeout}s. "
                "The document may be too complex or the service is slow. "
                "Try again or simplify the LaTeX code."
            )
            last_error.__cause__ = e
            if attempt < MAX_COMPILE_RETRIES:
                logger.info(f"Retrying in {RETRY_DELAY_SECONDS}s...")
                time.sleep(RETRY_DELAY_SECONDS)
                continue

        except httpx.RequestError as e:
            logger.error(f"LaTeX compilation request failed (attempt {attempt}): {e}")
            last_error = LaTeXCompilationError(
                f"Failed to connect to LaTeX compilation service: {str(e)}"
            )
            last_error.__cause__ = e
            if attempt < MAX_COMPILE_RETRIES:
                logger.info(f"Retrying in {RETRY_DELAY_SECONDS}s...")
                time.sleep(RETRY_DELAY_SECONDS)
                continue

        except LaTeXCompilationError:
            raise

        except Exception as e:
            logger.error(f"Unexpected error during LaTeX compilation (attempt {attempt}): {e}")
            last_error = LaTeXCompilationError(f"Compilation error: {str(e)}")
            last_error.__cause__ = e
            # Don't retry on unexpected errors
            break

    # All retries exhausted
    logger.error(f"LaTeX compilation failed after {MAX_COMPILE_RETRIES} attempts")
    raise last_error


def validate_latex_code(latex_code: str) -> tuple[bool, str]:
    # Quick validation before sending to compiler - catches common mistakes
    if not latex_code or not latex_code.strip():
        return False, "LaTeX code is empty"

    if "\\documentclass" not in latex_code:
        return False, "Missing \\documentclass declaration"

    if "\\begin{document}" not in latex_code:
        return False, "Missing \\begin{document}"

    if "\\end{document}" not in latex_code:
        return False, "Missing \\end{document}"

    # Security: block dangerous LaTeX commands that could read/write files or
    # execute shell commands on the compilation server.
    import re
    dangerous_patterns = [
        (r'\\write18\b', '\\write18 (shell escape)'),
        (r'\\immediate\\write18\b', '\\immediate\\write18 (shell escape)'),
        (r'\\input\s*\{[^}]*\.\.|/etc/|/proc/', '\\input with path traversal'),
        (r'\\include\s*\{[^}]*\.\.|/etc/|/proc/', '\\include with path traversal'),
        (r'\\openout\b', '\\openout (file write)'),
        (r'\\openin\b', '\\openin (file read)'),
        (r'\\catcode\b', '\\catcode (category code manipulation)'),
        (r'\\csname\s+.*end\s*\\endcsname', '\\csname escape'),
    ]

    for pattern, desc in dangerous_patterns:
        if re.search(pattern, latex_code):
            return False, f"Potentially dangerous command detected: {desc}"

    # Check for balanced braces (basic check — allow small mismatch from escapes)
    open_braces = latex_code.count("{")
    close_braces = latex_code.count("}")
    brace_diff = abs(open_braces - close_braces)
    if brace_diff > 5:
        return False, f"Unbalanced braces: {open_braces} opening, {close_braces} closing (diff={brace_diff})"

    # Check for common problematic patterns
    if "\\includegraphics" in latex_code and "graphicx" not in latex_code:
        return False, "Using \\includegraphics without graphicx package"

    return True, ""
