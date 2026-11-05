"""
Builds the PANCA STUDY version of the by-hand Echo report into docs/ (served by GitHub Pages from main /docs).

    python3 build_study.py                    build from ~/Projects/Echo dictation
    python3 build_study.py --echo <path>      build from another checkout of echo-report

What it does:
  1. runs echo-report's own build_public.py (the public by-hand page: the report Python runs in the browser, Pyodide)
  2. copies that site into docs/
  3. adds study/ (study.js = the patient folder, patient browser, Előzmény, export; study.css = green look; the logo)
  4. applies a few small, checked text patches to index.html (each must match exactly once, or the build stops)

Nothing of the main program is changed: rebuild after every change in echo-report to bring the new features in.
Patient data never goes into docs/: it lives only in the folder chosen in the browser (OneDrive).
"""

import argparse
import hashlib
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "docs"
STUDY = HERE / "study"
DEFAULT_ECHO = Path.home() / "Projects" / "Echo dictation"


def patches(asset_version):
    """(old, new) pairs for index.html. Each old text must occur exactly once."""
    v = asset_version
    return [
        ("<title>EchoCore</title>", "<title>EchoCore · Panca vizsgálat</title>"),
        ('<link rel="icon" type="image/png" href="icons/icon-rounded.png">',
         f'<link rel="icon" type="image/svg+xml" href="study/logo.svg?v={v}">'),
        ('<img class="logo" src="icons/icon-rounded.png" alt="" aria-hidden="true">\n      <h1>EchoCore</h1>',
         f'<img class="logo" src="study/logo.svg?v={v}" alt="" aria-hidden="true">\n      <h1>EchoCore</h1>'
         '\n      <span class="study-badge" title="A Panca vizsgálat változata: a leletek a kiválasztott mappába mentődnek">'
         'Panca vizsgálat</span>'),
        # STATIC stays on (the report Python runs in the browser), but the page gets the "study" look, not "static"
        ('if (STATIC) document.documentElement.classList.add("static");',
         'if (STATIC) document.documentElement.classList.add(window.ECHO_STUDY ? "study" : "static");'),
        # "Kezdőlap" with unsaved changes: the study version CAN save, so ask like the full program does
        ("if (isDirty() && STATIC) {", "if (isDirty() && STATIC && !window.ECHO_STUDY) {"),
        # the Save button calls saveReport by name, so study.js's version is used
        ('$("save").addEventListener("click", saveReport);', '$("save").addEventListener("click", () => saveReport());'),
        ("</head>", f'<script>window.ECHO_STUDY = true;</script>\n'
                    f'<link rel="stylesheet" href="study/study.css?v={v}">\n</head>'),
        ("</body>", f'<script src="study/study.js?v={v}"></script>\n</body>'),
    ]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--echo", type=Path, default=DEFAULT_ECHO, help="the echo-report checkout")
    args = ap.parse_args()
    echo = args.echo.resolve()
    if not (echo / "build_public.py").exists():
        sys.exit(f"HIBA: nincs build_public.py itt: {echo}")

    py = echo / ".venv" / "bin" / "python"
    if not py.exists():
        py = echo / ".venv" / "Scripts" / "python.exe"
    if not py.exists():
        py = Path(sys.executable)
    print(f"1. Nyilvános változat építése ({echo.name})...")
    r = subprocess.run([str(py), "build_public.py"], cwd=echo)
    if r.returncode:
        sys.exit("HIBA: a build_public.py nem futott le.")
    site = echo / "public_site"

    print("2. Másolás a docs/ mappába...")
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(site, OUT)
    (OUT / "README.md").unlink(missing_ok=True)          # the public version's readme: not this site's
    shutil.copytree(STUDY, OUT / "study")

    # cache busting: the study files' fingerprint in their URLs, so a new version reaches both computers
    h = hashlib.sha256()
    for f in sorted(STUDY.rglob("*")):
        if f.is_file():
            h.update(f.read_bytes())
    asset_version = h.hexdigest()[:10]

    print("3. Az oldal módosítása...")
    page_path = OUT / "index.html"
    page = page_path.read_text(encoding="utf-8")
    for old, new in patches(asset_version):
        n = page.count(old)
        if n != 1:
            sys.exit(f"HIBA: a javítás helye {n}× található (1× kellene): {old[:70]!r}\n"
                     "Az echo-report index.html-je megváltozott: igazítsd a build_study.py patches() listáját.")
        page = page.replace(old, new)
    page_path.write_text(page, encoding="utf-8")

    version = subprocess.run(["git", "log", "-1", "--format=%h, %cs"], cwd=echo, capture_output=True,
                             text=True).stdout.strip() or "?"
    (OUT / "study" / "build.txt").write_text(f"echo-report {version}; study {asset_version}\n", encoding="utf-8")
    print(f"Kész: {OUT}  (echo-report {version}, study {asset_version})")


if __name__ == "__main__":
    main()
