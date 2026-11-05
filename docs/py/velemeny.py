"""
Vélemény generator (template.md 5d). Plain code, no AI: the text is built only from values that were
dictated, typed or calculated. A part whose values are missing is left out (exceptions in template.md:
"regionális falmozgás zavar nem látható" and "Pericardialis fluidum nem látható" when those boxes are empty).

generate(r, sex) takes a Report (report.live_report) and returns the text. sex: "ffi" or "no".
Stages: 1 intro sentence (done) · 2 aorta, LV, RV, atria, PASP, pericardium (this file) ·
3 valves + kombinált vitium · 4 diastolic function.
Self-test: python test_velemeny.py
"""

import re

from report import to_float

MALE, FEMALE = "ffi", "no"
CHECK = "[ellenőrizd: {}]"        # a marker like this blocks "Lelet másolása" until the doctor has looked


# =====================================================================================
# Small helpers
# =====================================================================================

def num(r, key):
    return to_float(r.values.get(key))


def is_on(r, key):
    return bool(r.values.get(key))


def clause_sentence(parts):
    """["normál tág bal kamra", "jó ..."] -> "Normál tág bal kamra, jó ...." (empty parts left out)"""
    parts = [p for p in parts if p]
    if not parts:
        return ""
    text = ", ".join(parts)
    return text[0].upper() + text[1:] + "."


def typed_sentences(text):
    """The doctor's own text: every line a sentence (capital letter, full stop), joined with a space."""
    out = []
    for line in (text or "").splitlines():
        line = line.strip()
        if line:
            line = line[0].upper() + line[1:]
            out.append(line if line[-1] in ".!?:" else line + ".")
    return " ".join(out)


def lowest_number(text):
    """EF "55-60" -> 55 (a range uses the lower value)"""
    found = [to_float(n) for n in re.findall(r"\d+(?:,\d+)?", text or "")]
    return min(found) if found else None


# =====================================================================================
# Stage 1: the sentence from the header ticks (template.md 5d.1)
# =====================================================================================

def intro_sentence(r):
    """The first sentence, from the header ticks. "" when nothing is ticked."""
    supine, vent, afib = is_on(r, "supine"), is_on(r, "ventilated"), is_on(r, "afib")
    bedside, pvc, subopt = is_on(r, "bedside"), is_on(r, "pvc"), is_on(r, "suboptimal")

    hr = to_float(r.values.get("hr", ""))
    hr_text = ""
    if hr is not None:
        # AF: the ventricular rate is always written; otherwise only a rate above 100 or below 60
        if afib:
            hr_text = f"{r.values['hr']}/perc kamrafrekvencia mellett"
        elif hr > 100 or hr < 60:
            hr_text = f"{r.values['hr']}/perc szívfrekvencia mellett"

    adjectives = [w for w, on in (("háton fekvő", supine), ("lélegeztetett", vent)) if on]
    subject = " ".join(adjectives)                      # "háton fekvő lélegeztetett"
    if afib:
        subject += (", " if subject else "") + "pitvarfibrilláló"
    if subject:
        base = subject + " beteg" + (" bedside" if bedside else "") + " vizsgálata"
    elif bedside:
        base = "bedside vizsgálat"
    else:
        base = ""

    if base:
        if hr_text:
            base += " " + hr_text
    elif hr_text:
        base = f"a vizsgálat {hr_text.replace(' mellett', '')} mellett történt"

    extras = []
    if pvc:
        extras.append("a vizsgálat alatt gyakori extrasystolek")
    if subopt:
        extras.append("szuboptimális echoablak")

    return clause_sentence(([base] if base else []) + extras)


# =====================================================================================
# Stage 2
# =====================================================================================

# --- Aorta: upper limits (mm) from the ESC figure: (men, women) ------------------------
AORTA_LIMITS = {"ao_ascendens": (40, 36), "sinus_valsalva": (40, 34)}


AORTA_SLIGHT = 3          # up to this many mm over the limit: "kissé tágabb", more: ectasia


def aorta_sentence(r, sex):
    """Over the limit by up to 3 mm: `Kissé tágabb aorta ascendens`; more: `Aorta ascendens ectasia`."""
    i = 0 if sex == MALE else 1
    ectasia, slight = [], []
    for key, name in (("ao_ascendens", "aorta ascendens"), ("sinus_valsalva", "sinus Valsalva")):
        value = num(r, key)
        if value is None or value <= AORTA_LIMITS[key][i]:
            continue
        (slight if value - AORTA_LIMITS[key][i] <= AORTA_SLIGHT else ectasia).append(name)
    parts = []
    if ectasia:
        parts.append(" és ".join(ectasia) + " ectasia")
    if slight:
        parts.append("kissé tágabb " + " és ".join(slight))
    return clause_sentence(parts)


# --- Bal kamra -------------------------------------------------------------------------
# LV EDD (mm): normal up to the first number, "kissé tág" below the second, "tág" up to the third, then "dilatált"
LV_EDD_LIMITS = {MALE: (56, 60, 65), FEMALE: (54, 58, 63)}


def lv_size_phrase(r, sex):
    edd = num(r, "lv_edd")
    if edd is None:
        return ""
    normal, mild, wide = LV_EDD_LIMITS[sex]
    if edd <= normal:
        return "normál tág bal kamra"
    if edd < mild:
        return "kissé tág bal kamra"
    if edd <= wide:
        return "tág bal kamra"
    return "dilatált bal kamra"


def ef_word(r):
    """The systolic function word from the EF (a range uses the lower value), or None. A 3D EF counts first."""
    ef = lowest_number(r.values.get("lv3d_ef") or r.values.get("ef"))
    if ef is None:
        return None
    if ef >= 55:
        return "jó"
    if ef >= 50:
        return "megtartott"
    if ef >= 40:
        return "enyhén csökkent"
    if ef >= 35:
        return "kp fokban csökkent"
    if ef >= 30:
        return "kp jelentős mértékben csökkent"
    return "jelentősen csökkent"


def lv_function_phrase(r):
    """Systolic function from the EF only."""
    word = ef_word(r)
    return f"{word} systolés bal kamra funkció" if word else ""


def lv_function_parts(r, dia):
    """The clauses about the LV function: systolic (EF) and, when it can be decided, diastolic function and filling
    pressure (`dia` from diastolic_assessment, None = say nothing about it)."""
    word = ef_word(r)
    systolic = f"{word} systolés bal kamra funkció" if word else ""
    if not dia:
        return [systolic]
    if dia["kind"] == "normal":
        if word == "jó":
            return ["jó systolés és diasztolés bal kamra funkció"]
        return [f"{word} systolés és jó diasztolés bal kamra funkció" if word else "jó diasztolés bal kamra funkció"]
    pressure = {"elevated": "emelkedett töltőnyomás", "normal": "normál töltőnyomás"}[dia["lap"]]
    if dia["kind"] == "pressure":                      # only the filling pressure (AF, or the grade cannot be decided)
        return [systolic, pressure]
    grade = f" gr. {dia['grade']}." if dia["grade"] else ""
    return [systolic, f"diasztolés dysfunctio{grade} {pressure.replace('töltőnyomás', 'töltőnyomás mellett')}"]


def lv_wall_phrase(r):
    sep, post = num(r, "septum"), num(r, "hatso_fal")
    measured = [v for v in (sep, post) if v is not None]
    if not measured:
        return ""
    top = max(measured)
    if top <= 10:
        return "normál falvastagság"
    grade = "minimális" if top < 12 else "enyhe" if top < 14 else "kifejezett"
    septal, posterior = sep is not None and sep >= 11, post is not None and post >= 11
    kind = "koncentrikus" if septal and posterior else "septalis" if septal else "hátsó fali"
    return f"{grade} {kind} hypertrophia"


NOT_SEEN = r"(?:nem\s+l[aá]tható|nincs|nem\s+(?:észlelhető|észlelt))"


def only_negative(text, subject):
    """True when the text says nothing but "<subject> nincs / nem látható" (so nothing else is lost)."""
    pattern = r"(?:" + subject + r")\s*" + NOT_SEEN
    rest = re.sub(pattern, "", text.lower())
    return bool(re.search(pattern, text.lower())) and not re.search(r"\w", rest)


def motion_is_negative(text):
    """True when the wall motion text only says there is no wall motion abnormality."""
    return only_negative(text, r"(?:regionális\s+)?falmozgás\s*zavar|(?:regionális\s+)?falmozgászavar|falmozgás")


def lv_sentences(r, sex, dia=None):
    """The LV sentence, then the wall motion text (if it is a finding) and the other LV remarks, as typed."""
    motion = (r.texts.get("falmozgas") or "").strip()
    finding = bool(motion) and not motion_is_negative(motion)
    parts = [lv_size_phrase(r, sex), *lv_function_parts(r, dia), lv_wall_phrase(r)]
    if not finding:
        parts.append("regionális falmozgás zavar nem látható")
    out = [clause_sentence(parts)]
    if finding:                                  # the lead-in word is not repeated: "Falmozgászavar az inferior..." -> "Az inferior..."
        out.append(typed_sentences(re.sub(                  # (not before "nincs": that would change the meaning)
            r"^\s*(?:regionális\s+)?falmozgás\s*zavar(?:ok)?\b(?!\s*(?:nincs|nem\b))[\s:,-]*", "", motion,
            flags=re.IGNORECASE)))
    out.append(typed_sentences(r.texts.get("bal_kamra")))
    return out


# --- Jobb kamra ------------------------------------------------------------------------
def rv_sentence(r):
    edd, esd = num(r, "rv_edd"), num(r, "rv_esd")
    tapse, smax, fac, lv_edd = num(r, "tapse"), num(r, "tric_smax"), num(r, "fac"), num(r, "lv_edd")

    size = ""
    if edd is not None:
        if edd < 39:
            size = "a bal kamrához képest tágabb" if lv_edd is not None and edd > lv_edd else "normál tág"
        elif edd < 42:
            size = "kissé tágabb"
        else:
            size = "tág"

    longitudinal = None                          # TAPSE ≥ 17 mm and S' ≥ 9,5 cm/s
    if tapse is not None or smax is not None:
        longitudinal = (tapse is None or tapse >= 17) and (smax is None or smax >= 9.5)
    radial = None                                # the diameter shortens by at least 10 mm or 1/3
    if edd and esd is not None:                  # (10 mm: a dilated RV, e.g. 44/30, still contracts well)
        radial = edd - esd >= 10 - 1e-9 or (edd - esd) / edd >= 1 / 3
    if fac is not None and fac < 35:
        longitudinal = radial = False            # FAC < 35 %: csökkent globális funkció

    if longitudinal is not None and radial is not None:
        if longitudinal and radial:
            function = "jó globális funkciójú"
        elif not longitudinal and not radial:
            function = "csökkent globális funkciójú"
        elif longitudinal:
            function = "megtartott longitudinális, de csökkent radialis funkciójú"
        else:
            function = "csökkent longitudinális, de megtartott radialis funkciójú"
    elif longitudinal is not None:
        function = ("jó" if longitudinal else "csökkent") + " longitudinális funkciójú"
    elif radial is not None:
        function = ("jó" if radial else "csökkent") + " radialis funkciójú"
    else:
        function = ""

    if size and function:
        return clause_sentence([f"{size}, {function} jobb kamra"])
    if size or function:
        return clause_sentence([f"{size or function} jobb kamra"])
    return ""


# --- Pitvarok --------------------------------------------------------------------------
ATRIUM_LIMITS = (40, 50)                         # mm, for the two diameters
ATRIUM_PLAIN = ["normál tág", "normál tágasság felső határán lévő", "kissé tágabb", "tág"]
ATRIUM_PAIR = ["normál tágasságú"] + ATRIUM_PLAIN[1:]       # when the two atria differ: "tág bal pitvar, normál tágasságú jobb pitvar"


def atrium_class(d1, d2):
    """0 normal · 1 normal, at the upper limit · 2 kissé tágabb · 3 tág · None = not measured"""
    measured = [(d, limit) for d, limit in zip((d1, d2), ATRIUM_LIMITS) if d is not None]
    if not measured:
        return None
    over = [d - limit for d, limit in measured if d > limit]
    if not over:
        return 0
    if len(measured) == 2 and len(over) == 2:
        return 3                                 # both diameters above the limit
    return 1 if over[0] <= 3 else 2              # one above: a little (≤ 3 mm) or clearly


def atria_sentence(r):
    left = atrium_class(num(r, "la_1"), num(r, "la_2"))
    lavi = num(r, "lavi")
    if lavi is not None:                         # LAVi, when measured, decides for the left atrium
        left = 3 if lavi > 34 else 0
    right = atrium_class(num(r, "ra_1"), num(r, "ra_2"))
    if left is None and right is None:
        return ""
    if left is not None and left == right:
        return clause_sentence([f"{ATRIUM_PLAIN[left]} pitvarok"])
    if left is not None and right is not None:
        return clause_sentence([f"{ATRIUM_PAIR[left]} bal pitvar", f"{ATRIUM_PAIR[right]} jobb pitvar"])
    if left is not None:
        return clause_sentence([f"{ATRIUM_PLAIN[left]} bal pitvar"])
    return clause_sentence([f"{ATRIUM_PLAIN[right]} jobb pitvar"])


# --- Diasztolés funkció (stage 4; ASE 2025, template.md 5d.3) -----------------------------
def mean(values):
    return sum(values) / len(values)


def e_prime_reduced(r):
    """Figure 2/3 step 1: septal e' <= 6, or lateral e' <= 7, or average e' <= 6.5 cm/s. None = no e' measured."""
    septal, lateral = num(r, "tdi_med_e"), num(r, "tdi_lat_e")
    seen = [v for v in (septal, lateral) if v is not None]
    if not seen:
        return None
    return (septal is not None and septal <= 6) or (lateral is not None and lateral <= 7) \
        or (len(seen) == 2 and mean(seen) <= 6.5)


def e_over_e_prime(r):
    """(septal E/e', lateral E/e', average E/e') - the ratios of the page, or worked out from E and e'."""
    e_wave = num(r, "e_wave")
    ratios = {}
    for side in ("med", "lat"):
        ratio = num(r, f"tdi_{side}_ee")
        e_prime = num(r, f"tdi_{side}_e")
        ratios[side] = ratio if ratio is not None else (e_wave / e_prime if e_wave and e_prime else None)
    septal, lateral = ratios["med"], ratios["lat"]
    e_primes = [num(r, "tdi_med_e"), num(r, "tdi_lat_e")]
    if e_wave and None not in e_primes:
        average = e_wave / mean(e_primes)
    elif septal is not None and lateral is not None:
        average = mean([septal, lateral])
    else:
        average = None
    return septal, lateral, average


def e_ratio_high(r):
    """Figure 3 step 2: septal E/e' >= 15, or lateral >= 13, or average >= 14. None = no E/e' known."""
    septal, lateral, average = e_over_e_prime(r)
    seen = [v for v in (septal, lateral, average) if v is not None]
    if not seen:
        return None
    return (septal is not None and septal >= 15) or (lateral is not None and lateral >= 13) \
        or (average is not None and average >= 14)


def rap_known(r):
    rap = num(r, "rap")
    calc = getattr(r, "rap_calculated", None)
    return rap if rap is not None else (to_float(calc[0]) if calc else None)


def tr_velocity(r):
    """The TR peak velocity (m/s): dictated, or from the gradient."""
    vmax, grad = num(r, "tr_vmax"), num(r, "pasp_grad")
    if vmax is not None:
        return vmax
    return (grad / 4) ** 0.5 if grad is not None and grad >= 0 else None     # (a negative typed gradient: unknown)


def tr_high(r):
    """Figure 3 step 3: PASP >= 35 Hgmm when the RAP is known, else TR Vmax >= 2,8 m/s. None = no TR jet measured."""
    velocity = tr_velocity(r)
    if velocity is None:
        return None
    rap = rap_known(r)
    if rap is not None:
        grad = num(r, "pasp_grad")
        return (grad if grad is not None else 4 * velocity ** 2) + rap >= 35
    return velocity >= 2.8


def left_atrium_enlarged(r):
    """LAVi > 34 ml/m2; when LAVi is not measured, a left atrium graded "tág" counts instead. None = unknown."""
    lavi = num(r, "lavi")
    if lavi is not None:
        return lavi > 34
    cls = atrium_class(num(r, "la_1"), num(r, "la_2"))
    return None if cls is None else cls == 3


def mitral_stenosis_suspected(r):
    """Mitral stenosis values that are not clearly normal: a gradient of 2 Hgmm or more, or any MVA of 3 cm2 or less
    (a gradient below 2 and MVAs above 3 are fine). A CW VTI without any MVA cannot be judged: it counts."""
    gradient = num(r, "mv_grad")
    if gradient is not None and gradient >= 2:
        return True
    areas = [num(r, key) for key in ("mva_vti", "mva_pht", "mva")]
    if any(area is not None and area <= 3 for area in areas):
        return True
    return bool(r.values.get("mv_vti_cw")) and all(area is None for area in areas)


def diastolic_excluded(r):
    """Cases where the algorithm must not be used, seen from the inputs (template.md 5d.3): nothing is written then."""
    if mitral_stenosis_suspected(r):
        return True
    if r.grade_level("mi") >= 3:
        return True                                               # severe (primary) MR
    if any(r.values.get(k) in ("LVAD", "HM") for k in ("device", "device_2", "device_3")):   # HM = HeartMate, an LVAD
        return True
    if r.values.get("mv_morph") == "műbillentyű":
        return True                                               # mitral prosthesis, picked in the card title
    mitral = (r.texts.get("mitralis") or "").lower()
    if re.search(r"műbillentyű|protézis|annuloplast|gyűrű|clip|teer|plasztika|javított", mitral):
        return True                                               # mitral prosthesis / repair
    if re.search(r"annulus", mitral) and re.search(r"mesze", mitral) \
            and re.search(r"jelentős|igen|erősen|kifejezett|súlyos|közepes", mitral):
        return True                                               # moderate / severe MAC
    return False


def atrial_fibrillation_pressure(r):
    """Figure 8: E >= 100 cm/s, septal E/e' > 11, TR > 2,8 m/s or PASP > 35, DT <= 160 ms. 3-4 = elevated, 0-1 = normal,
    2 = undecided. Unknown markers count both ways. Returns "elevated" / "normal" / None."""
    septal = e_over_e_prime(r)[0]
    e_wave, dt = num(r, "e_wave"), num(r, "dt")
    velocity, rap = tr_velocity(r), rap_known(r)
    if velocity is None:
        tr = None
    elif rap is not None:
        grad = num(r, "pasp_grad")
        tr = (grad if grad is not None else 4 * velocity ** 2) + rap > 35
    else:
        tr = velocity > 2.8
    markers = [None if e_wave is None else e_wave >= 100, None if septal is None else septal > 11, tr,
               None if dt is None else dt <= 160]
    positive, unknown = markers.count(True), markers.count(None)
    if positive >= 3:
        return "elevated"
    if positive + unknown <= 1:
        return "normal"
    return None


def diastolic_assessment(r):
    """What can be said about the diastolic function: {"kind": "normal" | "dysfunction" | "pressure", "grade":
    "I" / "II" / "III" / None, "lap": "elevated" / "normal" / None}, or None = say nothing (not applicable or not
    enough measurements)."""
    if diastolic_excluded(r):
        return None
    if is_on(r, "afib"):                                       # no function, only the filling pressure
        lap = atrial_fibrillation_pressure(r)
        return {"kind": "pressure", "grade": None, "lap": lap} if lap else None

    ea = num(r, "ea_ratio")

    def elevated():                                            # elevated LAP: graded by E/A, if known
        if ea is None:
            return {"kind": "pressure", "grade": None, "lap": "elevated"}
        return {"kind": "dysfunction", "grade": "II" if ea < 2 else "III", "lap": "elevated"}

    result = figures_2_and_3(r, ea, elevated)
    # The L wave (mid-diastolic mitral inflow, >= 50 cm/s; ticked on the page) shows impaired relaxation and an elevated
    # filling pressure: it makes the pressure elevated unless the figures already say so, also when they are incomplete.
    if is_on(r, "l_wave") and (result is None or result["lap"] != "elevated"):
        return elevated()
    return result


def figures_2_and_3(r, ea, elevated):
    """Figure 3 (with Figure 2 for the dysfunction itself) for sinus rhythm; None = not enough measurements."""
    reduced, ee_high, tr_up = e_prime_reduced(r), e_ratio_high(r), tr_high(r)
    if None in (reduced, ee_high, tr_up):
        return None                                            # Figure 3 needs e', E/e' and the TR jet
    positives = [reduced, ee_high, tr_up].count(True)
    if positives == 3:
        return elevated()
    if positives == 0:
        return {"kind": "normal", "grade": None, "lap": "normal"}
    if reduced and not ee_high and not tr_up and ea is not None and ea <= 0.8:
        return {"kind": "dysfunction", "grade": "I", "lap": "normal"}

    # anything else: the additional markers (LARes <= 18 %, LAVi > 34 ml/m2, or a "tág" left atrium)
    lares = num(r, "lares")
    extra = [None if lares is None else lares <= 18, left_atrium_enlarged(r)]
    if True in extra:
        return elevated()
    if all(e is None for e in extra):
        return None                                            # not enough to decide the filling pressure
    # normal filling pressure: is there a dysfunction at all (Figure 2: e' reduced + 1 marker, or 2 markers)?
    average = e_over_e_prime(r)[2]
    markers = [average is not None and average > 14, lares is not None and lares <= 18,
               ea is not None and (ea <= 0.8 or ea >= 2), left_atrium_enlarged(r) is True]
    dysfunction = (reduced and any(markers)) or (not reduced and sum(markers) >= 2)
    if dysfunction:
        return {"kind": "dysfunction", "grade": None, "lap": "normal"}
    return {"kind": "normal", "grade": None, "lap": "normal"}


# --- Billentyűk (stage 3) --------------------------------------------------------------
VALVES = [("mitralis", "mitralis", "mi"), ("tricuspidalis", "tricuspidalis", "ti"), ("aorta", "aorta", "ai"),
          ("pulmonalis", "pulmonalis", "pi")]          # (name in the sentence, text box, grade box)
GRADES = ["jelz.", "I", "I-II", "II", "II-III", "III", "III-IV", "IV", "V", "VI"]
REGURG_WORDS = {"jelz.": "nem jelentős", "I": "enyhe", "I-II": "enyhe", "II": "kp fokú", "II-III": "kp fokú",
                "III": "középsúlyos", "III-IV": "középsúlyos-súlyos", "IV": "súlyos", "V": "masszív", "VI": "torrentialis"}
STENOSIS_WORDS = {"mild": "enyhe fokú", "moderate": "kp fokú", "severe": "súlyos fokú"}
SEVERITY = ["mild", "moderate", "severe"]
AORTIC_KEYS = ["av_vmax", "av_grad_mean", "ava", "avai", "dvi", "dvi_vmax"]
MITRAL_KEYS = ["mva_vti", "mva_pht", "mv_pht", "mv_grad"]
MIXED = "[mixed rating]"

ABNORMAL = re.compile(r"vastag|vaskos|megvastagod|meszes|meszesed|calcif|kalcif|prolap|prolabál|szakad|vegetáci|"
                      r"műbillentyű|protézis|szűk|stenos|szklerot|sclerot|bicuspid|rheumás", re.IGNORECASE)
NORMAL = re.compile(r"\bép\b|\bépek\b|vékony|hártyás|normál|regurgit\w*\s+(?:nincs|nem\s+l[aá]tható)|"
                    r"(?:nincs|nem\s+l[aá]tható)\s+\w*\s*regurgit", re.IGNORECASE)    # "regurgitatio nincs": the grade box says it
ADJECTIVE = re.compile(r"\b(?:(?:kissé|enyhén|közepesen|jelentősen|igen|erősen)\s+)?(?:meszes|vaskos|vastag|megvastagodott)\b",
                       re.IGNORECASE)
SEPARATES = re.compile(r"de\s+jól\s+szeparál\w*", re.IGNORECASE)
FILLER = set("a az és de aorta aortabillentyű mitrális mitralis tricuspidalis pulmonalis billentyű billentyűk billentyűn "
             "billentyűje látható van volt jól kissé enyhén közepesen jelentősen igen erősen is".split())


def grade_of(r, key):
    """'gr. II' -> 'II'; 'jelz.' -> 'jelz.'; 'nincs' or empty -> None"""
    grade = (r.values.get(key) or "").replace("gr. ", "").strip()
    return grade if grade in GRADES else None


def findings(text):
    """The sentences of a valve text that say something other than a normal valve."""
    sentences = [s.strip() for s in re.split(r"[.!?\n]+", text or "") if s.strip()]
    return [s for s in sentences if ABNORMAL.search(s) or not NORMAL.search(s)]


def morphology(sentences):
    """("Meszes, de jól szeparáló", extra): the adjectives of the valve text, and True if the text says more than
    those (then the doctor has to look at it)."""
    text = " ".join(sentences)
    adjectives = [m.group(0).lower() for m in ADJECTIVE.finditer(text)]
    adjectives = [a for i, a in enumerate(adjectives) if a not in adjectives[:i]]
    if SEPARATES.search(text):
        adjectives.append("de jól szeparáló")
    rest = SEPARATES.sub("", ADJECTIVE.sub("", text.lower()))
    extra = any(token not in FILLER for token in re.findall(r"[a-záéíóöőúüű]+", rest))
    return ", ".join(adjectives), extra


AORTIC_ANCHORS = ["ava", "dvi", "dvi_vmax"]      # the flow-independent measurements


def stenosis(grades, keys, anchors=()):
    """(severity, mixed) from the calculator's badges, or (None, False). A valve counts as stenotic when a badge says
    moderate / severe (for the aortic Vmax also mild: 2,6-2,9 m/s); the big "mild" values of AVA, DVI, MVA... are
    just normal-ish values. With stenosis, the most severe badge decides; badges that differ = mixed.
    anchors (aortic: AVA and DVI): a worse grade that only the other badges (Vmax, gradient, AVAi) give and the anchors
    do not support is not taken: the most severe grade of the anchors counts instead (still marked mixed)."""
    found = {k: grades[k] for k in keys if grades.get(k) in SEVERITY}
    if not any(g != "mild" or k == "av_vmax" for k, g in found.items()):
        return None, False
    top = max(found.values(), key=SEVERITY.index)
    supported = [found[k] for k in anchors if k in found]
    if supported and top not in supported:
        top = max(supported, key=SEVERITY.index)
    return top, len(set(found.values())) > 1


PROSTHETIC_KINDS = {"Mechanikus": "mechanikus", "Biológiai": "biológiai", "TAVI": "biológiai",
                    "Transzkatéteres": "biológiai"}          # (mitral: SAPIEN valve-in-valve / ring / MAC)
VERDICT_WORDS = {"possibleStenosis": "lehetséges stenosis", "stenosis": "stenosis",
                 "discordant": "ellentmondó mérések",
                 # the mitral verdict only (calculator v4.33): a normal PHT with raised flow parameters
                 "mr": "jelentős műbillentyű MR gyanúja",
                 "highFlow": "emelkedett flow-paraméterek normál PHT mellett (MR, magas flow vagy PPM?)"}


def prosthetic_sentence(info, valve="aorta"):
    """A prosthesis (aorta; mitralis since 2026-10-13). info = what the page knows: {"verdict": the calculator's
    category, "note": "ppm" / "highFlow" / ..., "kind": "Mechanikus" / "Biológiai" / "TAVI" / "Transzkatéteres"}
    (True = ticked, nothing else known). A good function is written; anything else stays a marker for the doctor."""
    info = info if isinstance(info, dict) else {}
    verdict, note, kind = info.get("verdict"), info.get("note"), PROSTHETIC_KINDS.get(info.get("kind"))
    if verdict == "normal" and note != "ppm":
        if kind:
            return f"Jó {kind} {valve} műbillentyű funkció."
        reason = "a műbillentyű típusa nincs megadva"
    elif verdict == "normal":
        reason = "PPM"
    else:
        reason = VERDICT_WORDS.get(verdict, "nincs elég mérés a műbillentyű értékeléséhez")
    return CHECK.format(f"{valve} műbillentyű: " + reason)


def names_text(names):
    return names[0] if len(names) == 1 else ", ".join(names[:-1]) + " és " + names[-1]


def regurgitation_text(items):
    """[("nem jelentős", "mitralis"), ...] -> "nem jelentős mitralis és tricuspidalis regurgitatio" (no full stop)"""
    groups = []
    for word, name in items:
        if groups and groups[-1][0] == word:
            groups[-1][1].append(name)
        else:
            groups.append((word, [name]))
    parts = [f"{word} {names_text(names)}" for word, names in groups]
    text = parts[0] if len(parts) == 1 else ", ".join(parts[:-1]) + ", valamint " + parts[-1]
    return text[0].upper() + text[1:] + " regurgitatio"


MORPH_KEY = {"mitralis": "mv_morph", "tricuspidalis": "tv_morph", "aorta": "av_morph"}


def morph_text(r, name):
    """The look picked on the page as a line of the valve text: "Megvastagodott aorta billentyű". Nothing for vékony
    (a normal valve: "Ép billentyűk" can stay) and nothing for a műbillentyű (the prosthesis sentence says it)."""
    look = r.values.get(MORPH_KEY.get(name, ""))
    if not look or look == "vékony" or look == "műbillentyű":
        return ""
    return f"{look} {name} billentyű"


def valves_part(r, grades=None, prosthetic=False, mitral_prosthetic=None):
    """(sentences about the valves themselves, regurgitation text without full stop). mitral_prosthetic: the page's
    mitral prosthesis verdict (as `prosthetic`); the mitral picker's "műbillentyű" alone already makes the sentence."""
    grades = grades or {}
    sentences, regurg, clean = [], [], True
    for name, text_key, grade_key in VALVES:
        lines = findings("\n".join(t for t in (morph_text(r, name), r.texts.get(text_key)) if t))
        grade = grade_of(r, grade_key)
        word = REGURG_WORDS.get(grade)
        severity, mixed = (None, False)
        if name == "mitralis" and r.values.get("mv_morph") == "műbillentyű":      # no stenosis sentence for a prosthesis
            sentences.append(prosthetic_sentence(mitral_prosthetic, "mitralis"))
            clean = False
        elif name == "mitralis":
            severity, mixed = stenosis(grades, MITRAL_KEYS)
        elif name == "aorta":
            if prosthetic:
                sentences.append(prosthetic_sentence(prosthetic))
                pvl = grade_of(r, "pvl")                  # paravalvular leak (2026-10-08): the AI words, "leak"
                if pvl:
                    sentences.append(f"{REGURG_WORDS[pvl][0].upper()}{REGURG_WORDS[pvl][1:]} paravalvularis leak.")
                elif r.values.get("pvl") == "nincs":
                    sentences.append("Paravalvularis leak nem látható.")
                clean = False
            else:
                severity, mixed = stenosis(grades, AORTIC_KEYS, AORTIC_ANCHORS)
        if severity:
            clean = False
            adjectives, extra = morphology(lines)
            degree = STENOSIS_WORDS[severity] + (" " + MIXED if mixed else "")
            if word:                                      # stenosis and regurgitation: one sentence
                combined = "kombinált " if grade != "jelz." else ""      # not for a trace (jelz.)
                head = f"{adjectives} {name} billentyű, " if adjectives else ""
                sentence = f"{head}{degree} stenosissal és {word} regurgitatioval járó {combined}{name} vitium."
            else:
                sentence = (f"{adjectives} {name} billentyű, {degree} {name} stenosis." if adjectives
                            else f"{degree} {name} stenosis.")
            sentences.append(sentence[0].upper() + sentence[1:])
            if extra:                                         # the text says more than the adjectives: not lost
                sentences.append(CHECK.format(f"{name} billentyű: " + "; ".join(lines)))
            continue
        if lines:
            clean = False
            sentences.append(typed_sentences("\n".join(lines)))
        if word:
            regurg.append((word, name))
            clean = clean and grade in ("jelz.", "I")                   # a physiological MI / TI is not a valve finding
    if clean:
        sentences.insert(0, "Ép billentyűk.")
    return sentences, regurgitation_text(regurg) if regurg else ""


# --- Kisvérköri nyomás -----------------------------------------------------------------
def pasp_sentence(r):
    phrase = pasp_phrase(r)
    return clause_sentence([phrase]) if phrase else ""


def pasp_phrase(r):
    """"a becsült kisvérköri nyomás nem emelkedett" (no capital letter, no full stop: it can follow the
    regurgitation sentence after a comma)"""
    grad = num(r, "pasp_grad")
    if grad is None:
        return ""
    rap = num(r, "rap")
    calc = getattr(r, "rap_calculated", None)
    if rap is None and calc:
        rap = to_float(calc[0])
    if rap is None:                              # no RAP (no IVC, no CVP)
        if grad < 25:
            word = "nem emelkedett"
        elif grad <= 30:
            word = "jelentősen nem emelkedett"
        else:
            pasp = grad
            word = None
    else:
        pasp = grad + rap
        word = None
    if word is None:
        word = ("nem emelkedett" if pasp <= 30 else "kissé emelkedett" if pasp <= 40
                else "mérsékelten emelkedett" if pasp <= 55 else "jelentősen emelkedett")
    return f"a becsült kisvérköri nyomás {word}"


# --- Pericardium -----------------------------------------------------------------------
CHAMBERS = [("bal kamra", "a bal kamra"), ("jobb kamra", "a jobb kamra"), ("bal pitvar", "a bal pitvar"),
            ("jobb pitvar", "a jobb pitvar"), ("szívcsúcs", "a szívcsúcs")]


def pericardium_sentence(r):
    text = (r.texts.get("pericardium") or "").strip()
    if not text:
        return "Pericardialis fluidum nem látható."
    low = text.lower()
    sizes = [to_float(n) for n in re.findall(r"(\d+(?:,\d+)?)\s*mm", low)]
    if not sizes:
        if only_negative(text, r"(?:pericardialis\s+)?fluidum"):      # nothing else in the text: nothing is lost
            return "Pericardialis fluidum nem látható."
        return CHECK.format("pericardium")
    named = []                                   # each chamber once, in the order of the text
    for clause in re.split(r"[.;\n]+", low):
        if re.search(r"\d\s*mm", clause):
            named += [phrase for key, phrase in CHAMBERS if key in clause and phrase not in named]
    if not named:
        return CHECK.format("pericardium")
    biggest = max(sizes)                         # the amount follows the biggest number
    amount = ("minimális mennyiségű" if biggest < 4 else "kevés" if biggest < 10
              else "kp mennyiségű" if biggest < 20 else "jelentős mennyiségű")
    where = named[0] if len(named) == 1 else ", ".join(named[:-1]) + " és " + named[-1]
    return f"{where[0].upper() + where[1:]} körül {amount} pericardialis fluidum látható."


# =====================================================================================
# The whole vélemény
# =====================================================================================

def generate(r, sex, grades=None, prosthetic=False, mitral_prosthetic=None):
    """sex: "ffi" or "no" (the LV size and the aorta use it). grades: the calculator's badges of the stenosis boxes,
    as the page shows them ({"ava": "severe", ...}); prosthetic: "Műbillentyű" is ticked (aortic); mitral_prosthetic:
    the mitral prosthesis verdict the page shows."""
    valve_sentences, regurgitation = valves_part(r, grades, prosthetic, mitral_prosthetic)
    pasp = pasp_phrase(r)
    if regurgitation:                                # "Nem jelentős mitralis és tricuspidalis regurgitatio, a becsült ..."
        regurgitation += f", {pasp}." if pasp else "."
        pasp = ""
    parts = [intro_sentence(r), aorta_sentence(r, sex), *lv_sentences(r, sex, diastolic_assessment(r)), rv_sentence(r),
             atria_sentence(r),
             *valve_sentences, regurgitation, clause_sentence([pasp]), pericardium_sentence(r)]
    return " ".join(p for p in parts if p)
