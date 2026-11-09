# EchoCore · Panca study

The by-hand Echo report (the public Pyodide version of `echo-report`) with a **patient repository in a shared
OneDrive folder**: several exams per patient, a patient browser, Előzmény (read-only earlier exams), protection
against two computers overwriting each other, and an Excel export. Green look, so it is never confused with the
public version.

Patient data (name, TAJ, reports) is written **only** to the folder chosen in Chrome. The website itself (`docs/`)
holds program code only.

## Setting up each study computer (once)

1. Install OneDrive and sign in with the account that holds the study folder (e.g. `Panca echo`).
2. In File Explorer, right-click the study folder → **Always keep on this device**. Chrome then reads real files,
   not cloud placeholders, and it also works if the internet drops for a moment.
3. Open the study page in **Chrome**: https://fskristof.github.io/echo-report-panca-study/ (bookmark it).
4. **Mappa kiválasztása** → choose the study folder → give this computer a name (e.g. "Echo labor 1").
   When Chrome asks, choose **Allow on every visit**. Otherwise, after a browser restart the page asks once
   (**Hozzáférés engedélyezése**).

Both computers must choose **the same** OneDrive folder.

One report layout only: **KAEC** (the study's reports go into PBEC, which has the same report box). There is no
place picker and no "Hol dolgozol ma?" question. Elbocsátás has no fixed day, so it gets no expected date.

## Daily use

- **Új beteg**: name, TAJ (checked), visit (Baseline / Elbocsátás / 1 hónap / 1 év / Egyéb), exam date → empty form.
- Click a patient → their exams. **Új vizsgálat** suggests the next missing visit and shows the expected date
  (from the baseline). **Megnyitás** = edit, **Előzmény** = view only.
- While editing, the clock button in the header (**Előzmény**) shows the patient's earlier exams next to the
  current values (changed values in bold).
- **Mentés** saves into the folder. The visit and date can be changed in the Fejléc; the file name follows them.
- **Vizsgálati megjegyzés** (green box in the Fejléc): saved with the exam, shown in Előzmény and the export, never
  in the lelet.
- **2 decimals for the study data**: EF, EDV, ESV, SV and every strain value are stored (`precise_values` in the exam
  file) and exported rounded to 2 decimals; the calculated EF / SV are worked out from the typed EDV / ESV. The boxes
  and the lelet keep the main program's rounding (EF 55 %). Exams saved before 2026-11-09 get these values in the
  export too (calculated from their typed numbers).
- **Exportálás (Excel)**: every exam in one table, one row per exam, every value (calculated ones too) as a column.

## Two computers: what protects you

| Situation | What happens |
|---|---|
| The exam is open on the other computer | Yellow **Szerkesztés: <gép>** in the list; opening asks first (view only / open anyway) |
| The other computer saved the exam after you opened it | Saving stops: **Mégse / Mentés külön vizsgálatként / Felülírás** |
| Both saved within OneDrive's sync delay | OneDrive keeps both files; the list shows a red **Ütközés** with both versions to compare |
| A visit already exists, or the date is far from the expected one | A warning before saving |

**Working rule:** one exam is entered on one computer. Delete OneDrive conflict copies by hand in the folder after
choosing the right version (open it and save).

## Folder layout

```
<study folder>/
  <TAJ>/
    patient.json                  name, TAJ
    2026-11-09_baseline.json      one exam: boxes, texts, all values, report text, visit, date, who/when saved
    2026-11-12_1het.json          Elbocsátás (the file id stays "1het": it was called "1 hét" until 2026-11-09)
    2026-11-16_1het.lock.json     only while the exam is open for editing somewhere
```

## Building / updating

The study site is **separate from echo-report and pinned to one echo-report version** (`echo_pin.txt`, now
885b9d8 of 2026-11-05, the version the study started with). Changes in echo-report never reach the study by
themselves: the study site changes only when it is built here and pushed. Study fixes are developed and tested in
this repo only.

**Study fix** (`study/` changed: patient browser, look, saving; the usual case):

```bash
python3 build_study.py --study-only
```

It refreshes `docs/study` and the version in the study file URLs, and keeps the built page, its echo-report version
and the published password (no echo-report checkout or `gate_password.txt` needed).

**Full build from the pinned version** (e.g. after changing `patches()` or the password):

```bash
python3 build_study.py
```

It checks the pinned commit out into a temporary git worktree of the echo-report checkout (`~/Projects/Echo
dictation` or `~/Projects_cvc/Echo report dictation_CVC`, or `--echo <path>`), runs `build_public.py` there, copies
the result into `docs/`, adds `study/`, applies a few checked patches to `index.html` and removes the worktree.
The echo-report folder itself (its branch, unfinished work) is not touched. Rebuilding with the same pin gives the
same page.

**Taking a change of the main program into the study** (e.g. a calculation fix), on purpose only:

```bash
python3 build_study.py --echo-ref <commit>
```

Test it in test mode (below). If good: run it again with `--save-pin` (writes `echo_pin.txt`), then commit and push.
If not: `python3 build_study.py` puts the pinned version back. If the build stops with "a javítás helye 0× található",
the echo-report page changed where a patch goes: update `patches()` in `build_study.py`.

The study code lives in `study/`: `study.js` (storage, browser, Előzmény, export), `study.css` (look),
`logo.svg` (placeholder logo, replace with the final one).

**Testing without a real folder:** open the page with `?teszt&gep=Gep1` and, in a second tab, `?teszt&gep=Gep2`.
Both use the browser's own private storage as the "folder" (orange TESZT MÓD label). Never use it for study data.

Local preview: `python3 -m http.server 8811 --directory docs`, then http://localhost:8811/.

**Password screen:** the page asks for a password once per computer (then remembers it). It only keeps out
someone who opens the address by accident; patient data is never on the site anyway. The password lives in
`gate_password.txt` in this folder (one line, git-ignored, never published); the build puts only a salted SHA-256
fingerprint into the site. To change it: edit the file, rebuild, push. Every computer then asks for the new one.
`--no-gate` builds without the screen.

**Publishing an update:** rebuild, check locally, then `git add -A && git commit && git push`. GitHub Pages
redeploys in about a minute; the study files' fingerprint in their URLs makes both computers load the new version.
