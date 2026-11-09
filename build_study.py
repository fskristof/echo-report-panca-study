"""
Builds the PANCA STUDY version of the by-hand Echo report into docs/ (served by GitHub Pages from main /docs).

    python3 build_study.py                    full build from the PINNED echo-report version (echo_pin.txt)
    python3 build_study.py --echo-ref <ref>   full build from another echo-report commit / branch, to TEST an update
    python3 build_study.py --echo-ref <ref> --save-pin
                                              the same, and make it the new pinned version (after testing it)
    python3 build_study.py --echo <path>      the echo-report checkout (default: ~/Projects/Echo dictation, or
                                              ~/Projects_cvc/Echo report dictation_CVC)
    python3 build_study.py --study-only       only refresh docs/study from study/ (keeps the built page, the echo-report
                                              version and the published password fingerprint: no echo-report checkout
                                              or gate_password.txt needed)

What it does:
  1. runs echo-report's own build_public.py (the public by-hand page: the report Python runs in the browser, Pyodide)
  2. copies that site into docs/
  3. adds study/ (study.js = the patient folder, patient browser, Előzmény, export; study.css = green look; the logo)
  4. applies a few small, checked text patches to index.html (each must match exactly once, or the build stops)

The study site is PINNED to one echo-report commit (echo_pin.txt): a full build never takes whatever echo-report holds
that day. It checks the pinned commit out into a temporary git worktree (the echo-report folder itself, its branch and
any unfinished work there are not touched), builds there, and removes the worktree. Taking a change of the main
program (e.g. a calculation fix) into the study is a deliberate step: --echo-ref <commit>, test, then --save-pin.
Nothing of the main program is changed.
Patient data never goes into docs/: it lives only in the folder chosen in the browser (OneDrive).
"""

import argparse
import datetime
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "docs"
STUDY = HERE / "study"
ECHO_CANDIDATES = [Path.home() / "Projects" / "Echo dictation", Path.home() / "Projects_cvc" / "Echo report dictation_CVC"]
DEFAULT_ECHO = next((p for p in ECHO_CANDIDATES if (p / "build_public.py").exists()), ECHO_CANDIDATES[0])
# The echo-report commit the study site is built from (one line: the commit hash; lines starting with # are notes)
PIN_FILE = HERE / "echo_pin.txt"
# The password screen (study/gate.js): the password is read from this file (or the PANCA_GATE_PASSWORD environment
# variable). The file is git-ignored and never published: only a salted SHA-256 fingerprint goes into the site.
GATE_FILE = HERE / "gate_password.txt"
GATE_SALT = "panca-echo-study:"                    # must match SALT in study/gate.js


def gate_hash(no_gate):
    if no_gate:
        return ""
    pw = os.environ.get("PANCA_GATE_PASSWORD")
    if pw is None and GATE_FILE.exists():
        pw = GATE_FILE.read_text(encoding="utf-8").strip()
    if not pw:
        sys.exit(f"HIBA: nincs jelszó. Írd a jelszót ide: {GATE_FILE.name} (egy sor), vagy építs --no-gate kapcsolóval.")
    return hashlib.sha256((GATE_SALT + pw).encode("utf-8")).hexdigest()


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
        ("</head>", f'<script src="study/gate.js?v={v}"></script>\n<script>window.ECHO_STUDY = true;</script>\n'
                    f'<link rel="stylesheet" href="study/study.css?v={v}">\n</head>'),
        ("</body>", f'<script src="study/study.js?v={v}"></script>\n</body>'),
    ]


def asset_hash(gate):
    """The study files' fingerprint (in their URLs, so a new version reaches both computers)."""
    h = hashlib.sha256()
    for f in sorted(STUDY.rglob("*")):
        if f.is_file():
            h.update(f.read_bytes())
    h.update(gate.encode())                          # a new password = new URLs: every computer gets the new screen
    return h.hexdigest()[:10]


def copy_study(gate):
    if (OUT / "study").exists():
        shutil.rmtree(OUT / "study")
    shutil.copytree(STUDY, OUT / "study")
    gate_js = OUT / "study" / "gate.js"
    js = gate_js.read_text(encoding="utf-8")
    assert js.count("__GATE_HASH__") == 1
    gate_js.write_text(js.replace("__GATE_HASH__", gate or "none"), encoding="utf-8")


def study_only(no_gate):
    """Refresh docs/study only: the page built earlier stays, its study file URLs get the new fingerprint."""
    page_path = OUT / "index.html"
    if not page_path.exists():
        sys.exit("HIBA: nincs még felépített oldal (docs/index.html): előbb egy teljes építés kell.")
    if no_gate:
        gate = ""
    elif os.environ.get("PANCA_GATE_PASSWORD") or GATE_FILE.exists():
        gate = gate_hash(False)
    else:                                            # keep the password already published
        m = re.search(r'const HASH = "([0-9a-f]{64}|none)"', (OUT / "study" / "gate.js").read_text(encoding="utf-8"))
        if not m:
            sys.exit("HIBA: nem található a jelenlegi jelszó-ujjlenyomat a docs/study/gate.js-ben.")
        gate = "" if m.group(1) == "none" else m.group(1)
    old_info = (OUT / "study" / "build.txt").read_text(encoding="utf-8") if (OUT / "study" / "build.txt").exists() else ""
    page = page_path.read_text(encoding="utf-8")
    old_versions = set(re.findall(r'study/[\w.-]+\?v=([0-9a-f]{10})', page))
    if len(old_versions) != 1:
        sys.exit(f"HIBA: a study fájlok verziója nem egyértelmű az index.html-ben: {old_versions}")
    old_v = old_versions.pop()
    copy_study(gate)
    v = asset_hash(gate)
    page_path.write_text(page.replace(f"?v={old_v}", f"?v={v}"), encoding="utf-8")
    m = re.match(r"(echo-report [^;]*);", old_info)
    echo_part = m.group(1) if m else "echo-report ?"
    (OUT / "study" / "build.txt").write_text(f"{echo_part}; study {v}\n", encoding="utf-8")
    print(f"Kész (csak study/): {OUT}  ({echo_part}, study {old_v} → {v})")


def git(repo, *args, check=True):
    r = subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True, encoding="utf-8")
    if check and r.returncode:
        sys.exit(f"HIBA: git {' '.join(args)}\n{r.stderr.strip()}")
    return r.stdout.strip()


def read_pin():
    if not PIN_FILE.exists():
        sys.exit(f"HIBA: nincs {PIN_FILE.name} (a rögzített echo-report verzió).")
    lines = [l.strip() for l in PIN_FILE.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]
    if len(lines) != 1:
        sys.exit(f"HIBA: a(z) {PIN_FILE.name} egy sort várt (a commit azonosítóját).")
    return lines[0]


def save_pin(commit, info):
    PIN_FILE.write_text(
        "# The echo-report commit the Panca study site is built from (build_study.py). Change it only on purpose:\n"
        "#   python build_study.py --echo-ref <commit>   (test in test mode)   then add --save-pin\n"
        f"# {info}\n{commit}\n", encoding="utf-8")


def main():
    for stream in (sys.stdout, sys.stderr):          # Hungarian messages on a Windows console
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--echo", type=Path, default=DEFAULT_ECHO, help="the echo-report checkout")
    ap.add_argument("--echo-ref", help="build from this echo-report commit / branch instead of the pinned one")
    ap.add_argument("--save-pin", action="store_true", help="with --echo-ref: make it the new pinned version")
    ap.add_argument("--no-gate", action="store_true", help="build without the password screen")
    ap.add_argument("--study-only", action="store_true",
                    help="only refresh docs/study from study/ (keeps the built page and the published password)")
    args = ap.parse_args()
    if args.study_only:
        return study_only(args.no_gate)
    if args.save_pin and not args.echo_ref:
        sys.exit("HIBA: a --save-pin csak --echo-ref mellett használható.")
    gate = gate_hash(args.no_gate)
    echo = args.echo.resolve()
    if not (echo / "build_public.py").exists():
        sys.exit(f"HIBA: nincs build_public.py itt: {echo}")
    ref = args.echo_ref or read_pin()
    commit = git(echo, "rev-parse", "--verify", ref + "^{commit}", check=False)
    if not commit:
        git(echo, "fetch", "--quiet", "origin")         # a commit pushed from another computer
        commit = git(echo, "rev-parse", "--verify", ref + "^{commit}")
    version = git(echo, "log", "-1", "--format=%h, %cs", commit)
    print(f"Echo-report verzió: {version}" + ("  (rögzített)" if not args.echo_ref else "  (NEM a rögzített: teszt)"))

    work = Path(tempfile.mkdtemp(prefix="panca-echo-"))
    tree = work / "echo"
    git(echo, "worktree", "add", "--detach", str(tree), commit)
    try:
        if (echo / "public_build_cache").exists():      # the Pyodide download, so it is not fetched again
            shutil.copytree(echo / "public_build_cache", tree / "public_build_cache")
        print(f"1. Nyilvános változat építése ({version})...")
        r = subprocess.run([sys.executable, "build_public.py"], cwd=tree)
        if r.returncode:
            sys.exit("HIBA: a build_public.py nem futott le.")
        print("2. Másolás a docs/ mappába...")
        if OUT.exists():
            shutil.rmtree(OUT)
        shutil.copytree(tree / "public_site", OUT)
    finally:
        git(echo, "worktree", "remove", "--force", str(tree), check=False)
        shutil.rmtree(work, ignore_errors=True)
        git(echo, "worktree", "prune", check=False)
    (OUT / "README.md").unlink(missing_ok=True)          # the public version's readme: not this site's
    copy_study(gate)
    # cache busting: the study files' fingerprint in their URLs, so a new version reaches both computers
    asset_version = asset_hash(gate)

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

    if args.save_pin:
        save_pin(commit, f"echo-report {version}, pinned {datetime.date.today()}")
        print(f"Rögzített verzió frissítve: {PIN_FILE.name} = {version}")
    (OUT / "study" / "build.txt").write_text(f"echo-report {version}; study {asset_version}\n", encoding="utf-8")
    print(f"Kész: {OUT}  (echo-report {version}, study {asset_version})")


if __name__ == "__main__":
    main()
