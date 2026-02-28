import re
import os
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from services.latex_service import compile_latex, LaTeXCompilationError

# Robustly find templates/latex directory
BASE_DIR = Path(__file__).resolve().parent.parent
LATEX_TEMPLATES_DIR = BASE_DIR / "templates" / "latex"

def escape_latex(text: str) -> str:
    """Escapes strings for LaTeX."""
    if not isinstance(text, str):
        return text
    
    # Dict of characters to escape
    chars = {
        '&': r'\&',
        '%': r'\%',
        '$': r'\$',
        '#': r'\#',
        '_': r'\_',
        '{': r'\{',
        '}': r'\}',
        '~': r'\textasciitilde{}',
        '^': r'\textasciicircum{}',
        '\\': r'\textbackslash{}',
    }
    def replace_char(match):
        return chars[match.group(0)]
    return re.sub(r'[&%$#_{}~^\\]', replace_char, text)

# Jinja env for LaTeX with different delimeters to avoid LaTeX conflicts if needed, but [] works too.
env = Environment(
    loader=FileSystemLoader(str(LATEX_TEMPLATES_DIR)),
    block_start_string='<%%',
    block_end_string='%%>',
    variable_start_string='<<',
    variable_end_string='>>',
    comment_start_string='<#',
    comment_end_string='#>',
    autoescape=False # we control escaping manually
)
env.filters['latex_escape'] = escape_latex

def render_latex_source(template_id: str, data: dict) -> str:
    from services.latex_templates import get_template_preamble
    
    # 1. Get the preamble for the template
    preamble = get_template_preamble(template_id)
    if not preamble:
        raise ValueError(f"Template '{template_id}' not found.")
        
    # 2. Get the jinja body template file
    template_filename = f"{template_id}.tex.j2"
    jinja_template = env.get_template(template_filename)
    
    # Escape data
    def escape_dict(d):
        if isinstance(d, dict):
            return {k: escape_dict(v) for k, v in d.items()}
        elif isinstance(d, list):
            return [escape_dict(v) for v in d]
        elif isinstance(d, str):
            return escape_latex(d)
        return d
    
    escaped_data = escape_dict(data)
    
    # 3. Render the body
    body_latex = jinja_template.render(**escaped_data)
    
    # 4. Combine
    full_latex = preamble.strip() + "\n" + body_latex.strip() + "\n"
    
    return full_latex

def render_latex_to_pdf(template_id: str, data: dict) -> bytes:
    full_latex = render_latex_source(template_id, data)
    return compile_latex(full_latex)
