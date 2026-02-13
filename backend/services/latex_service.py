import httpx
import logging
from config import settings

logger = logging.getLogger(__name__)


class LaTeXCompilationError(Exception):
    # Raised when LaTeX compilation fails
    pass


def compile_latex(latex_code: str, timeout: int = None) -> bytes:
    # Compile LaTeX to PDF using external API
    # Returns PDF bytes or raises LaTeXCompilationError
    url = settings.LATEX_COMPILE_URL
    timeout = timeout or settings.LATEX_TIMEOUT
    
    payload = {
        "compiler": "pdflatex",
        "resources": [{
            "main": True,
            "content": latex_code
        }]
    }
    
    try:
        logger.info(f"Starting LaTeX compilation (timeout: {timeout}s)")
        
        response = httpx.post(url, json=payload, timeout=float(timeout))
        
        if response.status_code not in range(200, 300):
            error_msg = f"LaTeX compilation failed with status {response.status_code}"
            logger.error(f"{error_msg}: {response.text[:500]}")
            raise LaTeXCompilationError(f"{error_msg}: {response.text[:200]}")
        
        logger.info("LaTeX compilation successful")
        return response.content
        
    except httpx.TimeoutException as e:
        logger.error(f"LaTeX compilation timed out after {timeout}s")
        raise LaTeXCompilationError(
            f"Compilation timed out after {timeout}s. "
            "The document may be too complex or the service is slow. "
            "Try again or simplify the LaTeX code."
        ) from e
        
    except httpx.RequestError as e:
        logger.error(f"LaTeX compilation request failed: {e}")
        raise LaTeXCompilationError(
            f"Failed to connect to LaTeX compilation service: {str(e)}"
        ) from e
        
    except Exception as e:
        logger.error(f"Unexpected error during LaTeX compilation: {e}")
        raise LaTeXCompilationError(f"Compilation error: {str(e)}") from e


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
    
    # Check for balanced braces (basic check)
    open_braces = latex_code.count("{")
    close_braces = latex_code.count("}")
    if open_braces != close_braces:
        return False, f"Unbalanced braces: {open_braces} opening, {close_braces} closing"
    
    # Check for common problematic patterns
    if "\\includegraphics" in latex_code and "graphicx" not in latex_code:
        return False, "Using \\includegraphics without graphicx package"
    
    return True, ""
