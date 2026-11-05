# Panca study: Echo report with a local patient repository

Agreed plan (2026-11-05). **Built 2026-11-05** from echo-report 885b9d8 (see README.md):
build_study.py + study/ → docs/. Tested in Chrome test mode (two tabs as two computers).
**Published 2026-11-05**: repo fskristof/echo-report-panca-study, GitHub Pages from main /docs,
https://fskristof.github.io/echo-report-panca-study/ (live site checked in test mode).
Not yet done: test with a real OneDrive folder on the study PCs.

## Goal

A separate, altered copy of the **public by-hand Echo report** (the Pyodide build of Echo dictation,
`build_public.py`, published as `echo-report-public`) for a study starting Monday 2026-11-09.
It must store patient reports in a local (OneDrive-synced) folder, reload them, hold several exams
per patient, and offer a patient browser in the UI.

## Base and what already exists

- Source: `~/Projects/Echo dictation` (repo `fskristof/echo-report`), public build via `build_public.py`
  (`STATIC` mode, `web/static-api.js` runs the report Python in the browser with Pyodide).
- The full server version already has: Save button (`#save`, `state.savedId`, overwrite until new
  report), name + TAJ in the header (list only, never in report text), saved-reports list with
  search/sort/delete, reopen through `/render` (calculations and checks re-run), dirty tracking.
  These are hidden in the public build by `html.static` CSS, backed by `/api/reports` (SQLite).
- Plan: show those parts again and replace the `/api/reports` backend with a new
  `study-storage.js` that reads/writes a local folder. Keep the change in that one file plus small
  hooks in `index.html`, so the copy can be rebuilt when the main app changes (e.g. calculation fixes).

## Decisions

| Topic | Decision |
|---|---|
| Computers | 2 new PCs (not used before), both with Chrome |
| Storage | Chrome File System Access API (`showDirectoryPicker`), folder handle kept in IndexedDB; one-click re-approval after a browser restart |
| Sharing | OneDrive sync of the repository folder. Set "Always keep on this device" on both PCs |
| Hosting | Option (a): new GitHub Pages repo **`echo-report-panca-study`**. Only program code goes there; patient data never leaves the folder. Create/push only after the user's OK |
| Patient ID | Name + TAJ stored (study data, never public). Patient folder named by TAJ (9-digit TAJ check), name inside `patient.json` |
| Location | Separate copy in `~/Projects/Panca project reporting`; `echo-report` and `echo-report-public` untouched |

## Folder layout

```
StudyRepo/                       (OneDrive)
  <TAJ>/
    patient.json                 name, TAJ, created
    2026-11-09_baseline.json     one file per exam
    2026-11-16_1het.json
    .editing-<exam>.json         "being edited" marker (PC, since when)
```

Exam file: `payload` (box values, texts, egyéb, same as the DB today), place, report text at save
time, visit label, exam date, created/updated timestamps, saved-by PC, app version, a revision value
for the overwrite check.

## Features

1. **Exam metadata**: visit dropdown Baseline / 1 hét / 1 hónap / 1 év / Egyéb; exam date required
   (default today); save time automatic. File name uses the date so order is right even if the
   label is wrong. Warn on a duplicate visit; show the expected date (e.g. 1 week after baseline).
2. **Patient browser** (replaces the saved-reports list): search by name / TAJ / date; patient expands
   to exams by date; New patient, New exam for this patient, **Megnyitás** (edit), **Előzmény** (read-only).
3. **Előzmény**: read-only view of earlier exams; while editing a follow-up, a header button opens a
   side panel with the earlier reports' text and optionally key values next to the current ones
   (EF, TAPSE, gradients...). Cannot be saved, never triggers the overwrite check.
4. **No accidental overwrites (must have)**:
   - Save check: re-read the exam file before saving; if it changed since opening, stop and ask.
   - "Being edited" marker: opening for edit writes a marker; the other PC shows "being edited on
     PC-x" and offers read-only. Cleared on save/close.
   - OneDrive conflict copies (file renamed with PC name) detected and flagged in the browser.
   - Unsaved-changes warning before leaving/opening another exam.
   - Working rule for users: one exam is entered on one computer.
5. **Export to Excel**: CSV (Excel-friendly: UTF-8 BOM, `;` separator, Hungarian decimal comma to
   check), one row per exam: name, TAJ, visit, exam date, save time, every value as a column.
   Read-only on the folder.
6. **Look**: green accent, placeholder logo with a pancreas shape (user's own logo comes later),
   "Panca study" label/banner, different favicon and title, so it is never confused with the public app.

## Order of work (when resuming)

1. Pull the latest echo-report, run the public build, copy into this folder.
2. `study-storage.js` + index.html hooks (un-hide save/list/name+TAJ, visit + date fields).
3. Patient browser, Előzmény, overwrite protection, conflict detection.
4. CSV export. Green theme + placeholder logo.
5. Test locally in Chrome with two browser profiles on one OneDrive-like folder (simulate two PCs).
6. With the user's OK: create `echo-report-panca-study`, publish to GitHub Pages; user tests on both PCs.
