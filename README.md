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
3. Open the study page in **Chrome** (the address comes after publishing to GitHub Pages).
4. **Mappa kiválasztása** → choose the study folder → give this computer a name (e.g. "Echo labor 1").
   When Chrome asks, choose **Allow on every visit**. Otherwise, after a browser restart the page asks once
   (**Hozzáférés engedélyezése**).

Both computers must choose **the same** OneDrive folder.

## Daily use

- **Új beteg**: name, TAJ (checked), visit (Baseline / 1 hét / 1 hónap / 1 év / Egyéb), exam date → empty form.
- Click a patient → their exams. **Új vizsgálat** suggests the next missing visit and shows the expected date
  (from the baseline). **Megnyitás** = edit, **Előzmény** = view only.
- While editing, the clock button in the header (**Előzmény**) shows the patient's earlier exams next to the
  current values (changed values in bold).
- **Mentés** saves into the folder. The visit and date can be changed in the Fejléc; the file name follows them.
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
    2026-11-16_1het.json
    2026-11-16_1het.lock.json     only while the exam is open for editing somewhere
```

## Building / updating

```bash
python3 build_study.py
```

This runs `build_public.py` in `~/Projects/Echo dictation` (`--echo <path>` for another checkout), copies the
result into `docs/`, adds `study/` and applies a few checked patches to `index.html`. Rebuild after every change in
echo-report so the study version gets the new features. If the build stops with "a javítás helye 0× található",
the echo-report page changed where a patch goes: update `patches()` in `build_study.py`.

The study code lives in `study/`: `study.js` (storage, browser, Előzmény, export), `study.css` (look),
`logo.svg` (placeholder logo, replace with the final one).

**Testing without a real folder:** open the page with `?teszt&gep=Gep1` and, in a second tab, `?teszt&gep=Gep2`.
Both use the browser's own private storage as the "folder" (orange TESZT MÓD label). Never use it for study data.

Local preview: `python3 -m http.server 8811 --directory docs`, then http://localhost:8811/.
