from jinja2 import Environment, FileSystemLoader
from pathlib import Path

try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except OSError:
    WEASYPRINT_AVAILABLE = False
    print("WARNING: WeasyPrint (GTK) not found. PDF generation will create incomplete files or fail.")

# Robustly find templates directory
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"

env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

def render_resume(template_name: str, data: dict):
    template = env.get_template(template_name)
    return template.render(**data)

def generate_pdf(html: str):
    if not WEASYPRINT_AVAILABLE:
        raise RuntimeError("PDF generation is unavailable. GTK3 runtime is missing on this server.")
    return HTML(string=html).write_pdf()
