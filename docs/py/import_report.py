"""
Import: a report this program wrote (pasted back) -> the boxes of the page.

Plain code, no AI. The report's layout is fixed ("Label: value unit", the part titles are in the
separator rows), so each line is read back with the same labels the report uses (fields.py).
Nothing is invented: a line or an item that cannot be placed goes to Egyéb (the page then warns).

    parse(text) -> {"values": {...}, "texts": {...}, "egyeb": "...", "placed": n, "unplaced": [...]}

What a report cannot give back: the header tick boxes (Háton fekvő ...; Sport is written, so it comes back), values that are not written
in the report (CVP, LAV, MV VTI PW ...). Free text comes back line by line as it was wrapped; the
first text group of Bal kamra is the wall motion text, any later group the "Egyéb megjegyzés".
Tests: python test_import.py
"""

import re

from fields import CHOICES, FIELD

SEPARATOR = re.compile(r"^-{3}\s+(.+?)\s+-{3,}\s*$")      # "--- Bal kamra -----…"
PLAIN_SEPARATOR = re.compile(r"^-{10,}\s*$")                # a separator without a title (older layout)

NUM = r"-?\d+(?:,\d+)?"
DEVICE_LINE = re.compile(r"^(ECMO|LVAD|RVAD|HM|PM|Eszköz) flow:\s*(.*)$")
DEVICE_NAME_LINE = re.compile(r"^Eszköz:\s*(ECMO|LVAD|RVAD|HM|PM)$")        # a device without flow (2026-11-05)
SPORT_LINE = re.compile(r"^Sport:\s*(.+)$")                                # "Sport: futás" / "Sport: igen"
RESP_LINE = re.compile(r"^(Mitrális|Tricuspidalis) beáramlás légzésszinkron ingadozás:\s*(.*)$")
TDI_LINE = re.compile(r"^Mitralis annulus (lateralis|medialis) TDI\b\s*")
TDI_SUBS = {"S": "s", "E'": "e", "A'": "a", "E/E'": "ee"}
PISA_SHORT = {"Rad.": "rad", "ERO": "ero", "Reg. vol.": "regvol", "Reg. frakció": "regfrac",
              "Vmax": "vmax", "VTI": "vti", "A. vel.": "avel"}

# Which part of the report a title is, and which text box its free text goes to
TEXT_KEY = {"Fejléc": "fejlec", "Jobb kamra": "jobb_kamra", "Pitvarok": "pitvarok", "Mitrális billentyű": "mitralis",
            "Tricuspidalis billentyű": "tricuspidalis", "Aorta billentyű": "aorta",
            "Pulmonalis billentyű": "pulmonalis", "Pericardium": "pericardium"}


def _plain(*keys):
    return {FIELD[k].label: ("field", k) for k in keys}


def _pisa(prefix, valve):
    table = {f"{valve} PISA": ("pisa",)}
    for short, sub in PISA_SHORT.items():
        if f"{prefix}_{sub}" in FIELD:
            table[short] = ("field", f"{prefix}_{sub}")
    return table


# label in the report -> how to read the value, per part
LABELS = {
    "Fejléc": {
        **_plain("hr", "ts", "tm", "bsa", "bp_dia"),
        "Vérnyomás": ("pair", "bp_sys", "bp_dia", "/"),       # "Vérnyomás: 120/80 Hgmm" (2026-11-05)
    },
    "Bal kamra": {
        **_plain("lv_edd", "lv_esd", "septum", "hatso_fal", "ao_annulus", "sinus_valsalva", "ao_ascendens",
                 "ef", "edv", "esv", "gls", "dt"),
        "SV": ("field", "lv_sv"),                            # (the Bal kamra "SV" = EDV - ESV, not the LVOT SV)
        "E/A": ("ea",), "E": ("field", "e_wave"), "A": ("field", "a_wave"),
        **{sub: ("tdisub", code) for sub, code in TDI_SUBS.items()},
    },
    "Jobb kamra": {
        **_plain("tapse", "fac", "tric_smax", "rv3d_edv", "rv3d_esv", "rv3d_ef", "rv3d_sv",   # (the RV 3D line: "3D: RV EDV: ...")
                 "rv_fwls", "rv_sls", "rv_gls"),                                              # RV strain (2026-11-05)
        "RV EDD/ESD": ("pair", "rv_edd", "rv_esd", "/"), "RV EDD": ("field", "rv_edd"), "RV ESD": ("field", "rv_esd"),
    },
    "Pitvarok": {
        **_plain("lavi", "lares", "la_cd", "la_ct", "la_edv", "la_esv", "la_sv", "la_ef"),
        "LARes": ("field", "lares"),                         # (LASr's name before 2026-11-05: older reports)
        "Bal pitvar": ("pair", "la_1", "la_2", "*"), "Jobb pitvar": ("pair", "ra_1", "ra_2", "*"),
    },
    "Mitrális billentyű": {
        **_plain("mi", "mr_vc", "mv_lvot_vti", "vena_pulm_flow", "mv_grad", "mva_vti", "mva_pht", "mv_pht", "mva",
                 "mv_peak_e", "mv_dvi", "mv_eoai"),
        "EOA": ("field", "mva_vti"),                         # (a mitral prosthesis' MVA (VTI), 2026-10-13)
        **_pisa("mr", "MR"),
    },
    "Tricuspidalis billentyű": {
        **_plain("ti", "hep_flow", "tr_vc"),
        "APsyst": ("pasp",), "IVC": ("pair", "ivc_max", "ivc_min", "/"), "IVC min": ("field", "ivc_min"),
        **_pisa("tr", "TR"),
    },
    "Aorta billentyű": {
        **_plain("av_vmax", "ai", "pvl", "ar_vc", "ar_pht", "ao_desc_rev", "lvot_diam", "lvot_vti", "av_vti", "ava", "avai",
                 "dvi", "dvi_vmax", "av_at_et", "sv", "svi", "co", "ci"),
        "AV grad": ("pair", "av_grad_peak", "av_grad_mean", "/"), "AV grad (mean)": ("field", "av_grad_mean"),
        **_pisa("ar", "AR"),
    },
    "Pulmonalis billentyű": {
        **_plain("pi", "pulm_acc", "rvot_diam", "rvot_vti", "qp_qs"),
        "ED vel.": ("field", "pi_ed_vel"),                  # (the report's short label for PI ED vel.)
        "APdiast": ("padp",),                               # gradient + RAP: the RAP is APsyst's, read there
    },
    "Pericardium": {},
}


def _label_regex(table):
    labels = sorted(table, key=len, reverse=True)           # the longest label first ("AV grad (mean)" before "AV grad")
    return re.compile(r"(?:(?<=\s)|^)(" + "|".join(re.escape(x) for x in labels) + r")\s*:", re.M)


REGEX = {title: _label_regex(table) for title, table in LABELS.items() if table}
# Bal kamra "3D: EF: 60 %  EDV: ...  ESV: ..." (2026-10-08): the same labels as the 2D line, other boxes
LV_3D = {k.upper(): ("field", f"lv3d_{k}") for k in ("ef", "edv", "esv", "sv")}
LV_3D_REGEX = _label_regex(LV_3D)
# the valve look line (the first text line of a valve part, report.morph_line): back into the picker
MORPH_LINE = {"Mitrális billentyű": ("mv_morph", "mitrális"), "Tricuspidalis billentyű": ("tv_morph", "tricuspidalis"),
              "Aorta billentyű": ("av_morph", "aorta")}


def morph_of(section, line):
    """The valve look line -> [(key, value), ...]; a prosthesis also gives back its type / valve / size as picked on
    the page (report.morph_line, 2026-10-13: 'Mechanikus mitrális műbillentyű: On-X 25 mm.', 'TAVI műbillentyű.')."""
    if section not in MORPH_LINE:
        return None
    key, name = MORPH_LINE[section]
    m = re.fullmatch(rf"(Megvastagodott|Meszes) {name} billentyű\.", line)
    if m:
        return [(key, m.group(1).lower())]
    if key == "tv_morph":
        return None
    pos = "av" if key == "av_morph" else "mv"
    m = re.fullmatch(rf"(?:(TAVI)|(?:(Mechanikus|Biológiai|Transzkatéteres) {name}|{name[0].upper()}{name[1:]}))"
                     rf" műbillentyű(?:: (.+?))?\.", line)
    if not m or (m.group(1) and pos != "av"):
        return None
    out = [(key, "műbillentyű")]
    kind = m.group(1) or m.group(2)
    if kind:
        out.append((f"valve_{pos}_kind", kind))
    if m.group(3):
        valve = re.fullmatch(r"(.+) (\S+) mm", m.group(3))
        out += ([(f"valve_{pos}", valve.group(1)), (f"valve_{pos}_size", valve.group(2))] if valve
                else [(f"valve_{pos}", m.group(3))])
    return out


DIM_PREFIX = re.compile(r"^\s*([23])D:\s*")                # "2D: " / "3D: " at the start of an EF or RV line


def _number_with_unit(text, unit):
    """'52 mm' -> '52'; None when it is not a number followed by exactly its unit."""
    m = re.fullmatch(rf"({NUM}(?:\s*-\s*\d+(?:,\d+)?)?)\s*(.*)", text.strip())
    if not m:
        return None
    if m.group(2).strip().lower() != unit.lower():
        return None
    return m.group(1).replace(" ", "")


class Reader:
    def __init__(self):
        self.values, self.texts, self.egyeb = {}, {}, []
        self.placed, self.unplaced = 0, []
        self.devices = 0

    def put(self, key, value):
        self.values[key] = value
        self.placed += 1

    def reject(self, label, value, section):
        """Something that cannot be placed: it stays visible in Egyéb."""
        text = f"{label}: {value}" if label else value
        self.egyeb.append(text)
        self.unplaced.append(f"{section}: {text}")

    # ---- one item "Label: value" ------------------------------------------------------------
    def item(self, section, spec, label, value, state):
        value = value.strip().rstrip(",").strip()
        kind = spec[0]
        if kind == "pisa":
            return
        if kind == "tdisub":
            side = state.get("tdi")
            key = f"tdi_{side}_{spec[1]}" if side else None
            if key not in FIELD:
                return self.reject(label, value, section)
            number = _number_with_unit(value, FIELD[key].unit)
            return self.put(key, number) if number else self.reject(label, value, section)
        if kind == "field":
            return self.field(section, spec[1], label, value)
        if kind == "pair":
            return self.pair(section, spec, label, value)
        if kind == "ea":
            m = re.fullmatch(rf"({NUM})/({NUM})(?:=({NUM}))?", value.replace(" ", ""))
            if m:
                self.put("e_wave", m.group(1))
                self.put("a_wave", m.group(2))
                if m.group(3):
                    self.put("ea_ratio", m.group(3))
            elif re.fullmatch(NUM, value):
                self.put("ea_ratio", value)
            else:
                self.reject(label, value, section)
            return
        if kind == "padp":
            m = re.fullmatch(rf"({NUM})\s*\+\s*(?:{NUM})?\s*Hgmm", value)
            return self.put("padp_grad", m.group(1)) if m else self.reject(label, value, section)
        if kind == "pasp":
            m = re.fullmatch(rf"({NUM})\s*\+\s*({NUM})?\s*Hgmm", value)
            if not m:
                return self.reject(label, value, section)
            self.put("pasp_grad", m.group(1))
            if m.group(2):
                self.put("rap", m.group(2))
            return

    def field(self, section, key, label, value):
        f = FIELD[key]
        if f.kind == "grade":
            if re.fullmatch(r"gr\. [IV]+(?:-[IV]+)?|jelz\.|nincs", value):
                return self.put(key, value)
            return self.reject(label, value, section)
        if f.kind == "choice":
            for choice in CHOICES[key]:
                if value.lower() == choice.lower():
                    return self.put(key, choice)
            return self.reject(label, value, section)
        number = _number_with_unit(value, f.unit)
        if number is None:
            return self.reject(label, value, section)
        self.put(key, number)

    def pair(self, section, spec, label, value):
        _, k1, k2, joiner = spec
        unit = FIELD[k1].unit
        m = re.fullmatch(rf"({NUM})\s*[/*]\s*({NUM}|kol)\s*{re.escape(unit)}", value)
        if m and (m.group(2) != "kol" or k2 == "ivc_min"):
            self.put(k1, m.group(1))
            self.put(k2, m.group(2))
            return
        number = _number_with_unit(value, unit)        # one value only: the first box (the report cannot tell)
        if number:
            return self.put(k1, number)
        self.reject(label, value, section)

    # ---- one line --------------------------------------------------------------------------
    def line(self, section, text, state):
        """Returns True when the line was a line of values (False: free text)."""
        stripped = text.strip()
        if section == "Fejléc":
            m = DEVICE_LINE.match(stripped)
            if m:
                return self.device(m)
            m = DEVICE_NAME_LINE.match(stripped)
            if m:
                n = ["", "_2", "_3"][min(self.devices, 2)]
                self.devices += 1
                self.put(f"device{n}", m.group(1))
                return True
            m = SPORT_LINE.match(stripped)
            if m:
                self.put("sport", "igen")
                if m.group(1).strip() != "igen":
                    self.put("sport_text", m.group(1).strip())
                return True
        if section == "Pericardium":
            m = RESP_LINE.match(stripped)
            if m:
                return self.resp(m)
        table, regex = LABELS.get(section), REGEX.get(section)
        if not regex:
            return False
        dim = DIM_PREFIX.match(text) if section in ("Bal kamra", "Jobb kamra") else None
        if dim:
            text = text[dim.end():]
            if section == "Bal kamra" and dim.group(1) == "3":
                table, regex = LV_3D, LV_3D_REGEX
            stripped = text.strip()
        t = TDI_LINE.match(stripped) if section == "Bal kamra" else None
        if t:                                                # "Mitralis annulus lateralis TDI S: 10 cm/s, E': ..."
            state["tdi"] = t.group(1)[:3]
            text = stripped[t.end():]
        matches = list(regex.finditer(text))
        if not matches or matches[0].start() != len(text) - len(text.lstrip()):
            state["tdi"] = None
            return False
        first = table[matches[0].group(1)]
        if first[0] == "tdisub" and not state.get("tdi"):    # "S: ..." with no TDI line before it: just text
            return False
        if first[0] != "tdisub" and first[0] != "tdi":
            state["tdi"] = None
        for i, m in enumerate(matches):
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            self.item(section, table[m.group(1)], m.group(1), text[m.end():end], state)
        return True

    def device(self, m):
        """'ECMO flow: 3,5 liter/min, 3200 RPM'; the 1st, 2nd, 3rd device line in order."""
        n = ["", "_2", "_3"][min(self.devices, 2)]
        self.devices += 1
        name = m.group(1)
        if name != "Eszköz":
            self.put(f"device{n}", name)
        for part in re.split(r",\s+", m.group(2)):
            part = part.strip()
            for suffix, unit in (("_flow", "liter/min"), ("_rpm", "RPM")):
                number = _number_with_unit(part, unit)
                if number:
                    self.put(f"device{n}{suffix}", number)
                    break
            else:
                self.reject("Flow", part, "Fejléc")
        return True

    def resp(self, m):
        p = "mv" if m.group(1) == "Mitrális" else "tv"
        value = m.group(2).strip()
        both = re.fullmatch(r"(\?|\d+)/(\?|\d+)(?:=(\d+)%)?", value)
        only = re.fullmatch(r"(\d+)%", value)
        if both:
            for k, g in (("max", both.group(1)), ("min", both.group(2)), ("var", both.group(3))):
                if g and g != "?":
                    self.put(f"{p}_resp_{k}", g)
        elif only:
            self.put(f"{p}_resp_var", only.group(1))
        else:
            self.reject(f"{m.group(1)} beáramlás légzésszinkron ingadozás", value, "Pericardium")
        return True


def parse(text):
    """Read a pasted report. Never raises on odd text: what cannot be placed goes to Egyéb."""
    r = Reader()
    groups = {}                       # part title -> list of free-text groups (each a list of lines)
    section, state, opinion = "Fejléc", {}, None
    for raw in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = raw.rstrip()
        if opinion is not None:                              # everything after "Vélemény:" is the opinion
            opinion.append(line)
            continue
        if line.strip() == "Vélemény:":
            opinion = []
            continue
        m = SEPARATOR.match(line.strip())
        if m:
            section, state = m.group(1), {}
            continue
        if PLAIN_SEPARATOR.match(line.strip()):
            section, state = "?", {}
            continue
        if not line.strip():
            if groups.get(section) and groups[section][-1]:
                groups[section].append([])
            continue
        if section == "Egyéb":
            r.egyeb.append(line.strip())
            continue
        if section == "?":
            r.reject("", line.strip(), "szakasz címe nélkül")
            continue
        if section not in LABELS and section not in TEXT_KEY and section != "Bal kamra":
            r.reject("", line.strip(), f"ismeretlen rész „{section}”")
            continue
        if r.line(section, line, state):
            continue
        look = None if groups.get(section) else morph_of(section, line.strip())   # only the first text line
        if look:
            for key, value in look:
                if key.startswith("valve_"):                 # the picked valve: not a box, not counted
                    r.values[key] = value
                else:
                    r.put(key, value)
            groups[section] = [[]]
            continue
        groups.setdefault(section, [[]])[-1].append(line.strip())

    for title, grp in groups.items():
        grp = [g for g in grp if g]
        if not grp:
            continue
        if title == "Bal kamra":
            r.texts["falmozgas"] = "\n".join(grp[0])
            if len(grp) > 1:
                r.texts["bal_kamra"] = "\n\n".join("\n".join(g) for g in grp[1:])
        elif title in TEXT_KEY:
            r.texts[TEXT_KEY[title]] = "\n\n".join("\n".join(g) for g in grp)
    if opinion:
        while opinion and not opinion[0].strip():
            opinion.pop(0)
        while opinion and not opinion[-1].strip():
            opinion.pop()
        if opinion:
            r.texts["velemeny"] = "\n".join(opinion)
    return {"values": r.values, "texts": r.texts, "egyeb": "\n".join(r.egyeb),
            "placed": r.placed, "unplaced": r.unplaced}


def import_form(text, place=None):
    """The page's answer for a pasted report: like /blank (typed by hand: no transcript, no AI), with the
    imported values in the boxes. `note` tells what was read and what went to Egyéb."""
    from report import render_form                       # (report.py is only needed here)
    got = parse(text)
    out = render_form(got["values"], got["texts"], got["egyeb"], "", None, place)
    note = f"Beolvasott lelet: {got['placed']} érték a mezőkben"
    if got["unplaced"]:
        note += f", {len(got['unplaced'])} sor nem volt besorolható (Egyéb)"
    valves = {k: v for k, v in got["values"].items() if k.startswith("valve_")}   # back into the valve pickers
    return {"report": out.pop("report"), "form": out, "below": "", "transcript": "", "full_transcript": "",
            "pauses": [], "timing": {}, "manual": True, "note": note + ".", "valves": valves}
