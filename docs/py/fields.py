"""
Every value the report can contain, in one list (built from template.md).

Each field has:
  key    short internal name (what the AI fills in)
  label  how it is written in the report
  unit   unit written after the value ("" = none)
  kind   "num" number, "grade" (MI/TI/AI/PI), "choice" (fixed words), "flag" (yes/no),
         "text" (a few words typed in one line, written as typed: what sport, how much)
  said   how you dictate it; this goes into the AI's instructions
  calc   decimals if the program may calculate it (template.md 4.7), else None
  ai     False = typed on the page only; not in the AI's instructions yet (a new field goes to
         the AI only after a measured test run with evaluate.py)

The layout (which field goes where) is in report.py; this file doesn't decide layout.
"""

from dataclasses import dataclass


@dataclass
class Field:
    key: str
    label: str
    unit: str
    kind: str
    said: str
    calc: int | None = None
    ai: bool = True


def pisa(prefix, valve, with_fraction):
    """The PISA block is the same for MR, TR and AR (TR has no regurgitant fraction)."""
    ctx = f'after "{valve} PISA" (or a later correction naming {valve})'
    fields = [
        Field(f"{prefix}_rad", f"{valve} PISA Rad.", "mm", "num", f"rádiusz, {ctx}"),
        Field(f"{prefix}_ero", f"{valve} PISA ERO", "cm2", "num", f"ERO, {ctx}", calc=2),
        Field(f"{prefix}_regvol", f"{valve} PISA Reg. vol.", "ml", "num",
              f"reg. vol., regurgitáló volumen, {ctx}", calc=0),
    ]
    if with_fraction:
        fields.append(Field(f"{prefix}_regfrac", f"{valve} PISA Reg. frakció", "%", "num",
                            f"reg. frakció, {ctx}", calc=0))
    fields += [
        # TR Vmax is calculated from the TR gradient when only that was said (template.md 4.10)
        Field(f"{prefix}_vmax", f"{valve} PISA Vmax", "m/s", "num", f"Vmax, {ctx}",
              calc=2 if prefix == "tr" else None),
        Field(f"{prefix}_vti", f"{valve} PISA VTI", "cm", "num", f"VTI, {ctx}"),
        Field(f"{prefix}_avel", f"{valve} PISA A. vel.", "cm/s", "num",
              f"A. vel., A pont vel, aliasing velocity, {ctx}"),
    ]
    return fields


def tdi(side, side_hu):
    ctx = f'after "{side_hu} TDI"'
    return [
        Field(f"tdi_{side}_s", f"{side_hu} TDI S", "cm/s", "num", f"S, {ctx}"),
        Field(f"tdi_{side}_e", f"{side_hu} TDI E'", "cm/s", "num", f"E vessző, E', {ctx}"),
        Field(f"tdi_{side}_a", f"{side_hu} TDI A'", "cm/s", "num", f"A vessző, A', {ctx}"),
        Field(f"tdi_{side}_ee", f"{side_hu} TDI E/E'", "", "num",
              f"E per E vessző, E/E', {ctx}", calc=2),
    ]


FIELDS = [
    # --- Header -------------------------------------------------------------------
    Field("hr", "HR", "/min", "num", "HR, pulzus, frekvencia"),
    # blood pressure (2026-11-05, typed on the page only): "Vérnyomás: 120/80 Hgmm", next to HR
    Field("bp_sys", "Systolés vérnyomás", "Hgmm", "num", "systolic blood pressure", ai=False),
    Field("bp_dia", "Diastolés vérnyomás", "Hgmm", "num", "diastolic blood pressure", ai=False),
    Field("ts", "TS", "kg", "num", "testsúly"),
    Field("tm", "TM", "m", "num", "testmagasság, magasság; usually in cm (178): give it as dictated"),
    Field("bsa", "BSA", "m2", "num", "BSA", calc=2),
    # (PM = pacemaker, HM = HeartMate: typed on the page only, 2026-11-05; the AI's description is unchanged)
    Field("device", "Eszköz", "", "choice", "ECMO / LVAD / RVAD: the device whose flow is dictated"),
    Field("device_flow", "Flow", "liter/min", "num", "the device's flow, e.g. 'RVAD flow 4,9 liter per perc'"),
    Field("device_rpm", "RPM", "RPM", "num", "the device's RPM"),
    # a 2nd and 3rd device ("+" on the page; each on its own report line). Typed on the page only.
    Field("device_2", "Eszköz (2.)", "", "choice", "2nd device", ai=False),
    Field("device_2_flow", "Flow (2.)", "liter/min", "num", "2nd device flow", ai=False),
    Field("device_2_rpm", "RPM (2.)", "RPM", "num", "2nd device RPM", ai=False),
    Field("device_3", "Eszköz (3.)", "", "choice", "3rd device", ai=False),
    Field("device_3_flow", "Flow (3.)", "liter/min", "num", "3rd device flow", ai=False),
    Field("device_3_rpm", "RPM (3.)", "RPM", "num", "3rd device RPM", ai=False),
    Field("cvp", "CVP", "Hgmm", "num", "CVP, invazív CVP (not written in the report, only used for RAP)"),
    Field("ventilated", "Lélegeztetett", "", "flag",
          "lélegeztetett, gépi lélegeztetés: value 'igen' (not written in the report)"),
    # tick boxes in the header: only the Vélemény generator's first sentence uses them (template.md 5d.1)
    Field("supine", "Háton fekvő", "", "flag", "ticked on the page", ai=False),
    Field("afib", "Pitvarfibrilláció", "", "flag", "ticked on the page", ai=False),
    Field("pvc", "Extrasystoles", "", "flag", "ticked on the page: frequent extrasystoles during the exam", ai=False),
    Field("bedside", "Bedside", "", "flag", "ticked on the page", ai=False),
    Field("suboptimal", "Szuboptimális echoablak", "", "flag", "ticked on the page", ai=False),
    # sport (2026-11-05): a tick, and when ticked a small box for what kind and how much; written in the report
    # ("Sport: futás, heti 3 x 10 km"), unlike the ticks above
    Field("sport", "Sport", "", "flag", "ticked on the page", ai=False),
    Field("sport_text", "Sport (milyen, mennyi)", "", "text", "typed on the page", ai=False),

    # --- Bal kamra ----------------------------------------------------------------
    Field("lv_edd", "LV EDD", "mm", "num", "LV EDD; 1st number of 'bal kamra X per Y'"),
    Field("lv_esd", "LV ESD", "mm", "num", "LV ESD; 2nd number of 'bal kamra X per Y'"),
    Field("septum", "Septum", "mm", "num", "szeptum"),
    Field("hatso_fal", "Hátsó fal", "mm", "num", "hátsó fal"),
    Field("ao_annulus", "Ao. annulus", "mm", "num", "gyök, aorta gyök"),
    Field("sinus_valsalva", "Sinus valsalva", "mm", "num", "sinus valsalva"),
    Field("ao_ascendens", "Ao. ascendens", "mm", "num", "ascendens, aorta ascendens"),
    # EF and SV are calculated from EDV and ESV when not dictated (template.md 4.11, 2026-10-08)
    Field("ef", "EF", "%", "num", "EF; one value, or a range like '55-60'", calc=0),
    Field("edv", "EDV", "ml", "num", "EDV"),
    Field("esv", "ESV", "ml", "num", "ESV"),
    Field("lv_sv", "SV (2D)", "ml", "num", "stroke volume from EDV - ESV", calc=0, ai=False),
    Field("gls", "GLS", "%", "num", "GLS; dictated with 'mínusz': write '-16,2'"),
    # 3D volumetry (2026-10-08, typed on the page only): the report writes them on a "3D:" line under the 2D one
    Field("lv3d_ef", "3D EF", "%", "num", "3D EF", calc=0, ai=False),
    Field("lv3d_edv", "3D EDV", "ml", "num", "3D EDV", ai=False),
    Field("lv3d_esv", "3D ESV", "ml", "num", "3D ESV", ai=False),
    Field("lv3d_sv", "3D SV", "ml", "num", "3D SV", calc=0, ai=False),
    Field("e_wave", "E", "cm/s", "num", "1st number after 'beáramlás' or 'E/A' (E velocity)"),
    Field("a_wave", "A", "cm/s", "num", "2nd number after 'beáramlás' (A velocity)"),
    Field("ea_ratio", "E/A", "", "num", "3rd number after 'beáramlás', often after 'egyenlő'", calc=2),
    Field("dt", "DT", "ms", "num", "4th number after 'beáramlás', sometimes after 'DT'"),
    # ticked on the page: an L wave (mid-diastolic mitral inflow >= 50 cm/s); only the Vélemény generator uses it
    Field("l_wave", "L hullám", "", "flag", "ticked on the page", ai=False),
    *tdi("lat", "laterális"),
    *tdi("med", "mediális"),

    # --- Jobb kamra ---------------------------------------------------------------
    Field("rv_edd", "RV EDD", "mm", "num", "1st number of 'jobb kamra X per Y'"),
    Field("rv_esd", "RV ESD", "mm", "num", "2nd number of 'jobb kamra X per Y'"),
    Field("tapse", "TAPSE", "mm", "num", "TAPSE"),
    Field("fac", "FAC", "%", "num", "FAC", calc=0),     # calculated from RVEDA / RVESA (template.md 4.13)
    # the FAC calculator's inputs (2026-10-11): typed in its little window on the page, never in the report
    Field("rv_eda", "RVEDA", "cm2", "num", "RV end-diastolic area", ai=False),
    Field("rv_esa", "RVESA", "cm2", "num", "RV end-systolic area", ai=False),
    Field("tric_smax", "Tricuspidalis Smax", "cm/s", "num", "tricuspidalis Smax, S max"),
    # RV strain (2026-11-05, typed on the page only): negative like the LV GLS; the row above the 3D row
    Field("rv_fwls", "RV FWLS", "%", "num", "RV free wall longitudinal strain", ai=False),
    Field("rv_sls", "RV septal strain", "%", "num", "RV septal longitudinal strain", ai=False),
    Field("rv_gls", "RV GLS", "%", "num", "RV global longitudinal strain", ai=False),
    # RV 3D volumetry (2026-10-08, typed on the page only)
    Field("rv3d_ef", "RV EF", "%", "num", "RV 3D EF", calc=0, ai=False),
    Field("rv3d_edv", "RV EDV", "ml", "num", "RV 3D EDV", ai=False),
    Field("rv3d_esv", "RV ESV", "ml", "num", "RV 3D ESV", ai=False),
    Field("rv3d_sv", "RV SV", "ml", "num", "RV 3D SV", calc=0, ai=False),

    # --- Pitvarok -----------------------------------------------------------------
    Field("la_1", "Bal pitvar (1.)", "mm", "num", "1st number of 'bal pitvar X x Y'"),
    Field("la_2", "Bal pitvar (2.)", "mm", "num", "2nd number of 'bal pitvar X x Y'"),
    Field("ra_1", "Jobb pitvar (1.)", "mm", "num", "1st number of 'jobb pitvar X x Y' (also 'a jobb' right after the left atrium)"),
    Field("ra_2", "Jobb pitvar (2.)", "mm", "num", "2nd number of 'jobb pitvar X x Y'"),
    # LAV: not written in the report, only for LAVi. It is the same volume as LA ESV (the LA's largest volume, at the
    # end of LV systole): one is copied into the other when only one is there (template.md 4.15, 2026-11-05)
    Field("lav", "LAV", "ml", "num", "LAV", calc=0),
    Field("lavi", "LAVi", "ml/m2", "num", "LAVi", calc=0),
    # LA strain (2026-11-05: LARes renamed LASr, conduit and contractile added; typed on the page only). LASr is
    # positive; LAScd / LASct are usually written negative; |LAScd| + |LASct| is about LASr (checked in report.py)
    Field("lares", "LASr", "%", "num", "LA reservoir strain, always positive", ai=False),
    Field("la_cd", "LAScd", "%", "num", "LA conduit strain", ai=False),
    Field("la_ct", "LASct", "%", "num", "LA contractile strain", ai=False),
    # LA volumetry (2026-11-05, typed on the page only; not used routinely, LAVi is): EDV = the smallest LA volume (end
    # of LV diastole), ESV = the largest (end of LV systole, = LAV); SV = ESV - EDV, EF = SV / ESV (template.md 4.15)
    Field("la_edv", "LA EDV", "ml", "num", "LA volume at LV end-diastole (smallest)", ai=False),
    Field("la_esv", "LA ESV", "ml", "num", "LA volume at LV end-systole (largest, = LAV)", calc=0, ai=False),
    Field("la_sv", "LA SV", "ml", "num", "LA ESV - LA EDV", calc=0, ai=False),
    Field("la_ef", "LA EF", "%", "num", "LA emptying fraction", calc=0, ai=False),

    # --- Mitrális billentyű ---------------------------------------------------------
    # the valve's look, picked in the card's title on the page (2026-10-08): the first line of the valve text in the
    # report ("Meszes mitrális billentyű."; vékony is not written)
    Field("mv_morph", "Mitrális billentyű", "", "choice", "picked on the page", ai=False),
    Field("mi", "MI", "", "grade", "MI, mitrális regurgitáció / insuff / regurg"),
    Field("mr_vc", "MR VC", "mm", "num", "MR vena contracta"),
    Field("vena_pulm_flow", "Vena pulmonalis flow", "", "choice",
          "vena pulmonalis flow: normál / S-blunting / systolés reverse flow", ai=False),
    Field("mv_lvot_vti", "MV/LVOT VTI", "", "num", "MV per LVOT VTI", calc=2),
    # From the echo calculator: typed on the page, never in the report (template.md 4.8)
    Field("mv_vti_pw", "MV VTI (PW)", "cm", "num", "MV VTI PW", ai=False),
    Field("mv_vti_cw", "MV VTI (CW)", "cm", "num", "MV VTI CW", ai=False),
    *pisa("mr", "MR", with_fraction=True),
    Field("mv_grad", "Mitrális diastolés átlag gradiens", "Hgmm", "num",
          "mitrális diasztolés átlag gradiens"),
    Field("mva_vti", "MVA (VTI)", "cm2", "num", "MVA VTI", calc=2),
    Field("mva_pht", "MVA (PHT)", "cm2", "num", "MVA PHT", calc=2),
    Field("mv_pht", "MV PHT", "ms", "num", "mitrális PHT, MV PHT"),
    Field("mva", "MVA", "cm2", "num", "'MVA' when neither VTI nor PHT is said"),
    # Mitral prosthesis (mv_morph = műbillentyű; calculator v4.33, 2026-10-13; template.md 4.14): typed / calculated on
    # the page, written in the report's mitral part. The prosthesis' EOA is the MVA (VTI) box; its peak E is measured
    # with CW (not the PW E of E/A).
    Field("mv_peak_e", "Peak E", "m/s", "num", "mitral prosthesis peak E velocity (CW)", ai=False),
    Field("mv_dvi", "MV DVI", "", "num", "MV VTI (CW) / LVOT VTI", calc=2, ai=False),
    Field("mv_eoai", "EOAi", "cm2/m2", "num", "mitral prosthesis EOA / BSA", calc=2, ai=False),

    # --- Tricuspidalis billentyű ----------------------------------------------------
    Field("tv_morph", "Tricuspidalis billentyű", "", "choice", "picked on the page", ai=False),
    Field("ti", "TI", "", "grade", "TI, tricuspidalis regurgitáció / insuff / regurg"),
    Field("ivc_max", "IVC max", "mm", "num", "1st number of 'IVC X per Y'"),
    Field("ivc_min", "IVC min", "mm", "num",
          "2nd number of 'IVC X per Y'; if it collapses instead ('IVC 12 per kollabál'): 'kol'"),
    Field("pasp_grad", "PASP gradiens", "Hgmm", "num",
          "kisvérkör, APsyst, PASP: the number BEFORE 'plusz' ('31 plusz 5' -> 31; '35+' -> 35)",
          calc=0),                  # calculated from the TR Vmax when only that was said (template.md 4.10)
    Field("rap", "RAP", "Hgmm", "num",
          "the number AFTER 'plusz' of kisvérkör/APsyst ('31 plusz 5' -> 5; 'kisvérkör plusz 3' -> 3)"),
    *pisa("tr", "TR", with_fraction=False),
    Field("hep_flow", "Vena hepatica flow", "", "choice",
          "vena hepatica flow: normál / S-blunting / systolés reverse flow"),
    Field("tr_vc", "TR VC", "mm", "num", "TR vena contracta"),

    # --- Aorta billentyű --------------------------------------------------------------
    Field("av_morph", "Aorta billentyű", "", "choice", "picked on the page; műbillentyű = prosthetic valve", ai=False),
    Field("av_vmax", "AV Vmax", "m/s", "num", "aorta Vmax, AV Vmax"),
    Field("av_grad_peak", "AV grad (peak)", "Hgmm", "num", "1st number of 'aorta gradiens X per Y'"),
    Field("av_grad_mean", "AV grad (mean)", "Hgmm", "num", "2nd number of 'aorta gradiens X per Y'"),
    Field("ai", "AI", "", "grade", "AI, aorta regurgitáció / insuff / regurg"),
    # paravalvular leak of a prosthetic aortic valve (2026-10-08, typed on the page only, shown with "Műbillentyű")
    Field("pvl", "PVL", "", "grade", "paravalvularis leak", ai=False),
    Field("ar_vc", "AR VC", "mm", "num", "AR vena contracta"),
    Field("ar_pht", "AR PHT", "ms", "num", "AR PHT"),
    Field("ao_desc_rev", "Ao. desc. rev. flow", "", "choice", "aorta descendens reverse flow: van / nincs",
          ai=False),
    Field("lvot_diam", "LVOT Diam", "mm", "num", "LVOT diam"),
    Field("lvot_vti", "LVOT VTI", "cm", "num", "LVOT VTI"),
    Field("av_vti", "AV VTI", "cm", "num", "AV VTI, aorta VTI"),
    Field("ava", "AVA", "cm2", "num", "AVA", calc=2),
    Field("avai", "AVAi", "cm2/m2", "num", "AVAi, AVA index", calc=2),
    Field("dvi", "DVI", "", "num", "DVI", calc=2),
    # From the echo calculator: page only, never in the report (template.md 4.8)
    Field("lvot_vmax", "LVOT Vmax", "m/s", "num", "LVOT Vmax", ai=False),
    Field("dvi_vmax", "DVI (Vmax)", "", "num", "DVI Vmax", calc=2, ai=False),
    Field("av_at", "AT", "ms", "num", "aorta acceleration time", ai=False),
    Field("av_et", "ET", "ms", "num", "aorta ejection time", ai=False),
    Field("av_at_et", "AT/ET", "", "num", "AT/ET", calc=2, ai=False),
    Field("sv", "SV", "ml", "num", "SV, stroke volumen", calc=0),
    Field("svi", "SVi", "ml/m2", "num", "SVi, SV index", calc=0),
    Field("co", "CO", "l/min", "num", "CO, cardiac output, perctérfogat", calc=1),
    Field("ci", "CI", "l/min/m2", "num", "CI, cardiac index", calc=1),
    *pisa("ar", "AR", with_fraction=True),

    # --- Pulmonalis billentyű ----------------------------------------------------------
    Field("pi", "PI", "", "grade", "PI, pulmonalis regurgitáció / insuff / regurg"),
    # PI end-diastolic velocity -> APdiast = 4 x v2 (+ RAP in the report); RVOT -> Qp/Qs (2026-10-11, typed on the
    # page only; template.md 4.12)
    Field("pi_ed_vel", "PI ED vel.", "m/s", "num", "PI end-diastolic velocity", ai=False),
    Field("padp_grad", "APdiast", "Hgmm", "num", "PI end-diastolic gradient (the X of 'APdiast X+RAP')", calc=0, ai=False),
    Field("pulm_acc", "Pulm. acc. idő", "ms", "num", "pulmonalis acceleration time", ai=False),
    Field("rvot_diam", "RVOT Diam", "mm", "num", "RVOT diam", ai=False),
    Field("rvot_vti", "RVOT VTI", "cm", "num", "RVOT VTI", ai=False),
    Field("qp_qs", "Qp/Qs", "", "num", "Qp/Qs, shunt ratio", calc=2, ai=False),

    # --- Pericardium: respiratory variation of the inflow (typed on the page; template.md 4.9)
    Field("mv_resp_max", "Mitrális beáramlás max", "cm/s", "num", "mitral inflow max", ai=False),
    Field("mv_resp_min", "Mitrális beáramlás min", "cm/s", "num", "mitral inflow min", ai=False),
    Field("mv_resp_var", "Mitrális ingadozás", "%", "num", "mitral inflow variation", calc=0, ai=False),
    Field("tv_resp_max", "Tricuspidalis beáramlás max", "cm/s", "num", "tricuspid inflow max", ai=False),
    Field("tv_resp_min", "Tricuspidalis beáramlás min", "cm/s", "num", "tricuspid inflow min", ai=False),
    Field("tv_resp_var", "Tricuspidalis ingadozás", "%", "num", "tricuspid inflow variation", calc=0, ai=False),
]

FIELD = {f.key: f for f in FIELDS}
AI_FIELDS = [f for f in FIELDS if f.ai]          # what the AI is asked to fill

# Free-text parts of the report. The AI keeps your wording (light grammar fixes only).
# The structure of wall motion and pericardial text follows the doctor's description in
# template.md; the examples here are made up (not from the test recordings).
TEXT_SECTIONS = {
    "falmozgas": (
        "ALL left ventricle wall motion text, incl. 'regionális falmozgászavar nincs' "
        "(usually wall + region + type, optionally morphology: e.g. inferior fal basalis "
        "harmada akinetikus, elvékonyodott)"),
    "mitralis": "mitral valve description (morphology, prolapse, calcification, prosthesis...)",
    "tricuspidalis": "tricuspid valve description",
    "aorta": "aortic valve description",
    "pulmonalis": "pulmonary valve description",
    "pericardium": (
        "ALL pericardial fluid text, incl. 'nincs' / 'nem látható' (usually view + location + "
        "size in mm + morphology, one clause per location: e.g. PSAX: a bal kamra mögött 6 mm "
        "pericardialis fluidum)"),
}

# Free text typed on the page only (not yet filled by the AI): written after the section's values
PAGE_TEXTS = ("fejlec", "bal_kamra", "jobb_kamra", "pitvarok", "velemeny")   # fejlec: a remark in the header
                                                                   # (2026-11-05); bal_kamra: other LV remarks (after the
                                                                   # wall motion text); velemeny: the opinion, at the end

# Allowed words for "choice" fields (the report uses exactly these spellings)
CHOICES = {
    # PM = pacemaker, HM = HeartMate (2026-11-05): no flow / RPM boxes for PM
    "device": ["ECMO", "LVAD", "RVAD", "HM", "PM"],
    "device_2": ["ECMO", "LVAD", "RVAD", "HM", "PM"],
    "device_3": ["ECMO", "LVAD", "RVAD", "HM", "PM"],
    "ao_desc_rev": ["van", "nincs"],
    "mv_morph": ["vékony", "megvastagodott", "meszes", "műbillentyű"],   # műbillentyű: the mitral prosthesis part comes later
    "tv_morph": ["vékony", "megvastagodott", "meszes"],
    "av_morph": ["vékony", "megvastagodott", "meszes", "műbillentyű"],   # műbillentyű = the prosthetic valve part
    "hep_flow": ["normál", "S-blunting", "systolés reverse flow"],
    "vena_pulm_flow": ["normál", "S-blunting", "systolés reverse flow"],
}

# Devices that have a flow and an RPM (the page shows those two boxes only for these; a pacemaker has neither)
PUMPS = ("ECMO", "LVAD", "RVAD", "HM")
# Strain values that are negative (a missing minus gets a warning, the page adds it, with undo)
NEGATIVE_STRAIN = ("gls", "rv_fwls", "rv_sls", "rv_gls")

# Grades as dictated (Arabic numbers) -> as written (Roman numerals)
ROMAN = {"1": "I", "2": "II", "3": "III", "4": "IV", "5": "V", "6": "VI"}
MAX_GRADE = {"mi": 4, "ai": 4, "pi": 4, "ti": 6, "pvl": 4}
