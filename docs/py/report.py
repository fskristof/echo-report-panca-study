"""
Step 3 and 4 of the pipeline: AI output (JSON) -> checked, calculated, formatted report.

Everything here is ordinary code: the same input always gives the same report.
  1. clean up the AI's values (last value wins, grades, units, obvious format problems)
  2. calculate missing values (template.md Section 4)
  3. lay out the report (70 characters wide, fixed columns, no tabs)
  4. check everything and collect warnings (template.md Section 5)
"""

import difflib
import math
import re
import textwrap
import unicodedata
from decimal import ROUND_HALF_EVEN, ROUND_HALF_UP, Decimal, localcontext

from fields import CHOICES, FIELD, MAX_GRADE, NEGATIVE_STRAIN, PAGE_TEXTS, PUMPS, ROMAN
from hu_numbers import words_to_digits

# Where the report is pasted decides the layout (2026-10-02). Column numbers are in "digit widths": in a fixed-width font
# one character, in KARU's proportional font (Times-like) the width of a digit. The row width and the columns come from
# the rulers pasted into eMedSol (ruler_KARU.txt): KAEC's Leírás box is Courier-like and 81 characters wide, KARU's is
# Times-like and about 79 digits wide.
# Times widths (per 1000 em) of the characters a report uses; accented letters are as wide as their base letter.
TIMES = {" ": 250, "!": 333, '"': 408, "#": 500, "$": 500, "%": 833, "&": 778, "'": 333, "(": 333, ")": 333, "*": 500,
         "+": 564, ",": 250, "-": 333, ".": 250, "/": 278, ":": 278, ";": 278, "<": 564, "=": 564, ">": 564, "?": 444,
         "@": 921, "[": 333, "\\": 278, "]": 333, "^": 469, "_": 500, "×": 564, "–": 500,
         "A": 722, "B": 667, "C": 667, "D": 722, "E": 611, "F": 556, "G": 722, "H": 722, "I": 333, "J": 389, "K": 722,
         "L": 611, "M": 889, "N": 722, "O": 722, "P": 556, "Q": 722, "R": 667, "S": 556, "T": 611, "U": 722, "V": 722,
         "W": 944, "X": 722, "Y": 722, "Z": 611,
         "a": 444, "b": 500, "c": 444, "d": 500, "e": 444, "f": 333, "g": 500, "h": 500, "i": 278, "j": 278, "k": 500,
         "l": 278, "m": 778, "n": 500, "o": 500, "p": 500, "q": 500, "r": 333, "s": 389, "t": 278, "u": 500, "v": 500,
         "w": 722, "x": 500, "y": 500, "z": 444}
TIMES.update({d: 500 for d in "0123456789"})


class Profile:
    """Row width, column positions and text measuring for one place."""

    def __init__(self, name, width, cols, proportional=False, sep_width=None):
        self.name, self.width, self.cols, self.proportional = name, width, cols, proportional
        self.sep_width = sep_width or width
        self.space = 0.5 if proportional else 1          # a space, in digit widths
        self.dash = 2 / 3 if proportional else 1         # a dash, in digit widths

    def w(self, text):
        """Width of a text in digit widths."""
        if not self.proportional:
            return len(text)
        total = 0
        for ch in text:
            base = unicodedata.normalize("NFD", ch)[0]
            total += TIMES.get(base, 500)
        return total / 500

    def pad(self, line, column):
        """The line with spaces added up to the column (nothing when it is already past it)."""
        gap = column - self.w(line)
        return line + " " * max(round(gap / self.space), 0)

    def wrap(self, text):
        """Greedy word wrap to the row width (a word longer than a row stays whole)."""
        lines, line = [], ""
        for word in text.split():
            trial = (line + " " + word) if line else word
            if line and self.w(trial) > self.width:
                lines.append(line)
                line = word
            else:
                line = trial
        return lines + ([line] if line else [])


# old layout (70 characters wide, fixed-width font; the default, what the tests check)
COLS_70 = dict(hdr=(0, 16, 32, 48), lv=(0, 20, 46), ef=(0, 16, 32, 48), ef5=(0, 16, 29, 42, 57), rv3d=(0, 17, 33, 49), dt=24, rv=32, atria=28, three=(0, 19, 43),
               pisa2=27, pisa_indent=9, right=45, mva2=46, av=(0, 18, 40), pvl=56, lvot=27, pulm=(0, 18, 36, 50))
# the Leírás box: more room, so the numbers of one measurement stay close (PISA) and the different measurements
# (grade line, regurgitation numbers, flow) are further apart. PISA's 2nd column and the right column moved 4 to the
# right (2026-10-11, the user: the two PISA columns were too close)
COLS_WIDE = dict(hdr=(0, 20, 40, 60), lv=(0, 24, 52), ef=(0, 20, 40, 60), ef5=(0, 17, 31, 45, 60), rv3d=(0, 18, 34, 50), dt=30, rv=38, atria=34, three=(0, 22, 48),
                 pisa2=31, pisa_indent=9, right=56, mva2=52, av=(0, 20, 48), pvl=64, lvot=30, pulm=(0, 19, 38, 58))
PROFILES = {"70": Profile("70", 70, COLS_70, sep_width=60),
            "KAEC": Profile("KAEC", 80, COLS_WIDE),
            "KARU": Profile("KARU", 78, COLS_WIDE, proportional=True)}
BLOCK_TITLES = [None, "Bal kamra", "Jobb kamra", "Pitvarok", "Mitrális billentyű", "Tricuspidalis billentyű",
                "Aorta billentyű", "Pulmonalis billentyű", "Pericardium", "Egyéb"]
KNOWN_UNITS = {"mm", "cm", "m", "m/s", "cm/s", "ms", "ml", "kg", "%", "hgmm", "cm2"}
NUMBER = re.compile(r"-?\d+(?:,\d+)?")

# Values dictated as a pair ("58 per 42", "36 x 45"): Whisper sometimes writes "58,42"
PAIRS = [("lv_edd", "lv_esd"), ("rv_edd", "rv_esd"), ("la_1", "la_2"), ("ra_1", "ra_2"),
         ("ivc_max", "ivc_min"), ("e_wave", "a_wave"), ("av_grad_peak", "av_grad_mean")]
PAIR_FIELDS = {k for pair in PAIRS for k in pair}

WORD_RE = re.compile(r"[a-záéíóöőúüű]+")

# Words the AI may write although Whisper spelled them differently: standard report words
# and the vocabulary list. (Finding words like akinetikus are NOT here: see FINDING_WORDS.)
KNOWN_WORDS = set(WORD_RE.findall("""
    pericardialis fluidum látható nem nincs regionális falmozgászavar billentyű billentyűn
    mitrális mitralis tricuspidalis aorta pulmonalis vékony hártyás harmada harmad fal falak
    basalis apicalis csúcsi septum septumon pitvari kamra kamrák mellett mögött előtt körül
    echodenz térkiszélesedés meszes meszesedés regurgitatio regurgitáció insufficientia
    prolapsus bileaflet flail tenting tethering coaptatios coaptatio papilláris izom
    dysfunctio talaján funkcionális bicuspidalis háromtasakos elvékonyodott heges diffuz
    túlsúlyú látható valamint egyebekben kompenzáló kereten óránál gyök ascendens
    systolés diastolés systolo systoles szisztolés diasztolés
""".lower()))
try:
    from pathlib import Path as _Path
    _vocab = _Path(__file__).with_name("vocabulary.txt").read_text(encoding="utf-8")
    KNOWN_WORDS |= set(WORD_RE.findall("\n".join(
        l for l in _vocab.lower().splitlines() if not l.startswith("#"))))
except OSError:
    pass
KNOWN_WORDS -= {"akinetikus", "hypokinetikus"}

# Finding words that change the meaning: (name, pattern, also warn if said but missing)
FINDING_WORDS = [
    ("akinetikus/akinezis", r"\bakin[eé](?:tikus|zis)", True),
    ("hypokinetikus/hypokinezis", r"\bh[iy]pokin[eé](?:tikus|zis)", True),
    ("dyskinetikus", r"\bd[iy]s[z]?kin[eé](?:tikus|zis)", True),
    ("hyperkinezis", r"\bh[iy]perkin[eé](?:tikus|zis)", True),
    ("aneurizma", r"\baneur[iy]zm", True),
    ("inferior", r"\binferior", True),
    ("inferolateralis", r"\binferolater", True),
    ("anterolateralis", r"\banterolater", True),
    ("anteroseptalis", r"\banterosept", True),
    ("inferoseptalis", r"\binferosept", True),
    ("anterior", r"\banterior", False),
]
SECTION_NAMES = {"fejlec": "fejléc", "falmozgas": "falmozgás", "bal_kamra": "bal kamra", "jobb_kamra": "jobb kamra", "pitvarok": "pitvarok",
                 "mitralis": "mitrális", "tricuspidalis": "tricuspidalis",
                 "aorta": "aorta", "pulmonalis": "pulmonalis", "pericardium": "pericardium",
                 "egyeb": "egyéb"}

# Units whose values are (almost) always whole numbers. Set by the doctor (2026-09-29).
WHOLE_NUMBER_UNITS = {"mm", "ms", "cm/s", "Hgmm", "/min", "kg", "RPM", "%"}
# Not checked at all: "cm" (LVOT VTI 21,5 cm), "ml" and "ml/m2" (volumes can have decimals;
# a PISA VTI of "1,1" is caught by the range check instead), and these fields:
DECIMALS_OK = {"lvot_diam", "rvot_diam", "mv_grad", "gls", "lares",   # LASr (LARes): a strain like GLS
               "la_cd", "la_ct", "rv_fwls", "rv_sls", "rv_gls",       # the other strains (2026-11-05)
               "mr_rad", "tr_rad", "ar_rad"}             # PISA radius: 6,7 mm is normal
# Usually whole, rarely not: a decimal gets a yellow "check", never a suggested fix.
RARELY_DECIMAL = {"ef", "lv3d_ef", "rv3d_ef", "la_ef", "mr_vc", "tr_vc", "ar_vc"}

# Plausible ranges set by the doctor (2026-09-28). Outside the range = a "check" flag;
# the value is never changed. Applies to dictated and calculated values.
#   key: (lowest usual, highest usual, reason shown on the page)
RANGES = {
    "ef": (0, 80, "80% feletti EF nem reális"),
    "lv3d_ef": (0, 80, "80% feletti EF nem reális"),
    "rv3d_ef": (0, 80, "80% feletti EF nem reális"),
    "gls": (-30, 0, "GLS -30% alatt nem reális, pozitív nem lehet"),
    "lvot_vti": (None, 40, "az LVOT VTI általában 40 cm alatti"),
    "co": (None, 12, "a CO általában 12 l/min alatti"),
    "ci": (None, 6, "a CI általában 6 l/min/m2 alatti"),
    "dt": (50, None, "50 ms alatti DT rendkívül ritka"),
    "e_wave": (None, 200, "az E hullám ritkán 200 cm/s feletti"),
    "a_wave": (None, 200, "az A hullám ritkán 200 cm/s feletti"),
    "ava": (None, 3.0, "3,0 cm2 feletti AVA szokatlan"),
    # MVA (2026-10-01): a normal mitral valve area is about 4-6 cm2, above 6 is not realistic as a measurement
    "mva": (None, 6.0, "6 cm2 feletti MVA nem reális"),
    "mva_vti": (None, 6.0, "6 cm2 feletti MVA nem reális"),
    "mva_pht": (None, 6.0, "6 cm2 feletti MVA nem reális"),
    "mr_vti": (50, None, "50 cm alatti PISA VTI nem reális"),
    "tr_vti": (50, None, "50 cm alatti PISA VTI nem reális"),
    "ar_vti": (50, None, "50 cm alatti PISA VTI nem reális"),
}


# =====================================================================================
# Small helpers
# =====================================================================================

def to_float(text):
    """'1,33' -> 1.33 ; '-16,2' -> -16.2 ; anything else -> None"""
    if text is None or not re.fullmatch(r"-?\d+(?:,\d+)?", text):
        return None
    x = float(text.replace(",", "."))
    return x if math.isfinite(x) else None       # a 400-digit number is "infinite" for the computer: not a value


def fmt(x, decimals):
    """1.3333 -> '1,33' (decimal comma). decimals=0 -> whole number.
    Rounds half up, as on paper: 62,5 -> 63, 0,625 -> 0,63 (changed 2026-10-09). Python's round() and "%.2f" round
    a tie to the even digit (62,5 -> 62), and the computer's binary numbers turn 4,55 into 4,5499999… (-> 4,5).
    So the value is first cut to 9 decimals (removes that binary noise), then rounded half up."""
    if not math.isfinite(x):                     # (calc() never sends one; nothing sensible to write)
        return ""
    with localcontext() as ctx:
        ctx.prec = 400                           # enough digits for any number, so a huge typed value can't crash it
        d = Decimal(repr(x)).quantize(Decimal("1e-9"), rounding=ROUND_HALF_EVEN)
        text = str(d.quantize(Decimal(1).scaleb(-decimals), rounding=ROUND_HALF_UP))
    if text.startswith("-") and not text.strip("-0,."):          # -0,00 -> 0,00
        text = text[1:]
    return text.replace(".", ",")


class Report:
    """Holds the values and messages for one dictation while it's being processed."""

    def __init__(self, data, transcript):
        self.data = data
        self.transcript = transcript                          # raw Whisper text
        self.text_digits = words_to_digits(transcript)        # what the AI saw
        self.text_all_digits = words_to_digits(transcript, aggressive=True)
        self.values = {}          # key -> value as written in the report (string)
        self.evidence = {}        # key -> words the AI copied from the transcript
        self.calculated = {}      # key -> description of inputs (for "Számolt értékek")
        self.warnings = []
        self.flags = []           # the same warnings, with field / level / suggestion
        self.correction_of = {}   # key -> "52 → 48" (shown next to the field on the page)
        self.exact = {}           # key -> unrounded calculated value, used by further calculations (template 4.7)
        self.calc_options = {}    # key -> (calculated value, inputs), even if dictated:
                                  # the page offers it on a "Számol" button
        self.phase = "ai"         # flags from reading the AI's answer ("ai") or from the
                                  # checks that are redone after every edit ("live")
        self.find_heard_numbers()
        self.blank = set()        # boxes emptied by hand on the page: their calculated value is not used (live_report)
        self.corrections = []     # "LV EDD: 52 → 48"
        self.egyeb = []           # lines for the "Egyéb" section
        self.texts = {}           # section -> free text

    def warn(self, text, key=None, level="check", suggestion=None, section=None):
        """Record a warning. For the web page it also remembers which field (key) or
        free-text section it belongs to, and what kind it is:
          level "likely": probably a transcription slip, often with a suggested fix
          level "check":  something to look at
        """
        self.warnings.append(text)
        self.flags.append({"text": text, "key": key, "level": level,
                           "suggestion": suggestion, "section": section, "phase": self.phase})

    def num(self, key):
        return to_float(self.values.get(key))

    def label(self, key):
        return FIELD[key].label

    # =================================================================================
    # 1. Clean up the AI's values
    # =================================================================================

    def find_heard_numbers(self):
        """Numbers that really occur in the transcript. For "48,57" (a pair Whisper wrote
        as a decimal) the two halves 48 and 57 are kept too, for the pair fields only."""
        tokens = [n.lstrip("-") for n in NUMBER.findall(self.text_all_digits)]
        self.heard_numbers = set(tokens)
        # Whisper sometimes writes a decimal as "12, 6": a single digit after "comma space"
        # counts as the decimal part (12,6). Longer tails ("45, 30") are two numbers.
        self.heard_numbers |= {f"{a},{b}" for a, b in
                               re.findall(r"(\d+), (\d)(?!\d)", self.text_all_digits)}
        self.heard_halves = {half for n in tokens if "," in n for half in n.split(",")}

    def take_values(self):
        seen = {}                                  # key -> earlier value
        for item in self.data.get("values", []):
            key = item.get("field")
            if key not in FIELD:
                continue
            value = (item.get("value") or "").strip().replace(".", ",")
            evidence = (item.get("evidence") or "").strip()
            unit_said = (item.get("unit_said") or "").strip().lower()
            # Lean answers have no "unit_said": a spoken unit is inside the value ("0,8 m/s")
            m = re.fullmatch(r"(-?\d+(?:,\d+)?(?:-\d+(?:,\d+)?)?)\s*([A-Za-z%/].*)", value)  # unit: letter, % or /
            if "unit_said" not in item and m:
                value, unit_said = m.group(1), m.group(2).strip().lower()
            if not value:
                continue
            # SAFETY RULE: a number that was never said never goes into the report.
            if not self.was_heard(key, value):
                self.warn(f"{self.label(key)}: „{value}” nem található az átiratban, de az AI "
                                     f"ehhez a mezőhöz társította. Kihagyva, ellenőrizd!", key=key)
                continue
            value = self.clean_value(key, value, unit_said, evidence)
            if value is None:
                continue
            # Last value wins. If the AI gave a field twice with different values,
            # that is a correction and it's listed.
            if key in seen and seen[key] != value:
                self.add_correction(key, seen[key], value)
            seen[key] = value
            self.values[key] = value
            self.evidence[key] = evidence

        self.split_fake_decimals()

        # Corrections the AI reported: list them, and check they match the final value
        for c in self.data.get("corrections", []):
            key = c.get("field")
            if key not in FIELD:
                continue
            old, new = (c.get("old") or "").strip(), (c.get("new") or "").strip()
            if FIELD[key].kind == "grade":
                old, new = self.grade_text(old) or old, self.grade_text(new) or new
            elif FIELD[key].kind == "num":
                # "56 %" -> "56": compare numbers only (lean answers may carry the unit)
                strip_unit = lambda v: re.sub(r"\s*[A-Za-z%/][A-Za-z%/0-9]*$", "", v.replace(".", ","))
                old, new = strip_unit(old), strip_unit(new)
            if old and new and old != new:
                self.add_correction(key, old, new)
                # (a pair written as "34x25" can't be compared with one value: skip)
                if self.values.get(key) != new and not re.search(r"\d\s*(x|/|per)\s*\d", new):
                    self.warn(
                        f"{self.label(key)}: a javítás ({old} → {new}) nem egyezik a "
                        f"végső értékkel ({self.values.get(key, 'nincs')}). Ellenőrizd!", key=key)

        for t in self.data.get("texts", []):
            text = (t.get("text") or "").strip()
            if text:
                section = t.get("section")
                self.texts[section] = (self.texts.get(section, "") + " " + text).strip()

        for item in self.data.get("egyeb", []):
            if item and item.strip():
                self.egyeb.append(item.strip())
                self.warn(f"Nem besorolható, az Egyéb részbe került: „{item.strip()}”", section="egyeb")

        # GLS: the minus sign must have been said ("mínusz 16,2" or "-16,2"). The AI must
        # not add it; if it did, write the value as dictated (check() then warns).
        gls = self.values.get("gls", "")
        if gls.startswith("-") and not re.search(
                r"(m[ií]nusz|-)\s*" + re.escape(gls[1:]), self.text_all_digits, re.I):
            self.values["gls"] = gls[1:]
            self.corrections = [c for c in self.corrections if not c.startswith("GLS:")]
            self.warnings = [w for w in self.warnings if not w.startswith("GLS: a javítás")]
            self.flags = [f for f in self.flags if not f["text"].startswith("GLS: a javítás")]

    def was_heard(self, key, value):
        """True if every number in the value occurs in the transcript."""
        field = FIELD[key]
        if field.kind in ("choice", "flag"):
            return True
        for n in re.findall(r"\d+(?:,\d+)?", value):
            if n in self.heard_numbers:
                continue
            if key in PAIR_FIELDS and n in self.heard_halves:
                continue                          # half of a "48,57"; warned about later
            return False
        return True

    def split_fake_decimals(self):
        """A pair field holding "103,63" with its partner empty: Whisper joined the pair.
        Split it (two or more decimal digits never happen in these fields) and warn."""
        for k1, k2 in PAIRS:
            value = self.values.get(k1, "")
            if k2 not in self.values and re.fullmatch(r"\d+,\d{2,}", value):
                a, b = value.split(",")
                self.values[k1], self.values[k2] = a, b
                self.evidence[k2] = self.evidence.get(k1, "")
                self.warn(f"{self.label(k1)}: „{value}” tizedesnek tűnt, párként "
                                     f"értelmezve: {a}/{b}. Ellenőrizd!", key=k1, level="likely")

    def add_correction(self, key, old, new):
        line = f"{self.label(key)}: {old} → {new}"
        if line not in self.corrections:
            self.corrections.append(line)
            self.correction_of[key] = (self.correction_of[key] + ", " if key in self.correction_of
                                       else "") + f"{old} → {new}"

    def clean_value(self, key, value, unit_said, evidence):
        """Returns the value as it should be written, or None if it goes to Egyéb."""
        field = FIELD[key]
        if key == "ivc_min" and value.strip().lower().startswith("kol"):
            return "kol"                             # "IVC 12 per kollabál" -> IVC: 12/kol (template.md)
        if field.kind == "num":
            value = value.replace(".", ",")          # 2.5 -> 2,5 (not in "gr. II")

        if field.kind == "grade":
            # Grades have no decimals: Whisper's "1,2" means 1-2
            if re.fullmatch(r"[1-6],[1-6]", value):
                self.warn(f"{field.label}: „{value}” fokozatként 1 kötőjel 2 "
                                     f"formában értelmezve ({value.replace(',', '-')}). Ellenőrizd!", key=key, level="likely")
                value = value.replace(",", "-")
            text = self.grade_text(value, key)
            if text is None:
                self.unplaceable(key, value, "érvénytelen fokozat")
            return text

        if field.kind == "choice":
            for choice in CHOICES[key]:
                if value.lower().replace(" ", "-") == choice.lower().replace(" ", "-"):
                    return choice
            self.warn(f"{field.label}: szokatlan érték „{value}”, ahogy diktálva.", key=key)
            return value

        if field.kind == "flag":
            return "igen"

        if field.kind == "text":                     # a few words, written as typed: one line, at most 60 characters,
            return " ".join(value.split())[:60] or None   # so "Sport: ..." always fits one report row

        # Numbers. Strip a unit the AI may have left in the value ("12 mm" -> "12").
        as_given = value
        value = re.sub(r"\s*[a-zA-Z%/]+[0-9]*$", "", value).strip()
        if not value:                                # nothing but letters ("abc"): say what it was
            self.unplaceable(key, as_given, "nem értelmezhető szám")
            return None
        if key == "ef" and re.fullmatch(r"\d+(?:,\d+)?\s*-\s*\d+(?:,\d+)?", value):
            return value.replace(" ", "")                # EF range "55-60"
        if to_float(value) is None:
            self.unplaceable(key, value, "nem értelmezhető szám")
            return None

        # TM is usually dictated in cm (178) and written in m (1,78). Standard, no warning.
        if key == "tm" and to_float(value) > 3:
            return fmt(to_float(value) / 100, 2)

        # A different unit than the template's: convert, with a warning.
        if unit_said in KNOWN_UNITS and unit_said != field.unit.lower():
            factor = {("m/s", "cm/s"): 100, ("cm/s", "m/s"): 0.01,
                      ("cm", "mm"): 10, ("mm", "cm"): 0.1}.get((unit_said, field.unit))
            if factor:
                decimals = 0 if field.unit in ("cm/s", "mm") else 2
                new = fmt(to_float(value) * factor, decimals)
                self.warn(f"{field.label}: {value} {unit_said} diktálva, "
                                     f"átszámolva: {new} {field.unit}.", key=key, level="likely")
                return new
        return value

    def grade_text(self, value, key=None):
        """'1-2' -> 'gr. I-II', 'jelzett' -> 'jelz.', 'nincs' -> 'nincs', else None."""
        v = value.lower().strip().rstrip(".")
        if v.startswith("jelz"):
            return "jelz."
        if v in ("nincs", "0"):
            return "nincs"
        v = re.sub(r"^(gr|grade)\.?\s*", "", v)
        parts = re.split(r"\s*-\s*", v)
        if all(p in ROMAN for p in parts) and 1 <= len(parts) <= 2:
            if key and any(int(p) > MAX_GRADE.get(key, 4) for p in parts):
                return None
            return "gr. " + "-".join(ROMAN[p] for p in parts)
        if re.fullmatch(r"[ivx]+(-[ivx]+)?", v):                 # already Roman
            return "gr. " + v.upper()
        return None

    def grade_level(self, key):
        """Lower bound of a grade as a number: 'gr. II-III' -> 2, 'jelz.'/'nincs'/missing -> 0."""
        romans = re.findall(r"[IV]+", self.values.get(key, "").replace("gr. ", ""))
        return list(ROMAN.values()).index(romans[0]) + 1 if romans else 0

    def unplaceable(self, key, value, why):
        if getattr(self, "typed", False):          # typed on the page: stays in its box, out of the report
            self.warn(f"{self.label(key)}: „{value}” ({why}), kimarad a leletből.", key=key)
            return
        self.egyeb.append(f"{self.label(key)}: {value}")
        self.warn(f"{self.label(key)}: „{value}” ({why}), az Egyéb részbe került.", key=key)

    # =================================================================================
    # 2. Calculations (template.md Section 4). Only when not dictated and all inputs exist.
    #    If dictated AND calculable: the dictated value stays, >10% difference = warning.
    # =================================================================================

    def calc(self, key, value, inputs):
        """Store a calculated value, or compare it with the dictated one."""
        if not math.isfinite(value):             # absurd typed inputs (e.g. 300 digits) overflow: no value, no "nan"
            return
        decimals = FIELD[key].calc
        text = fmt(value, decimals)
        unit = FIELD[key].unit
        self.calc_options[key] = (text, inputs)
        if key in self.blank:                    # you emptied this box: not written, not used further (ƒx still offers it)
            return
        if key in self.values:
            dictated = self.num(key)
            if dictated is not None and value and abs(dictated - value) / abs(value) > 0.10:
                # Exactly 10x or 100x the calculated value: "egész" was probably lost
                # ("CO 51" for 5,1). Then it's a likely slip, with the calculated value
                # as suggestion; otherwise just "check".
                ratio = dictated / value
                slip = any(abs(ratio - f) / f < 0.05 for f in (10, 100))   # only too BIG
                # Reg. vol. = ERO x VTI: when the VTI is itself unrealistic (< 50 cm), it is the likely slip, not the
                # Reg. vol.; the VTI that fits the dictated Reg. vol. is named and no fix is suggested for the Reg. vol.
                p = key.split("_")[0]
                vti, ero = self.num(f"{p}_vti"), self.x(f"{p}_ero")
                if key.endswith("_regvol") and vti and ero and vti < RANGES[f"{p}_vti"][0] \
                        and dictated / ero >= RANGES[f"{p}_vti"][0]:
                    self.warn(f"{self.label(key)}: diktált {self.values[key]}, számolt {text} {unit} ({inputs}). "
                              f"A VTI ({self.values[f'{p}_vti']} cm) túl kicsi: valószínűleg az hibás "
                              f"(a diktált Reg. vol.-hoz kb. {fmt(dictated / ero, 0)} cm tartozna).",
                              key=key, level="check")
                    return
                self.warn(f"{self.label(key)}: diktált {self.values[key]}, "
                          f"számolt {text} {unit} ({inputs})."
                          + (" Valószínűleg elveszett az „egész”." if slip else ""),
                          key=key, level="likely" if slip else "check",
                          suggestion=text if slip else None)
            return
        self.values[key] = text
        self.exact[key] = value
        self.calculated[key] = f"{self.label(key)}: {text} {unit} ({inputs})".replace("  ", " ")

    def copy_value(self, key, source):
        """The same measurement in two boxes (LAV = LA ESV, 4.15): an empty one gets the other's value as it is
        (no rounding, so not through calc()); the page offers it on the ƒx button."""
        text, inputs = self.values[source], f"= {self.label(source)}"
        self.calc_options[key] = (text, inputs)
        if key in self.values or key in self.blank:          # typed, or emptied by hand: left as it is
            return
        self.values[key] = text
        self.calculated[key] = f"{self.label(key)}: {text} {FIELD[key].unit} ({inputs})"

    def shown(self, key):
        """A value as an input in a calculation's explanation (Számolt értékek, the box's hover, ƒx): a calculated one
        with one decimal more than in the report, so it shows the unrounded value that was used (ERO 0,185 for the
        written 0,18; 2026-10-09, the user's wish); a typed / dictated one as it is in its box."""
        if key in self.calculated and key in self.exact:
            return fmt(self.exact[key], FIELD[key].calc + 1)
        return self.values[key]

    def x(self, key):
        """A value as an input of a further calculation: the unrounded result when the program calculated it
        (SVi = SV / BSA with the unrounded SV and BSA; template.md 4.7, 2026-10-09), else the value in the box."""
        return self.exact[key] if key in self.calculated and key in self.exact else self.num(key)

    def calculate(self):
        v = self.num
        x = self.x                     # for inputs that may themselves be calculated: unrounded

        # 4.15 LA volumes (2026-11-05): LAV and LA ESV are the same volume (the LA's largest): when only one is there,
        # it is copied into the other as it is (no rounding); both there but different: a warning. Then LA SV = ESV - EDV
        # and LA EF = SV / ESV x 100 (the LA is largest at the end of LV systole, so ESV > EDV here)
        for key, source in (("la_esv", "lav"), ("lav", "la_esv")):
            if source in self.values and source not in self.calculated and v(source) is not None:
                self.copy_value(key, source)
        if "lav" in self.values and "la_esv" in self.values and not (self.calculated.keys() & {"lav", "la_esv"}) \
                and v("lav") != v("la_esv"):
            self.warn(f"LAV ({self.values['lav']} ml) és LA ESV ({self.values['la_esv']} ml) ugyanaz a térfogat "
                      f"(a bal pitvar legnagyobb térfogata), de eltérnek. Ellenőrizd!", key="la_esv")
        if v("la_esv") and v("la_edv") is not None and v("la_esv") > v("la_edv"):
            inputs = f"LA EDV {self.values['la_edv']} ml, LA ESV {self.values['la_esv']} ml"
            self.calc("la_sv", v("la_esv") - v("la_edv"), inputs)
            self.calc("la_ef", (v("la_esv") - v("la_edv")) / v("la_esv") * 100, inputs)

        # 4.11 EF and SV from the volumes (2D, 3D, RV 3D; 2026-10-08): SV = EDV - ESV, EF = SV / EDV
        for ef, sv, edv, esv in (("ef", "lv_sv", "edv", "esv"), ("lv3d_ef", "lv3d_sv", "lv3d_edv", "lv3d_esv"),
                                 ("rv3d_ef", "rv3d_sv", "rv3d_edv", "rv3d_esv")):
            if v(edv) and v(esv) is not None and v(edv) > v(esv):
                inputs = f"EDV {self.values[edv]} ml, ESV {self.values[esv]} ml"
                self.calc(sv, v(edv) - v(esv), inputs)
                self.calc(ef, (v(edv) - v(esv)) / v(edv) * 100, inputs)

        # 4.13 FAC from the RV areas (2026-10-11): (RVEDA - RVESA) / RVEDA x 100, only when RVEDA > RVESA
        if v("rv_eda") and v("rv_esa") is not None and v("rv_eda") > v("rv_esa"):
            self.calc("fac", (v("rv_eda") - v("rv_esa")) / v("rv_eda") * 100,
                      f"RVEDA {self.values['rv_eda']} cm2, RVESA {self.values['rv_esa']} cm2")

        # 4.1 BSA (Mosteller). TM is stored in m.
        if v("ts") and v("tm") and v("ts") > 0 and v("tm") > 0:     # (a negative typed value: no square root)
            self.calc("bsa", math.sqrt(v("tm") * 100 * v("ts") / 3600),
                      f"TS {self.values['ts']} kg, TM {self.values['tm']} m")

        # 4.2 Diastolic ratios
        if v("e_wave") and v("a_wave"):
            self.calc("ea_ratio", v("e_wave") / v("a_wave"),
                      f"E {self.values['e_wave']} / A {self.values['a_wave']}")
        for side in ("lat", "med"):
            e_prime = v(f"tdi_{side}_e")
            if v("e_wave") and e_prime:
                self.calc(f"tdi_{side}_ee", v("e_wave") / e_prime,
                          f"E {self.values['e_wave']} / E' {self.values[f'tdi_{side}_e']}")

        # 4.3 Aortic / LVOT
        lvot_area = sv_from_lvot = None
        if v("lvot_diam") and v("lvot_vti"):
            lvot_area = math.pi * (v("lvot_diam") / 20) ** 2
            sv_from_lvot = lvot_area * v("lvot_vti")
            self.calc("sv", sv_from_lvot, f"LVOT Diam {self.values['lvot_diam']} mm, "
                                          f"LVOT VTI {self.values['lvot_vti']} cm")
        if x("sv") and x("bsa"):
            self.calc("svi", x("sv") / x("bsa"), f"SV {self.shown('sv')} ml, BSA {self.shown('bsa')} m2")
        if x("sv") and v("hr"):
            self.calc("co", x("sv") * v("hr") / 1000, f"SV {self.shown('sv')} ml, HR {self.values['hr']} /min")
        if x("co") and x("bsa"):
            self.calc("ci", x("co") / x("bsa"), f"CO {self.shown('co')} l/min, BSA {self.shown('bsa')} m2")
        if lvot_area and v("av_vti"):
            self.calc("ava", lvot_area * v("lvot_vti") / v("av_vti"),
                      f"LVOT Diam {self.values['lvot_diam']} mm, LVOT VTI {self.values['lvot_vti']} cm, "
                      f"AV VTI {self.values['av_vti']} cm")
        if x("ava") and x("bsa"):
            self.calc("avai", x("ava") / x("bsa"), f"AVA {self.shown('ava')} cm2, BSA {self.shown('bsa')} m2")
        if v("lvot_vti") and v("av_vti"):
            self.calc("dvi", v("lvot_vti") / v("av_vti"),
                      f"LVOT VTI {self.values['lvot_vti']} / AV VTI {self.values['av_vti']}")

        # 4.12 Pulmonalis (2026-10-11): Qp/Qs = RVOT SV / LVOT SV (each = π × (Diam / 20)² × VTI);
        # APdiast gradient = 4 × PI end-diastolic velocity² (RAP is added in the report, as for APsyst)
        if sv_from_lvot and v("rvot_diam") and v("rvot_vti"):
            rvot_sv = math.pi * (v("rvot_diam") / 20) ** 2 * v("rvot_vti")
            self.calc("qp_qs", rvot_sv / sv_from_lvot,
                      f"RVOT Diam {self.values['rvot_diam']} mm, RVOT VTI {self.values['rvot_vti']} cm, "
                      f"LVOT Diam {self.values['lvot_diam']} mm, LVOT VTI {self.values['lvot_vti']} cm")
        if v("pi_ed_vel"):
            self.calc("padp_grad", 4 * v("pi_ed_vel") ** 2, f"PI ED vel. {self.values['pi_ed_vel']} m/s")

        # 4.8 From the echo calculator (inputs typed on the page)
        mitral_prosthesis = self.values.get("mv_morph") == "műbillentyű"
        if v("mv_pht") and not mitral_prosthesis:     # 220 / PHT overestimates a prosthesis' EOA (Zoghbi 2024): no MVA
            self.calc("mva_pht", 220 / v("mv_pht"), f"220 / MV PHT {self.values['mv_pht']} ms")
        if lvot_area and v("mv_vti_cw"):
            self.calc("mva_vti", lvot_area * v("lvot_vti") / v("mv_vti_cw"),
                      f"LVOT Diam {self.values['lvot_diam']} mm, LVOT VTI {self.values['lvot_vti']} cm, "
                      f"MV VTI (CW) {self.values['mv_vti_cw']} cm")
        # 4.14 Mitral prosthesis (2026-10-13, page only): DVI = MV VTI (CW) / LVOT VTI, EOAi = EOA (MVA (VTI)) / BSA
        if mitral_prosthesis and v("mv_vti_cw") and v("lvot_vti"):
            self.calc("mv_dvi", v("mv_vti_cw") / v("lvot_vti"),
                      f"MV VTI (CW) {self.values['mv_vti_cw']} / LVOT VTI {self.values['lvot_vti']}")
        if mitral_prosthesis and x("mva_vti") and x("bsa"):
            self.calc("mv_eoai", x("mva_vti") / x("bsa"), f"EOA {self.shown('mva_vti')} cm2, BSA {self.shown('bsa')} m2")
        if v("mv_vti_pw") and v("lvot_vti"):
            self.calc("mv_lvot_vti", v("mv_vti_pw") / v("lvot_vti"),
                      f"MV VTI (PW) {self.values['mv_vti_pw']} / LVOT VTI {self.values['lvot_vti']}")
        if v("lvot_vmax") and v("av_vmax"):
            self.calc("dvi_vmax", v("lvot_vmax") / v("av_vmax"),
                      f"LVOT Vmax {self.values['lvot_vmax']} / AV Vmax {self.values['av_vmax']}")
        for p, name in (("mv", "Mitrális"), ("tv", "Tricuspidalis")):     # 4.9 respiratory variation
            if v(f"{p}_resp_max") and v(f"{p}_resp_min") is not None:
                self.calc(f"{p}_resp_var", (v(f"{p}_resp_max") - v(f"{p}_resp_min")) / v(f"{p}_resp_max") * 100,
                          f"({name} max {self.values[f'{p}_resp_max']} − min {self.values[f'{p}_resp_min']}) / max")
        if v("av_at") and v("av_et"):
            self.calc("av_at_et", v("av_at") / v("av_et"),
                      f"AT {self.values['av_at']} ms / ET {self.values['av_et']} ms")

        # LAVi (template.md 5b)
        if v("lav") and x("bsa"):
            self.calc("lavi", v("lav") / x("bsa"), f"LAV {self.values['lav']} ml, BSA {self.shown('bsa')} m2")

        # 4.10 TR gradient <-> TR Vmax: gradient = 4 x Vmax2. Whichever was not said is calculated; if both were
        # said they are compared once, on the gradient (>10 % apart = warning). The TR Vmax comes first: the TR
        # PISA (4.5) can use it.
        if v("pasp_grad") and v("pasp_grad") > 0 and "tr_vmax" not in self.values:   # (no root of a negative)
            self.calc("tr_vmax", math.sqrt(v("pasp_grad") / 4), f"TR gradiens {self.values['pasp_grad']} Hgmm")
        if v("tr_vmax") and "tr_vmax" not in self.calculated:
            self.calc("pasp_grad", 4 * v("tr_vmax") ** 2, f"TR Vmax {self.values['tr_vmax']} m/s")

        # 4.5 PISA, 4.6 regurgitant fraction
        for p in ("mr", "tr", "ar"):
            if v(f"{p}_rad") and v(f"{p}_avel") and x(f"{p}_vmax"):       # (also a TR Vmax calculated from the gradient)
                ero = 2 * math.pi * (v(f"{p}_rad") / 10) ** 2 * v(f"{p}_avel") / (x(f"{p}_vmax") * 100)
                self.calc(f"{p}_ero", ero, f"Rad. {self.values[f'{p}_rad']} mm, A. vel. "
                          f"{self.values[f'{p}_avel']} cm/s, Vmax {self.shown(f'{p}_vmax')} m/s")
            if x(f"{p}_ero") and v(f"{p}_vti"):
                self.calc(f"{p}_regvol", x(f"{p}_ero") * v(f"{p}_vti"),
                          f"ERO {self.shown(f'{p}_ero')} cm2, VTI {self.values[f'{p}_vti']} cm")
        if sv_from_lvot and x("mr_regvol"):
            self.calc("mr_regfrac", x("mr_regvol") / (x("mr_regvol") + sv_from_lvot) * 100,
                      f"MR Reg. vol. {self.shown('mr_regvol')} ml, SV {fmt(sv_from_lvot, 1)} ml")
            if "mr_regfrac" in self.calculated and self.grade_level("ai") >= 2:
                self.warn("MR Reg. frakció számolva, de AI ≥ gr. II: "
                                     "a képlet jelentős AR nélkül érvényes.", key="mr_regfrac")
        if sv_from_lvot and x("ar_regvol"):
            self.calc("ar_regfrac", x("ar_regvol") / sv_from_lvot * 100,
                      f"AR Reg. vol. {self.shown('ar_regvol')} ml, SV {fmt(sv_from_lvot, 1)} ml")

        # 4.4 RAP for PASP. A RAP you dictate ("31 plusz 5") is used as dictated; the
        # calculated one is still worked out, for the page's "Számol" button.
        rap_option = None
        if v("cvp") is not None:
            rap_option = (self.values["cvp"], f"CVP {self.values['cvp']} Hgmm")
        elif "ventilated" in self.values:
            rap_option = None                   # ventilated: no IVC-based RAP
        elif v("ivc_max") and (v("ivc_min") is not None or self.values.get("ivc_min") == "kol"):
            mx = v("ivc_max")
            mn = 0 if self.values["ivc_min"] == "kol" else v("ivc_min")     # "kollabál": full collapse
            collapse = (mx - mn) / mx
            rap = 3 if (mx <= 21 and collapse >= 0.5) else 15 if (mx > 21 and collapse < 0.5) else 8
            rap_option = (str(rap), f"IVC {self.values['ivc_max']}/{self.values['ivc_min']} mm, "
                                    f"kollapszus {fmt(collapse * 100, 0)}%")
        if rap_option:
            self.calc_options["rap"] = rap_option
        self.rap_calculated = None
        if "rap" not in self.values and "rap" not in self.blank:
            self.rap_calculated = rap_option
            if self.rap_calculated and "pasp_grad" in self.values:
                rap, why = self.rap_calculated
                self.calculated["rap"] = f"RAP: {rap} Hgmm ({why})"
        if "ventilated" in self.values:
            self.calculated["ventilated"] = "Lélegeztetett: IVC alapú RAP becslés kihagyva"

    # =================================================================================
    # 3. Layout
    # =================================================================================

    def cell(self, key, label=None):
        """'Label: value unit' for one field, or None if the field is empty."""
        if key not in self.values:
            return None
        field = FIELD[key]
        value = self.values[key]
        label = label or field.label
        if field.kind == "grade":
            return f"{label}: {value}"
        return f"{label}: {value} {field.unit}".rstrip()

    def pair(self, key1, key2, label1, label2, both_label, joiner, unit):
        """'RV EDD/ESD: 36/24 mm'; with one value only: 'RV EDD: 36 mm'."""
        a, b = self.values.get(key1), self.values.get(key2)
        if a and b:
            return f"{both_label}: {a}{joiner}{b} {unit}"
        if a:
            return f"{label1}: {a} {unit}"
        if b:
            return f"{label2}: {b} {unit}"
        return None

    profile = PROFILES["70"]               # set by live_report(place=...)

    def separator(self, title=None):
        """The row between two parts, the title inside it: "--- Bal kamra -----…", as wide as the profile says."""
        p = self.profile
        if not title:
            return "-" * round(p.sep_width / p.dash)
        head = f"--- {title} "
        return head + "-" * max(int((p.sep_width - p.w(head)) / p.dash + 1e-9), 3)

    def row(self, *cells):
        """Place texts at fixed columns: row((0, 'EF: 52 %'), (16, 'EDV: 153 ml')).
        Empty cells leave a gap (items never shift left). A cell that doesn't fit moves
        to its column on the next line."""
        p = self.profile
        lines, line = [], ""
        for column, text in cells:
            if not text:
                continue
            if line and (p.w(line) + 2 * p.space > column or column + p.w(text) > p.width):
                lines.append(line)
                line = ""
            line = p.pad(line, column) + text
        if line:
            lines.append(line)
        return lines

    def closeup(self, cols, cells):
        """One row whose filled values close up to the left (2026-10-11, the user: "AV Vmax  AI" leaves no room for an
        empty gradient). Each value goes to the first of `cols` it fits in after the one before it (at least 2 spaces
        between), so full rows still line up in their usual columns; past the last column it simply follows."""
        p = self.profile
        placed, i, end = [], 0, None
        for text in (c for c in cells if c):
            if end is not None:
                while i < len(cols) and end + 2 * p.space > cols[i]:
                    i += 1
            column = cols[i] if i < len(cols) else end + 2 * p.space
            placed.append((column, text))
            end, i = column + p.w(text), i + 1
        return self.row(*placed)

    @staticmethod
    def stack(*parts):
        """The lines of several parts with one empty row between the parts that have lines (never at the start /
        end, never two in a row): the report's breathing space between the sections of a card."""
        out = []
        for part in parts:
            if part:
                if out:
                    out.append("")
                out += part
        return out

    def hanging(self, prefix, parts):
        """'Mitralis annulus lateralis TDI S: 10 cm/s, E': 12 cm/s, ...' wrapped at
        70 characters, continuation lines lined up under the first part."""
        p = self.profile
        lines, line = [], prefix
        for i, part in enumerate(parts):
            piece = part + ("," if i < len(parts) - 1 else "")
            if p.w(line) + p.w(piece) + p.space > p.width and line.strip() != prefix.strip():
                lines.append(line.rstrip())
                line = p.pad("", p.w(prefix))
            line += piece + " "
        lines.append(line.rstrip())
        return lines

    def free_text(self, text, wrap=True):
        """Free text as full sentences (capital letter, full stop), wrapped at 70. The structure you typed
        stays: every line is its own line, every empty row stays an empty row (not at the very start / end)."""
        if not text:
            return []
        out = []
        for line in text.splitlines():
            line = line.strip()
            if line:
                line = line[0].upper() + line[1:]
                if line[-1] not in ".!?:":
                    line += "."
                out += self.profile.wrap(line) if wrap else [line]
            else:
                out.append("")
        while out and out[0] == "":
            out.pop(0)
        while out and out[-1] == "":
            out.pop()
        return out

    def pisa_block(self, p, valve, right=()):
        """MR PISA: Rad. ...  Vmax ...   then indented rows below (as in the Word file), and the
        other regurgitation numbers (`right`, already written) in a column on the right."""
        keys = [k for k in FIELD if k.startswith(p + "_") and k not in (f"{p}_vc", f"{p}_pht")]
        # a TR Vmax that was only calculated from the TR gradient makes no PISA block on its own, but it is written
        # when other PISA values are there (2026-10-02)
        only_calc = lambda k: k == f"{p}_vmax" and k in self.calculated
        has_pisa = any(k in self.values and not only_calc(k) for k in keys)
        said = lambda k: k in self.values and (has_pisa or not only_calc(k))
        if not any(said(k) for k in keys):
            return []
        short = lambda k: self.cell(k, FIELD[k].label.split("PISA ")[1]) if said(k) else None
        first = f"{valve} PISA: " + (short(f"{p}_rad") or "")
        K = self.profile.cols
        ind, c2 = K["pisa_indent"], K["pisa2"]
        rows = [[(0, first.rstrip()), (c2, short(f"{p}_vmax"))],
                [(ind, short(f"{p}_ero")), (c2, short(f"{p}_vti"))],
                [(ind, short(f"{p}_regvol")), (c2, short(f"{p}_avel"))],
                [(ind, short(f"{p}_regfrac") if f"{p}_regfrac" in FIELD else None)]]
        lines = []
        for i, cells in enumerate(rows):
            lines += self.row(*cells, (K["right"], right[i] if i < len(right) else None))
        return lines

    def regurgitation(self, p, valve, right_keys, flow_key):
        """The regurgitation group, ordered as the page's card (template.md): the PISA block with
        the other numbers (VC, MV/LVOT VTI, AR PHT) in a right column; without PISA those numbers
        on one line. The flow (V. pulm. / V. hep. / Ao. desc. rev.) on its own line after it,
        with an empty row between it and what is above (in the right column it wouldn't fit in 70
        characters)."""
        right = [x for x in (self.cell(k) for k in right_keys) if x]
        lines = self.pisa_block(p, valve, right)
        if not lines and right:
            lines = self.row(*zip(self.profile.cols["three"], right))
        return self.stack(lines, self.row((0, self.cell(flow_key))))

    def tdi_lines(self, side, name):
        parts = []
        for sub, lab in (("s", "S"), ("e", "E'"), ("a", "A'"), ("ee", "E/E'")):
            key = f"tdi_{side}_{sub}"
            if key in self.values:
                unit = FIELD[key].unit
                parts.append(f"{lab}: {self.values[key]} {unit}".rstrip())
        return self.hanging(f"Mitralis annulus {name} TDI ", parts) if parts else []

    def mva_rows(self):
        """Mitral stenosis, as on the page's card (template.md, 2026-10-01): the gradient and MV PHT
        on one row, under them the MVA from VTI (or a plain MVA) and the MVA from PHT. An empty row
        is left out; a plain MVA next to an MVA (VTI) gets its own row (nothing is dropped).
        A mitral prosthesis (2026-10-13, template.md 4.14): gradient | MV PHT, EOA | EOAi, Peak E | MV DVI (the MVA (VTI)
        is written as "EOA"; a dictated MVA (PHT) / MVA follow on their own rows)."""
        if self.values.get("mv_morph") == "műbillentyű":
            c = self.cell
            return (self.two_columns([c("mv_grad"), c("mva_vti", "EOA"), c("mv_peak_e")],
                                     [c("mv_pht"), c("mv_eoai"), c("mv_dvi")], self.profile.cols["mva2"])
                    + [x for x in (c("mva_pht"), c("mva")) if x])
        mva_vti, mva = self.cell("mva_vti"), self.cell("mva")     # column 46: after "...gradiens: 12,5 Hgmm"
        # the PHT column moves to the left only as a whole, like the LVOT section (2026-10-11)
        return (self.two_columns([self.cell("mv_grad"), mva_vti or mva], [self.cell("mv_pht"), self.cell("mva_pht")],
                                 self.profile.cols["mva2"])
                + ([mva] if mva_vti and mva else []))

    def resp_line(self, p, name):
        """'Mitrális beáramlás légzésszinkron ingadozás: 80/60=25%' (template.md 4.9)."""
        mx, mn, var = (self.values.get(f"{p}_resp_{k}") for k in ("max", "min", "var"))
        if not (mx or mn or var):
            return []
        text = f"{mx or '?'}/{mn or '?'}" + (f"={var}%" if var else "") if (mx or mn) else f"{var}%"
        return [f"{name} beáramlás légzésszinkron ingadozás: {text}"]

    def pasp(self):
        if "pasp_grad" not in self.values:
            return None
        rap = self.values.get("rap") or (self.rap_calculated[0] if self.rap_calculated else "")
        return f"APsyst: {self.values['pasp_grad']}+{rap} Hgmm"          # (PASP; the name since 2026-10-01)

    def padp(self):
        """'APdiast: 6+8 Hgmm': the PI end-diastolic gradient + the same RAP as APsyst (2026-10-11)."""
        if "padp_grad" not in self.values:
            return None
        rap = self.values.get("rap") or (self.rap_calculated[0] if self.rap_calculated else "")
        return f"APdiast: {self.values['padp_grad']}+{rap} Hgmm"

    # the LVOT · AVA · SV · CO section: two columns, row by row (2026-10-11)
    LVOT_LEFT = ("lvot_diam", "lvot_vti", "sv", "svi", "co", "ci")
    LVOT_RIGHT = ("av_vti", "ava", "avai", "dvi", "av_at_et", "dvi_vmax")

    def two_columns(self, left, right, column):
        """Two columns of a part, row by row (2026-10-11; the LVOT section and the mitral stenosis). The right column
        moves to the left only as a whole: when every value in it has an empty place on its left (in its own row).
        Then it is one column, the values in their row order. Otherwise each column closes up by itself (no empty
        rows in between: DVI right under AVA when AVAi is empty)."""
        if all(not l for l, r in zip(left, right) if r):
            return [r or l for l, r in zip(left, right) if r or l]
        left, right = [x for x in left if x], [x for x in right if x]
        lines = []
        for i in range(max(len(left), len(right))):
            lines += self.row((0, left[i] if i < len(left) else None), (column, right[i] if i < len(right) else None))
        return lines

    def lvot_rows(self):
        return self.two_columns([self.cell(k) for k in self.LVOT_LEFT], [self.cell(k) for k in self.LVOT_RIGHT],
                                self.profile.cols["lvot"])

    def pulm_rows(self):
        """PI · ED vel. · APdiast · Pulm. acc. idő, under it RVOT Diam · RVOT VTI · Qp/Qs (2026-10-11); each closes up."""
        K = self.profile.cols["pulm"]
        c = self.cell
        return (self.closeup(K, [c("pi"), c("pi_ed_vel", "ED vel."), self.padp(), c("pulm_acc")])
                + self.closeup(K, [c("rvot_diam"), c("rvot_vti"), c("qp_qs")]))

    def ea(self):
        e, a, r = (self.values.get(k) for k in ("e_wave", "a_wave", "ea_ratio"))
        if e and a:
            return f"E/A: {e}/{a}" + (f"={r}" if r else "")
        if e:
            return f"E: {e}"
        if a:
            return f"A: {a}"
        return f"E/A: {r}" if r else None

    def device(self, n=""):
        """'ECMO flow: 3,5 liter/min, 3200 RPM' for device n ("", "_2", "_3"); a device without flow / RPM (a pacemaker,
        or nothing typed yet): 'Eszköz: PM' (2026-11-05)."""
        flow, rpm = self.values.get(f"device{n}_flow"), self.values.get(f"device{n}_rpm")
        if not (flow or rpm):
            return f"Eszköz: {self.values[f'device{n}']}" if self.values.get(f"device{n}") else None
        name = self.values.get(f"device{n}", "Eszköz")
        parts = ([f"{flow} liter/min"] if flow else []) + ([f"{rpm} RPM"] if rpm else [])
        return f"{name} flow: " + ", ".join(parts)

    def devices(self):
        """Every device on its own line (up to 3; the 2nd and 3rd are added with "+" on the page)."""
        return [d for d in (self.device(n) for n in ("", "_2", "_3")) if d]

    def header_rows(self):
        """HR TM TS BSA on one row (TM before TS, 2026-10-08). With a blood pressure (2026-11-05) the five don't fit in one
        row: HR and Vérnyomás on the first, TM TS BSA on the second (in the same columns)."""
        c, K = self.cell, self.profile.cols["hdr"]
        bp = self.pair("bp_sys", "bp_dia", "Vérnyomás", "Diastolés vérnyomás", "Vérnyomás", "/", "Hgmm")
        body = [c("tm"), c("ts"), c("bsa")]
        if not bp:
            return self.closeup(K, [c("hr"), *body])
        return self.closeup(K, [c("hr"), bp]) + self.closeup(K, body)

    def sport(self):
        """'Sport: futás, heti 3 x 10 km' (2026-11-05); ticked with nothing typed: 'Sport: igen'."""
        text = self.values.get("sport_text")
        if text:
            return [f"Sport: {text}"]
        return ["Sport: igen"] if self.values.get("sport") else []

    def ef_rows(self):
        """The EF row(s), 2026-10-08. The values close up to the left (an empty one leaves no gap): "EF: 52 %   GLS: ...".
        A 3D line (3D EF / EDV / ESV) comes right under the 2D one; when both are there they start with "2D:" / "3D:",
        a 3D line alone with "3D:", a 2D line alone as before (no prefix)."""
        two = [x for x in (self.cell(k, "SV" if k == "lv_sv" else None) for k in ("ef", "edv", "esv", "lv_sv", "gls")) if x]
        three = [x for x in (self.cell(f"lv3d_{k}", k.upper()) for k in ("ef", "edv", "esv", "sv")) if x]
        # the usual 4 columns; 5 values (EF EDV ESV SV GLS) need the narrower 5 (both rows the same, so they line up)
        K = self.profile.cols["ef5" if len(two) > 4 else "ef"]
        rows = []
        for prefix, cells in (("2D: " if three else "", two), ("3D: ", three)):
            if cells:
                cells = [prefix + cells[0]] + cells[1:]
                rows += self.row(*zip(K, cells))
        return rows

    def strain_row(self, keys):
        """'RV FWLS: -25 %  RV septal strain: -20 %  RV GLS: -22 %' / 'LASr: 35 %  LAScd: -20 %  LASct: -15 %'
        (2026-11-05): the filled values close up."""
        return self.closeup(self.profile.cols["rv3d"], [self.cell(k) for k in keys])

    def la_volumes(self):
        """'LA EDV: 30 ml  LA ESV: 60 ml  LA SV: 30 ml  LA EF: 50 %' (2026-11-05), under the LA strain row; written only
        when the volumetry was really done (an LA EDV, SV or EF, or a typed LA ESV): a LAV alone (copied into LA ESV)
        makes no row."""
        keys = ("la_edv", "la_esv", "la_sv", "la_ef")
        if not any(k in self.values and k not in self.calculated for k in ("la_edv", "la_sv", "la_ef")) \
                and not ("la_esv" in self.values and "la_esv" not in self.calculated):
            return []
        return self.strain_row(keys)

    def rv_3d(self):
        """'3D: RV EF: 50 %  RV EDV: 120 ml  RV ESV: 60 ml  RV SV: 60 ml' (as the LV: EF EDV ESV SV; the filled
        values close up), under TAPSE (and under the RV strain row)."""
        cells = [x for x in (self.cell(k) for k in ("rv3d_ef", "rv3d_edv", "rv3d_esv", "rv3d_sv")) if x]
        if not cells:
            return []
        return self.row(*zip(self.profile.cols["rv3d"], ["3D: " + cells[0]] + cells[1:]))

    # the valve look picked on the page (2026-10-08): the first line of the valve's text; "vékony" is not written
    MORPH = {"mv_morph": "mitrális", "tv_morph": "tricuspidalis", "av_morph": "aorta"}

    # the prosthetic valve's type as picked on the page -> the word in front of the valve's name (2026-10-13)
    VALVE_KINDS = {"Mechanikus": "mechanikus", "Biológiai": "biológiai", "Transzkatéteres": "transzkatéteres"}
    VALVE_POS = {"mv_morph": "mv", "av_morph": "av"}

    def morph_line(self, key):
        """'Meszes mitrális billentyű.' / 'Aorta műbillentyű.'; nothing for vékony or an empty picker.
        A prosthesis with its type / valve / size picked on the page (2026-10-13, template.md "Valve look"):
        'Mechanikus mitrális műbillentyű.', 'TAVI műbillentyű.', 'Biológiai aorta műbillentyű: Perimount 23 mm.'"""
        look, name = self.values.get(key), self.MORPH[key]
        if not look or look == "vékony":
            return []
        if look != "műbillentyű":
            text = f"{look} {name} billentyű."
            return [text[0].upper() + text[1:]]
        pos = self.VALVE_POS.get(key)
        valves = getattr(self, "valves", {})
        kind = valves.get(f"valve_{pos}_kind", "")
        if kind == "TAVI" and pos == "av":
            text = "TAVI műbillentyű"
        else:
            text = " ".join(x for x in (self.VALVE_KINDS.get(kind), name, "műbillentyű") if x)
        valve, size = valves.get(f"valve_{pos}", ""), valves.get(f"valve_{pos}_size", "")
        if valve:
            text += f": {valve}" + (f" {size} mm" if size else "")
        return [text[0].upper() + text[1:] + "."]

    def layout(self):
        c = self.cell
        K = self.profile.cols
        wall_motion = self.free_text(self.texts.get("falmozgas"))
        remarks = self.free_text(self.texts.get("bal_kamra"))      # other LV remarks (thrombus, noncompaction...)
        inflow = (self.closeup((0, K["dt"]), [self.ea(), c("dt")]) + self.tdi_lines("lat", "lateralis")
                  + self.tdi_lines("med", "medialis"))
        blocks = [
            # Header
            self.header_rows()
            + self.devices() + self.sport()                              # device lines, sport (2026-11-05)
            + self.free_text(self.texts.get("fejlec")),                  # the header's remark (2026-11-05)
            # Bal kamra
            # one empty row between: the dimensions | the EF row + wall motion | other remarks | E/A, TDI (2026-10-07)
            self.stack(
                self.row(*zip(K["lv"], (c("lv_edd"), c("septum"), c("ao_annulus"))))
                + self.row(*zip(K["lv"], (c("lv_esd"), c("hatso_fal"), c("sinus_valsalva"))))
                + self.row((K["lv"][2], c("ao_ascendens"))),
                self.ef_rows() + wall_motion
                + ([] if wall_motion else remarks),                  # remarks alone sit right under the EF row too
                remarks if wall_motion else [], inflow),
            # Jobb kamra
            self.row((0, self.pair("rv_edd", "rv_esd", "RV EDD", "RV ESD", "RV EDD/ESD", "/", "mm")),
                     (K["rv"], c("fac")))
            + self.row((0, c("tapse")), (K["rv"], c("tric_smax")))
            + self.strain_row(("rv_fwls", "rv_sls", "rv_gls"))         # RV strain, above the 3D row (2026-11-05)
            + self.rv_3d()
            + self.free_text(self.texts.get("jobb_kamra")),
            # Pitvarok
            self.row((0, self.pair("la_1", "la_2", "Bal pitvar", "Bal pitvar", "Bal pitvar", "*", "mm")),
                     (K["atria"], self.pair("ra_1", "ra_2", "Jobb pitvar", "Jobb pitvar", "Jobb pitvar", "*", "mm")))
            + self.row((0, c("lavi")))                                   # LAVi first (2026-10-01); LAV: not written (only for LAVi)
            + self.strain_row(("lares", "la_cd", "la_ct"))               # LA strain: LASr (was LARes), LAScd, LASct (2026-11-05)
            + self.la_volumes()                                          # LA EDV / ESV / SV / EF (2026-11-05)
            + self.free_text(self.texts.get("pitvarok")),
            # Mitrális billentyű (the valve groups follow the page's cards, 2026-10-01); an empty row between the
            # text + grade line, the regurgitation group (PISA, flow) and the stenosis
            self.stack(
                self.morph_line("mv_morph") + self.free_text(self.texts.get("mitralis")) + self.row((0, c("mi"))),
                self.regurgitation("mr", "MR", ["mr_vc", "mv_lvot_vti"], "vena_pulm_flow"),
                self.mva_rows()),
            # Tricuspidalis billentyű
            self.stack(
                self.morph_line("tv_morph") + self.free_text(self.texts.get("tricuspidalis"))
                + self.closeup(K["three"], [c("ti"), self.pasp(),
                                            self.pair("ivc_max", "ivc_min", "IVC", "IVC min", "IVC", "/", "mm")]),
                self.regurgitation("tr", "TR", ["tr_vc"], "hep_flow")),
            # Aorta billentyű: text + grade line, the LVOT / AVA / SV / CO section, the regurgitation group (AR PISA, flow)
            self.stack(
                self.morph_line("av_morph") + self.free_text(self.texts.get("aorta"))
                + self.closeup((*K["av"], K["pvl"]),                     # PVL right after AI (prosthetic valve)
                               [c("av_vmax"), self.pair("av_grad_peak", "av_grad_mean", "AV grad", "AV grad (mean)",
                                                        "AV grad", "/", "Hgmm"), c("ai"), c("pvl")]),
                self.lvot_rows(),                                        # AT/ET, DVI (Vmax): template 4.8
                self.regurgitation("ar", "AR", ["ar_vc", "ar_pht"], "ao_desc_rev")),
            # Pulmonalis billentyű: PI first, its text after it (template)
            self.pulm_rows() + self.free_text(self.texts.get("pulmonalis")),
            # Pericardium
            self.free_text(self.texts.get("pericardium"))
            + self.resp_line("mv", "Mitrális") + self.resp_line("tv", "Tricuspidalis"),
            # Egyéb
            self.free_text("\n".join(self.egyeb)),            # (the title "Egyéb" is in the separator)
        ]
        lines = []
        for title, block in zip(BLOCK_TITLES, blocks):
            if not block:
                continue
            if title or lines:                              # the header (no title) has no separator before it
                if lines:
                    lines.append("")                        # one empty row before every separator (2026-10-07)
                lines.append(self.separator(title))
            lines += block
        opinion = self.texts.get("velemeny")                # after 2 empty lines (template.md)
        if opinion:
            lines += ["", "", "Vélemény:"] + self.free_text(opinion, wrap=False)   # eMedSol wraps it itself
        return "\n".join(lines)

    # =================================================================================
    # 4. Checks (template.md Section 5)
    # =================================================================================

    def check(self):
        # (Numbers that were never said were already kept out in take_values.)

        # The words the AI copied as its source should really be in the transcript
        for key in self.values:
            if key not in self.calculated and self.evidence.get(key) \
                    and not self.found_in_transcript(self.evidence[key]):
                self.warn(f"{self.label(key)}: a forrásszöveg („{self.evidence[key]}”) "
                                     f"nem található az átiratban. Ellenőrizd!", key=key)

        # Pairs that Whisper wrote as a decimal: "bal pitvar 48,57" -> 48 and 57
        for k1, k2 in PAIRS:
            a, b = self.values.get(k1), self.values.get(k2)
            if a and b and f"{a},{b}" in self.heard_numbers and f"{a}/{b}" not in " ".join(self.warnings):
                self.warn(f"{self.label(k1)}: az átiratban „{a},{b}” áll (tizedesnek "
                                     f"tűnik), párként értelmezve: {a}/{b}. Ellenőrizd!", key=k1, level="likely")

        # A single pair value with one decimal digit: "IVC 11,5" may have been 11/5
        pair_warned = set()
        for k1, k2 in PAIRS:
            if k1 in self.values and k2 not in self.values and "," in self.values[k1]:
                self.warn(f"{self.label(k1)}: „{self.values[k1]}” egy érték tizedessel; "
                                     f"lehet, hogy két szám volt (pár). Ellenőrizd!", key=k1, level="likely")
                pair_warned.add(k1)

        # A decimal in a field that is (almost) always a whole number ("DT 2,14 ms" was 214).
        # This is a format check, not a clinical range, so it only asks to check.
        for key, value in self.values.items():
            unit = FIELD[key].unit
            whole = unit in WHOLE_NUMBER_UNITS and key not in DECIMALS_OK
            if not whole or "," not in value or key in self.calculated or key in pair_warned:
                continue
            if key in RARELY_DECIMAL:                 # EF 50,4 % or VC 5,5 mm can be real
                self.warn(f"{self.label(key)}: „{value} {unit}” tizedes érték; ez a mező ritkán "
                          f"tizedes. Ellenőrizd!", key=key)
            else:
                self.warn(f"{self.label(key)}: „{value} {unit}” tizedes érték; ez a mező szinte "
                          f"mindig egész szám, lehet átírási hiba (egy szám vagy két összevont "
                          f"szám). Ellenőrizd!", key=key, level="likely",
                          # "2,14 ms" -> 214 is a safe guess; "1,1" (one decimal) is not, and
                          # neither is a % ("50,45 %" can't be 5045) or a pair field ("48,57"
                          # is a joined pair, not 4857). "0,12" (Smax in m/s) -> 12.
                          suggestion=value.replace(",", "").lstrip("0") or "0"
                          if unit != "%" and key not in PAIR_FIELDS
                          and re.fullmatch(r"\d+,\d{2,}", value) else None)

        # Plausible ranges (RANGES above). EF may be a range "55-60": check both numbers.
        for key, (low, high, why) in RANGES.items():
            if key not in self.values:
                continue
            numbers = [to_float(n) for n in re.findall(r"-?\d+(?:,\d+)?", self.values[key])]
            if key == "ef":
                numbers = [abs(n) for n in numbers]
            if key == "dt" and any(n < 10 for n in numbers):
                why = "10 ms alatti DT nem lehetséges"
            if key == "gls" and any(n > 0 for n in numbers):
                continue                      # a positive GLS has its own "minus" warning
            if any((low is not None and n < low) or (high is not None and n > high) for n in numbers):
                self.warn(f"{self.label(key)}: {self.values[key]} {FIELD[key].unit} – {why}.",
                          key=key)
        # Technical impossibilities
        for key, value in self.values.items():
            x = to_float(value)
            if x is None:
                continue
            if x < 0 and key not in NEGATIVE_STRAIN and key not in ("la_cd", "la_ct"):   # strain: negative is normal
                self.warn(f"{self.label(key)}: negatív érték ({value}).", key=key)
            if FIELD[key].unit == "%" and x > 100:
                self.warn(f"{self.label(key)}: 100% feletti érték ({value}).", key=key)
        for key in NEGATIVE_STRAIN:                 # GLS, RV FWLS / septal / GLS: always negative (the page adds the minus)
            value = self.values.get(key)
            if value and to_float(value) is not None and to_float(value) > 0:
                self.warn(f"{self.label(key)}: {value} % mínusz nélkül diktálva. Ellenőrizd!", key=key, level="likely",
                          suggestion="-" + value)
        # LA strain (2026-11-05): conduit + contractile together are about the reservoir strain (signs ignored)
        r_, cd, ct = (self.num(k) for k in ("lares", "la_cd", "la_ct"))
        if r_ and cd is not None and ct is not None:
            total = abs(cd) + abs(ct)
            if abs(total - abs(r_)) > 0.1 * abs(r_):
                self.warn(f"LASr: {self.values['lares']} %, de |LAScd| + |LASct| = {fmt(total, 1).removesuffix(',0')} % "
                          f"(több mint 10% eltérés). Ellenőrizd!", key="lares")
        for key in ("bsa", "av_vti", "a_wave", "tdi_lat_e", "tdi_med_e", "lvot_diam"):
            if self.num(key) == 0:
                self.warn(f"{self.label(key)}: 0, ezzel nem lehet számolni.", key=key)
        # TDI side missing, device name missing
        for n in ("", "_2", "_3"):                      # every device line needs its name
            if (f"device{n}_flow" in self.values or f"device{n}_rpm" in self.values) and f"device{n}" not in self.values:
                self.warn("Eszköz flow diktálva, de az eszköz neve (ECMO/LVAD/RVAD/HM) nem.", key=f"device{n}")

    def check_texts(self):
        """Free-text safety checks: the AI may rephrase, but not change findings."""
        said = words_to_digits(self.transcript, aggressive=True).lower()
        said_words = set(WORD_RE.findall(said))
        texts = {k: v for k, v in self.texts.items() if k not in PAGE_TEXTS}   # typed ones: nothing to compare
        if self.egyeb:
            texts["egyeb"] = " ".join(self.egyeb)
        all_text = " ".join(texts.values()).lower()

        # What the AI wrote in each box (known once the page sends it back after an edit): a word or finding word that
        # is not in it was typed by the doctor, who is responsible for it - only the AI's words are compared with the
        # transcript. (None = nothing known: a fresh AI answer, everything is compared.)
        original = getattr(self, "original_texts", None)
        original_words = {k: set(WORD_RE.findall(v.lower())) for k, v in original.items()} if original is not None else None

        # 1. Words that were never said (and aren't a known spelling of a dictated word)
        for section, text in texts.items():
            new = []
            for w in WORD_RE.findall(text.lower()):
                if original_words is not None and w not in original_words.get(section, set()):
                    continue                              # typed by the doctor

                # a known word with a Hungarian ending ("bicuspidalisnak") also counts
                known_stem = any(w.startswith(k) for k in KNOWN_WORDS if len(k) >= 6)
                if (len(w) < 4 or w in said_words or w in KNOWN_WORDS or known_stem
                        or difflib.get_close_matches(w, said_words, 1, 0.75)):
                    continue
                new.append(w)
            if new:
                self.warn(f"Szöveg ({SECTION_NAMES.get(section, section)}): "
                                     f"{', '.join(sorted(set(new)))} nem hangzott el így. "
                                     f"Ellenőrizd a szóhasználatot!", section=section)

        # 2. Key finding words: added although not said, or said but left out
        for name, pattern, check_missing in FINDING_WORDS:
            in_text = re.search(pattern, all_text) is not None
            in_speech = re.search(pattern, said) is not None
            if in_text and not in_speech:
                if original is not None and not any(re.search(pattern, t.lower()) for t in original.values()):
                    continue                              # the doctor added this word himself
                where = next((sec for sec, t in texts.items() if re.search(pattern, t.lower())), "text")
                self.warn(f"Szöveg: „{name}” szerepel, de nem hangzott el. Ellenőrizd!", section=where)
            elif check_missing and in_speech and not in_text:
                self.warn(f"Szöveg: „{name}” elhangzott, de kimaradt a szövegből. "
                                     f"Ellenőrizd!", section="text")

        # 3a. Wall motion was dictated, but there is no wall-motion sentence
        if re.search(r"falmozg|kinetikus|kin[eé]zis", said) and not texts.get("falmozgas"):
            self.warn("Falmozgás elhangzott, de nincs róla mondat a leletben. Ellenőrizd!",
                      section="falmozgas")

        # 3b. Pericardial fluid was mentioned, but there is no pericardial sentence
        if re.search(r"fluidum", said) and not texts.get("pericardium") \
                and "fluidum" not in texts.get("egyeb", "").lower():
            self.warn("Pericardialis fluidum elhangzott, de nincs róla mondat a leletben. "
                                 "Ellenőrizd!", section="pericardium")

    def found_in_transcript(self, evidence):
        """Loose match word by word: at least 80% of the evidence's words must occur in
        the transcript (small spelling differences and a different word order are OK)."""
        words = lambda s: re.findall(r"[0-9]+(?:,[0-9]+)?|[a-záéíóöőúüű]+", s.lower())
        transcript_words = set(words(self.text_all_digits))
        ev_words = words(words_to_digits(evidence, aggressive=True))
        if not ev_words:
            return True
        found = sum(1 for w in ev_words if w in transcript_words
                    or (not w[0].isdigit() and difflib.get_close_matches(w, transcript_words, 1, 0.75)))
        return found >= 0.8 * len(ev_words)

    # =================================================================================
    # Everything together
    # =================================================================================

    def build(self):
        self.take_values()
        self.phase = "live"
        self.calculate()
        self.check()
        self.check_texts()
        report = self.layout()
        below = ["", "", "-----",
                 "Figyelmeztetések:", *([f"- {w}" for w in self.warnings] or ["- nincs"]),
                 "Javítások:", *([f"- {c}" for c in self.corrections] or ["- nincs"]),
                 "Számolt értékek:", *([f"- {c}" for c in self.calculated.values()] or ["- nincs"]),
                 "Nyers átirat:", self.transcript.strip()]
        return report, "\n".join(below)


# The web page shows one box per field, grouped like the report. Each group:
# (title, field keys in report order, free-text section or None, text before the fields?)
def _pisa(p):
    return [k for k in FIELD if k.startswith(p + "_") and k not in (f"{p}_vc", f"{p}_pht")]


FORM_SECTIONS = [
    ("Fejléc", ["hr", "bp_sys", "bp_dia", "tm", "ts", "bsa", "device", "device_flow", "device_rpm",
                "device_2", "device_2_flow", "device_2_rpm", "device_3", "device_3_flow", "device_3_rpm",
                "cvp", "ventilated", "supine", "afib", "pvc", "bedside", "suboptimal", "sport", "sport_text"],
     "fejlec", False),
    ("Bal kamra", ["lv_edd", "lv_esd", "septum", "hatso_fal", "ao_annulus", "sinus_valsalva",
                   "ao_ascendens", "ef", "edv", "esv", "lv_sv", "gls",
                   "lv3d_ef", "lv3d_edv", "lv3d_esv", "lv3d_sv", "e_wave", "a_wave", "ea_ratio", "dt", "l_wave",
                   "tdi_lat_s", "tdi_lat_e", "tdi_lat_a", "tdi_lat_ee",
                   "tdi_med_s", "tdi_med_e", "tdi_med_a", "tdi_med_ee"], "falmozgas", False),
    ("Jobb kamra", ["rv_edd", "rv_esd", "tapse", "fac", "rv_eda", "rv_esa", "tric_smax", "rv_fwls", "rv_sls", "rv_gls",
                    "rv3d_ef", "rv3d_edv", "rv3d_esv", "rv3d_sv"], "jobb_kamra", False),
    ("Pitvarok", ["la_1", "la_2", "ra_1", "ra_2", "lares", "la_cd", "la_ct", "lavi", "lav",
                  "la_edv", "la_esv", "la_sv", "la_ef"], "pitvarok", False),
    ("Mitrális billentyű", ["mv_morph", "mi", "mr_vc", "vena_pulm_flow", "mv_vti_pw", "mv_lvot_vti", "mv_vti_cw", *_pisa("mr"), "mv_grad", "mva_vti",
                            "mva", "mv_pht", "mva_pht", "mv_peak_e", "mv_dvi", "mv_eoai"], "mitralis", True),
    ("Tricuspidalis billentyű", ["tv_morph", "ti", "pasp_grad", "rap", "ivc_max", "ivc_min", "tr_vc",
                                 "hep_flow", *_pisa("tr")], "tricuspidalis", True),
    ("Aorta billentyű", ["av_morph", "av_vmax", "av_grad_peak", "av_grad_mean", "ai", "pvl", "ar_vc", "ar_pht", "ao_desc_rev",
                         "lvot_diam", "lvot_vti", "av_vti", "ava", "avai", "sv", "svi", "dvi",
                         "co", "ci", "lvot_vmax", "dvi_vmax", "av_at", "av_et", "av_at_et",
                         *_pisa("ar")], "aorta", True),
    ("Pulmonalis billentyű", ["pi", "pi_ed_vel", "padp_grad", "pulm_acc", "rvot_diam", "rvot_vti", "qp_qs"],
     "pulmonalis", False),
    ("Pericardium", ["mv_resp_max", "mv_resp_min", "mv_resp_var", "tv_resp_max", "tv_resp_min", "tv_resp_var"],
     "pericardium", True),
    ("Vélemény", [], "velemeny", False),
]
EXTRA_TEXTS = {"Bal kamra": "bal_kamra"}     # card title -> its second text box (after the wall motion text)
NOT_IN_REPORT = {"cvp", "ventilated", "lav",  # inputs only (they decide RAP; LAV: for LAVi)
                 "supine", "afib", "pvc", "bedside", "suboptimal",   # header ticks: only the Vélemény generator
                 "l_wave",                                           # L hullám tick (E/A line): the same

                 "mv_vti_pw", "mv_vti_cw", "lvot_vmax", "av_at", "av_et",   # calculator, page only
                 "rv_eda", "rv_esa"}                                        # the FAC calculator's window


def form_data(r):
    """Everything the web page needs to show one box per field."""
    rap_calc = getattr(r, "rap_calculated", None)
    sections = []
    for title, keys, text_key, text_first in FORM_SECTIONS:
        fields = []
        for key in keys:
            f = FIELD[key]
            value, calculated = r.values.get(key, ""), key in r.calculated
            if key == "rap" and not value and rap_calc and "pasp_grad" in r.values:
                value, calculated = rap_calc[0], True
            fields.append({
                "key": key, "label": f.label, "unit": f.unit, "kind": f.kind,
                # the page keeps room for the ƒx icon (not for TR Vmax: it is page-only, and the room would push the
                # TR PISA block over the width of its card)
                "calculable": (f.calc is not None and key != "tr_vmax") or key == "rap",
                "value": value, "calculated": calculated,
                "inputs": r.calculated.get(key, "").split("(", 1)[-1].rstrip(")")
                          if calculated else "",
                "correction": r.correction_of.get(key, ""),
                "calc_value": r.calc_options.get(key, ("", ""))[0],
                "calc_inputs": r.calc_options.get(key, ("", ""))[1],
                "not_in_report": key in NOT_IN_REPORT,
                "blank": key in r.blank,             # emptied by hand: the page keeps it empty
            })
        extra = EXTRA_TEXTS.get(title)                 # a second text box in the same card (typed on the page)
        sections.append({"title": title, "fields": fields, "text_key": text_key,
                         "text": r.texts.get(text_key, "") if text_key else "",
                         "text_first": text_first,
                         "extra_text_key": extra, "extra_text": r.texts.get(extra, "") if extra else ""})
    return {"sections": sections, "egyeb": "\n".join(r.egyeb), "flags": r.flags,
            "choices": CHOICES}


VALVE_KEYS = {f"valve_{pos}{part}" for pos in ("av", "mv") for part in ("", "_size", "_kind")}


def live_report(values, texts, egyeb, transcript, ai_texts=None, place=None):
    """The Report built from the page's boxes as edited (calculations and checks done).
    Values marked as calculated are not sent, so they are recalculated here. A calculable box sent EMPTY ("") was
    emptied by hand (2026-10-11): its calculated value is then left out of the report and of further calculations
    (before, deleting a calculated SVi brought it straight back).
    ai_texts: the text boxes as the AI first wrote them (the checks only compare the AI's own words)."""
    r = Report({"values": [], "texts": [], "corrections": [], "egyeb": []}, transcript)
    r.original_texts = ai_texts
    r.profile = PROFILES.get(place, PROFILES["70"])        # KAEC / KARU: where the report will be pasted
    r.phase = "live"
    r.typed = True                                   # values from the page's boxes, not from the AI
    for key, value in values.items():
        if key not in FIELD:
            continue
        value = (value or "").strip()
        if not value and (FIELD[key].calc is not None or key == "rap"):
            r.blank.add(key)
            continue
        if FIELD[key].kind == "num":
            value = value.replace(".", ",")          # 2.5 -> 2,5
            value = value.rstrip(",")                # "1," while typing 1,5 is not an error yet
            if value in ("-", "+"):                  # a minus being typed (GLS)
                continue
        if value:
            cleaned = r.clean_value(key, value, "", "")
            if cleaned is not None:
                r.values[key] = cleaned
    # the prosthetic valves picked on the page (valve_av / valve_mv + _size / _kind; not boxes): only for the valve's
    # first line in the report (morph_line); one short line each
    r.valves = {k: " ".join(v.split())[:80] for k, v in values.items()
                if k in VALVE_KEYS and isinstance(v, str) and v.strip()}
    r.texts = {k: v.strip() for k, v in texts.items() if v and v.strip()}
    r.egyeb = [line.strip() for line in (egyeb or "").strip().splitlines()]    # empty rows between lines stay
    r.calculate()
    r.check()
    if transcript.strip():                  # a report typed by hand has nothing to compare the texts with
        r.check_texts()
    return r


def render_form(values, texts, egyeb, transcript, ai_texts=None, place=None):
    """The page sends back the boxes as edited: redo calculations, checks and layout."""
    r = live_report(values, texts, egyeb, transcript, ai_texts, place)
    return {"report": r.layout(), **form_data(r)}


def blank_form():
    """An empty form, for a report typed by hand (no audio, no AI)."""
    out = render_form({}, {}, "", "")
    return {"report": out.pop("report"), "form": out, "below": "", "transcript": "", "full_transcript": "",
            "pauses": [], "timing": {}, "manual": True}


def make_report(data, transcript):
    """Returns (report text to paste, the part below it for checking)."""
    return Report(data, transcript).build()
