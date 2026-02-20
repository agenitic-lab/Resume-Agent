
import sys
import logging

try:
    from weasyprint import HTML
    print("WeasyPrint imported successfully.")
    try:
        pdf = HTML(string="<h1>Test</h1>").write_pdf()
        print("PDF generated successfully.")
    except Exception as e:
        print(f"PDF generation failed: {e}")
except OSError as e:
    print(f"WeasyPrint import failed (likely missing GTK): {e}")
except ImportError as e:
    print(f"WeasyPrint not installed: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
