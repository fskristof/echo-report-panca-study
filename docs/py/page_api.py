"""
What the page asks for while a report is filled in, in ONE place for both versions of the program:
  - the full program: app.py's routes /render, /velemeny, /import, /blank call these functions;
  - the public by-hand version (GitHub Pages, no server): web/static-api.js calls the same functions inside the
    browser through Pyodide (Python in the browser). So both versions calculate, check and lay out the report with
    exactly the same code. Plain code, no AI; nothing is stored.
Each function takes the page's request (a dict) and returns (HTTP status, answer dict).
"""

from import_report import import_form
from report import blank_form, live_report, render_form
from velemeny import generate as generate_velemeny


def render(d):
    """The boxes after every edit: calculations, checks and layout again."""
    return 200, render_form(d.get("values", {}), d.get("texts", {}), d.get("egyeb", ""),
                            d.get("transcript", ""), d.get("aiTexts"), d.get("place"))


def velemeny(d):
    """The Vélemény button: the generated text for the boxes as they are now (template.md 5d)."""
    r = live_report(d.get("values", {}), d.get("texts", {}), d.get("egyeb", ""), d.get("transcript", ""))
    return 200, {"text": generate_velemeny(r, d.get("sex", "ffi"), d.get("grades", {}), d.get("prosthetic"),
                                           d.get("mitral_prosthetic"))}


def import_report(d):
    """A report this program wrote, pasted back: its values go into the boxes (import_report.py)."""
    text = (d.get("text") or "").strip()
    if not text:
        return 400, {"error": "Nincs beillesztett lelet."}
    return 200, import_form(text, d.get("place"))


def blank(d=None):
    """New report by hand: an empty form."""
    return 200, blank_form()
