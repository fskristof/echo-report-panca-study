// Panca study version of the by-hand Echo report.
// Loaded AFTER the page's own script (build_study.py). It keeps the page as it is and replaces only the saving part:
// the reports are stored in a folder chosen in Chrome (the study's shared OneDrive folder), one subfolder per patient
// (named after the TAJ), one JSON file per exam. It also adds: visit + exam date, the patient browser on the home page,
// Előzmény (earlier exams, read only), protection against two computers overwriting each other, and an Excel export.
//
// The page's top-level functions (saveReport, loadSaved, makePatientLine, ...) are global bindings, so assigning to
// them here replaces them everywhere the page calls them by name. Its top-level const/let (state, side, ...) are
// shared between classic scripts, so they are used directly.
//
// Folder layout:
//   <folder>/<TAJ>/patient.json                    name, TAJ
//   <folder>/<TAJ>/<date>_<visit>[_n].json         one exam (format "echo-panca-exam")
//   <folder>/<TAJ>/<date>_<visit>[_n].lock.json    "being edited on <computer>" while an exam is open for editing
// Any other .json in a patient folder holding an exam is a OneDrive conflict copy: flagged, never overwritten.
(function () {
  "use strict";

  const FORMAT = "echo-panca-exam";
  const VISITS = [
    { id: "baseline", label: "Baseline" },
    // the discharge exam: no fixed day after the baseline, so no expected date / tolerance. The id stays "1het"
    // (it was "1 hét" until 2026-11-09): the files saved under that name keep working and show as Elbocsátás.
    { id: "1het", label: "Elbocsátás" },
    { id: "1honap", label: "1 hónap", add: [0, 1, 0], tol: 10 },
    { id: "1ev", label: "1 év", add: [1, 0, 0], tol: 45 },
    { id: "egyeb", label: "Egyéb" },
  ];
  const SCHEDULE = VISITS.filter((v) => v.id !== "egyeb");
  const LOCK_STALE_MS = 12 * 3600 * 1000;          // an "editing" note older than this is ignored (crashed browser)
  const EXAM_RE = /^(\d{4}-\d{2}-\d{2})_([a-z0-9]+)(?:_(\d+))?\.json$/;
  const LOCK_SUFFIX = ".lock.json";
  const params = new URLSearchParams(location.search);
  // Test mode (?teszt): the browser's own private storage instead of a real folder; two tabs = two computers
  // (?teszt&gep=Gep2). Never used for study data.
  const TEST = params.has("teszt");
  // The study's reports are pasted into PBEC, which has the same report box as KAEC: always the KAEC layout,
  // no place picker (study.css hides it, and the "Hol dolgozol ma?" question).
  const PLACE = "KAEC";

  const visitLabel = (id) => (VISITS.find((v) => v.id === id) || { label: id || "" }).label;
  const pad = (n) => String(n).padStart(2, "0");
  const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const shownTime = (iso) => { if (!iso) return ""; const d = new Date(iso);
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}. ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const shownDay = (ymd) => ymd ? ymd.replace(/-/g, ".") + "." : "";
  const tajDigits = (t) => (t || "").replace(/\D/g, "");
  const tajShown = (t) => { const d = tajDigits(t); return d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : t; };
  function tajChecksumOk(t) {                       // TAJ: 9 digits, the 9th = (3·odd + 7·even positions of 1-8) mod 10
    const d = tajDigits(t);
    if (d.length !== 9) return false;
    let s = 0;
    for (let i = 0; i < 8; i++) s += Number(d[i]) * (i % 2 === 0 ? 3 : 7);
    return s % 10 === Number(d[8]);
  }
  function addDate(ymd, [y, m, d]) {
    const [Y, M, D] = ymd.split("-").map(Number);
    return localDate(new Date(Y + y, M - 1 + m, D + d));
  }
  const daysBetween = (a, b) => Math.round((Date.parse(b + "T12:00:00") - Date.parse(a + "T12:00:00")) / 86400000);

  /* ---------------- Small storage helpers: IndexedDB (the folder handle), files ---------------- */
  function idb() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open("echo-panca", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function kv(key, value) {                  // kv(key) reads, kv(key, value) writes
    const db = await idb();
    return new Promise((resolve, reject) => {
      const store = db.transaction("kv", value === undefined ? "readonly" : "readwrite").objectStore("kv");
      const r = value === undefined ? store.get(key) : store.put(value, key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function readJSON(dir, name) {             // null when the file does not exist
    let file;
    try { file = await (await dir.getFileHandle(name)).getFile(); }
    catch (e) { if (e.name === "NotFoundError" || e.name === "TypeMismatchError") return null; throw e; }
    let text;
    try { text = await file.text(); }               // removed between listing and reading (a lock note just cleared)
    catch (e) { if (e.name === "NotFoundError" || e.name === "NotReadableError") return null; throw e; }
    try { return { data: JSON.parse(text), lastModified: file.lastModified }; }
    catch (e) { return { data: null, broken: true, lastModified: file.lastModified }; }
  }
  async function writeJSON(dir, name, obj) {       // createWritable writes a temporary file, swapped in on close()
    const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await w.write(JSON.stringify(obj, null, 2));
    await w.close();
  }
  async function removeFile(dir, name) {
    try { await dir.removeEntry(name); } catch (e) { if (e.name !== "NotFoundError") throw e; }
  }
  async function patientDir(taj, create = false) {
    try { return await repo.dir.getDirectoryHandle(taj, { create }); }
    catch (e) { if (e.name === "NotFoundError") return null; throw e; }
  }
  const lockName = (file) => file.replace(/\.json$/, LOCK_SUFFIX);

  /* ---------------- The folder (repository) ---------------- */
  const repo = { dir: null, status: "none" };      // status: none | prompt | ok | unsupported
  let repoReady = null;
  function initRepo() {
    if (!repoReady) repoReady = (async () => {
      if (TEST) {
        const root = await navigator.storage.getDirectory();
        repo.dir = await root.getDirectoryHandle("panca-teszt", { create: true });
        repo.status = "ok";
        const tag = el("div", "study-test", "TESZT MÓD · gép: " + pcName());
        document.body.append(tag);
        return;
      }
      if (!window.showDirectoryPicker) { repo.status = "unsupported"; return; }
      try {
        const h = await kv("repo");
        if (h) {
          repo.dir = h;
          repo.status = (await h.queryPermission({ mode: "readwrite" })) === "granted" ? "ok" : "prompt";
        }
      } catch (e) { console.warn(e); }
    })();
    return repoReady;
  }
  async function chooseFolder() {
    let h;
    try { h = await window.showDirectoryPicker({ id: "panca-study", mode: "readwrite" }); }
    catch (e) { if (e.name !== "AbortError") alert("Nem sikerült a mappát megnyitni: " + e.message); return false; }
    repo.dir = h; repo.status = "ok";
    try { await kv("repo", h); } catch (e) { console.warn(e); }
    cache.patients = null;
    if (!pcName()) await askPcName();
    return true;
  }
  async function grantFolder() {
    try { repo.status = (await repo.dir.requestPermission({ mode: "readwrite" })) === "granted" ? "ok" : "prompt"; }
    catch (e) { repo.status = "prompt"; }
    return repo.status === "ok";
  }
  async function ensureRepo() {                    // before every read / write that the user started
    await initRepo();
    if (repo.status === "ok" && !TEST) {
      try { if ((await repo.dir.queryPermission({ mode: "readwrite" })) !== "granted") repo.status = "prompt"; }
      catch (e) { repo.status = "prompt"; }
    }
    if (repo.status === "ok" && !(await repoAlive())) repo.status = "missing";
    if (repo.status === "ok") return true;
    if (repo.status === "unsupported") { alert("Ez a böngésző nem tud mappába menteni. Használd a Chrome-ot."); return false; }
    if (repo.status === "prompt" && (await grantFolder()) && (await repoAlive())) return true;
    if (repo.status === "prompt" || repo.status === "missing") repo.status = repo.dir && !(await repoAlive()) ? "missing" : repo.status;
    const missing = repo.status === "missing";
    const choice = await askChoice(missing ? "A mappa nem található" : "Válaszd ki a vizsgálat mappáját",
      missing ? `A(z) „${repo.dir.name}” mappát átnevezték, áthelyezték vagy törölték. Válaszd ki újra a vizsgálat mappáját.`
              : "A leletek a Panca vizsgálat közös OneDrive mappájába mentődnek. Válaszd ki ezt a mappát.",
      [["cancel", "Mégse"], ["pick", "Mappa kiválasztása", "primary"]]);
    return choice === "pick" && (await chooseFolder());
  }
  // the folder chosen earlier still exists? (renamed / moved / deleted folders break Chrome's link to it)
  async function repoAlive() {
    if (!repo.dir) return false;
    try { for await (const _ of repo.dir.keys()) break; return true; }
    catch (e) { return e.name === "NotAllowedError" || e.name === "SecurityError"; }   // only a permission question
  }

  /* ---------------- This computer's name (who saved / who is editing) ---------------- */
  function pcName() {
    if (params.get("gep")) return params.get("gep");
    try { return localStorage.getItem("panca-pc") || ""; } catch (e) { return ""; }
  }
  function askPcName() {
    return new Promise((resolve) => {
      const card = $("dlg-card");
      card.replaceChildren(el("div", "dlg-title", "Ennek a gépnek a neve"),
        el("div", "dlg-sub", "A mentéseknél és a „szerkesztés alatt” jelzésnél ez mutatja, melyik gépen dolgoztak. " +
                             "Pl. „Echo labor 1”, „Ambulancia”. Gépenként egyszer kell megadni."));
      const form = el("form"), input = el("input"), err = el("div", "dlg-error");
      input.type = "text"; input.autocomplete = "off"; input.value = pcName();
      const ok = el("button", "primary", "Mentés"), cancel = el("button", "", "Mégse");
      ok.type = "submit"; cancel.type = "button";
      const row = el("div", "dlg-buttons"); row.append(cancel, ok);
      form.append(el("label", "", "Gép neve"), input, err, row);
      card.appendChild(form);
      cancel.addEventListener("click", () => closeDlg(false));
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (!name) { err.textContent = "Adj meg egy nevet."; input.focus(); return; }
        try { localStorage.setItem("panca-pc", name); } catch (e2) { /* private mode */ }
        closeDlg(true);
      });
      dlgAnswer = (answer) => { drawProfile(); resolve(answer === true); };
      openDlg(); input.focus();
    });
  }

  /* ---------------- Reading the folder ---------------- */
  const cache = { patients: null, formMeta: null };
  async function scanPatient(taj, dir) {
    dir = dir || (await patientDir(taj));
    if (!dir) return null;
    const p = { taj, name: "", info: null, exams: [], conflicts: [], locks: {}, broken: [] };
    const jobs = [];
    for await (const [name, h] of dir.entries()) {
      if (h.kind !== "file" || !/\.json$/i.test(name)) continue;
      jobs.push((async () => {
        const r = await readJSON(dir, name);
        if (!r) return;
        if (name === "patient.json") { if (r.data) { p.info = r.data; p.name = r.data.name || ""; } else p.broken.push(name); }
        else if (name.endsWith(LOCK_SUFFIX)) { if (r.data) p.locks[name.slice(0, -LOCK_SUFFIX.length) + ".json"] = r.data; }
        else if (EXAM_RE.test(name)) {
          if (r.data && r.data.format === FORMAT) p.exams.push({ ...r.data, file: name, lastModified: r.lastModified });
          else p.broken.push(name);
        } else if (r.data && (r.data.format === FORMAT || /^patient/i.test(name))) {
          p.conflicts.push({ ...r.data, file: name, lastModified: r.lastModified, isPatientFile: r.data.format !== FORMAT });
        }
      })());
    }
    await Promise.all(jobs);
    const order = (a, b) => (a.exam_date || "").localeCompare(b.exam_date || "") || (a.created_at || "").localeCompare(b.created_at || "");
    p.exams.sort(order); p.conflicts.sort(order);
    if (!p.name) { const any = p.exams.find((e) => e.patient && e.patient.name); if (any) p.name = any.patient.name; }
    return p;
  }
  async function scanRepo() {
    const jobs = [];
    for await (const [name, h] of repo.dir.entries()) {
      if (h.kind === "directory" && /^\d{9}$/.test(name)) jobs.push(scanPatient(name, h));
    }
    const patients = (await Promise.all(jobs)).filter(Boolean);
    patients.sort((a, b) => (a.name || "￿").localeCompare(b.name || "￿", "hu") || a.taj.localeCompare(b.taj));
    cache.patients = patients;
    return patients;
  }
  const cachedPatient = (taj) => (cache.patients || []).find((p) => p.taj === tajDigits(taj)) || null;
  function updateCache(p) {
    if (!cache.patients || !p) return;
    const i = cache.patients.findIndex((x) => x.taj === p.taj);
    if (i >= 0) cache.patients[i] = p; else cache.patients.push(p);
  }
  function activeLock(p, file) {                   // someone ELSE is editing this exam (and the note is fresh)
    const l = p && p.locks[file];
    if (!l || l.pc === pcName()) return null;
    if (Date.now() - Date.parse(l.since || 0) > LOCK_STALE_MS) return null;
    return l;
  }
  async function formMeta() {                      // the form's sections and fields (labels, units) for export / Előzmény
    if (!cache.formMeta) {
      const blank = await (await call("/blank")).json();
      const fields = [];
      for (const sec of blank.form.sections) for (const f of sec.fields) fields.push({ ...f, section: sec.title });
      cache.formMeta = { fields, byKey: Object.fromEntries(fields.map((f) => [f.key, f])) };
    }
    return cache.formMeta;
  }

  /* ---------------- The exam that is open now ---------------- */
  // taj/file: where it is saved (file null = not saved yet); revision: the file's revision when opened / last saved
  const cur = { taj: "", file: null, revision: 0, visit: "", date: localDate(), created_at: "", created_by: "",
                updated_at: "", updated_by: "", lock: null };
  function resetCur() {
    releaseLock();
    Object.assign(cur, { taj: "", file: null, revision: 0, visit: "", date: localDate(), created_at: "", created_by: "",
                         updated_at: "", updated_by: "", lock: null });
  }
  async function writeLock(taj, file) {
    try {
      const dir = await patientDir(taj);
      if (!dir) return;
      await writeJSON(dir, lockName(file), { pc: pcName(), since: new Date().toISOString(), exam: file });
      cur.lock = { taj, file };
    } catch (e) { console.warn("lock", e); }
  }
  function releaseLock() {                         // fire and forget: only our own note is removed
    const l = cur.lock;
    cur.lock = null;
    if (!l || !repo.dir) return;
    (async () => {
      const dir = await patientDir(l.taj);
      if (!dir) return;
      const r = await readJSON(dir, lockName(l.file));
      if (r && r.data && r.data.pc === pcName()) await removeFile(dir, lockName(l.file));
    })().catch((e) => console.warn("unlock", e));
  }
  window.addEventListener("pagehide", releaseLock);

  // a new report (Kézi kitöltés, Lelet beolvasása, or before opening a saved one): nothing saved, no visit yet
  const pageNewReport = newReport;
  newReport = function () { pageNewReport(); resetCur(); };

  // leaving the report for the home page: the editing note goes, the list is read again
  const pageShowScreen = showScreen;
  showScreen = function (name) { if (name === "home") { resetCur(); bpAskedAt = 0; } pageShowScreen(name); };

  // the visit and date count as changes too
  const pageSnapshot = snapshot;
  snapshot = function () { return pageSnapshot() + "|" + cur.visit + "|" + cur.date; };

  const pageRefreshSave = refreshSaveButton;
  refreshSaveButton = function () {
    pageRefreshSave();
    $("save").title = cur.file ? "A vizsgálat mentése (felülírja a mappában lévő fájlját)" : "Mentés a vizsgálat mappájába";
    drawCurState();
  };

  /* ---------------- Visit + date in the Fejléc (next to name and TAJ) ---------------- */
  function visitSelect(value) {
    const sel = el("select");
    sel.append(new Option("— válassz —", ""));
    for (const v of VISITS) sel.append(new Option(v.label, v.id));
    sel.value = value || "";
    return sel;
  }
  // hint under the visit: the expected date, and warnings (visit already exists, date far from the expected one)
  function visitAdvice(p, visit, date, ownFile) {
    const out = { text: "", warn: false, dup: null, off: 0 };
    if (!visit) return out;
    const others = p ? p.exams.filter((e) => e.file !== ownFile) : [];
    const dup = visit !== "egyeb" && others.find((e) => e.visit === visit);
    const base = others.find((e) => e.visit === "baseline");
    const v = VISITS.find((x) => x.id === visit);
    const parts = [];
    if (base && v && v.add) {
      const expected = addDate(base.exam_date, v.add);
      parts.push(`Baseline: ${shownDay(base.exam_date)} → várható ${v.label}: ${shownDay(expected)}`);
      if (date && Math.abs(daysBetween(expected, date)) > v.tol) {
        out.off = daysBetween(expected, date);
        parts.push(`a dátum ${Math.abs(out.off)} nappal ${out.off > 0 ? "később" : "korábban"} van a várhatónál`);
        out.warn = true;
      }
    } else if (v && v.add && p && !base) parts.push("Ennek a betegnek még nincs baseline vizsgálata.");
    if (dup) { out.dup = dup; out.warn = true; parts.push(`már van „${v.label}” vizsgálata (${shownDay(dup.exam_date)})`); }
    out.text = parts.join(" · ");
    return out;
  }
  function drawVisitHint() {
    const hint = document.querySelector(".patient-line .visit-hint");
    if (!hint) return;
    const a = visitAdvice(cachedPatient(state.patient.taj), cur.visit, cur.date, cur.file);
    hint.textContent = a.text;
    hint.classList.toggle("warn", a.warn);
    const sel = document.querySelector(".patient-line select.visit");
    if (sel) sel.classList.toggle("need", !cur.visit);
    drawHistoryButton();
  }
  function drawCurState() {
    const s = document.querySelector(".patient-line .study-state");
    if (!s) return;
    s.textContent = !cur.file ? "Új vizsgálat, még nincs mentve"
      : `Mentve: ${shownTime(cur.updated_at)}${cur.updated_by ? ", " + cur.updated_by : ""}`;
  }
  const pageMakePatientLine = makePatientLine;
  makePatientLine = function () {
    const line = pageMakePatientLine();
    const visit = visitSelect(cur.visit);
    visit.className = "visit"; visit.name = "echo-visit";
    visit.addEventListener("change", () => { cur.visit = visit.value; drawVisitHint(); refreshSaveButton(); });
    const date = el("input");
    date.type = "date"; date.value = cur.date; date.name = "echo-exam-date"; date.max = "2099-12-31";
    date.addEventListener("change", () => { cur.date = date.value; drawVisitHint(); refreshSaveButton(); });
    const lv = el("label", "", "Vizit"), ld = el("label", "", "Vizsgálat dátuma");
    lv.appendChild(visit); ld.appendChild(date);
    line.append(lv, ld, el("span", "study-state"), el("div", "visit-hint"));
    const taj = line.querySelector("#p-taj");
    if (taj) {
      taj.placeholder = "9 számjegy";
      const check = () => taj.classList.toggle("need", !!taj.value.trim() && !tajChecksumOk(taj.value));
      taj.addEventListener("input", () => { drawVisitHint(); });
      taj.addEventListener("blur", check);
      check();
    }
    setTimeout(() => { drawVisitHint(); drawCurState(); });
    return line;
  };

  /* ---------------- Fejléc tick boxes (study only, 2026-11-05) ---------------- */
  // The study needs only Pitvarfibrilláció, Extrasystoles, Szuboptimális echoablak and Sport on view, in one row under
  // the HR row. Háton fekvő, Lélegeztetett and Bedside go into the Eszköz fold (they still work and still reach the
  // report and the Vélemény when ticked; the fold opens by itself when one of them is ticked).
  const HIDDEN_TICKS = ["supine", "ventilated", "bedside"];
  (function studyHeaderLayout() {
    const head = LAYOUT["Fejléc"] || [];
    const ticks = head.find((p) => p && Array.isArray(p.cells) && p.cells.includes("supine"));
    const fold = head.find((p) => p && p.sub === "Eszköz");
    if (!ticks || !fold) { console.warn("Panca: the Fejléc layout changed, tick boxes left as they are"); return; }
    ticks.cells = ticks.cells.filter((k) => !HIDDEN_TICKS.includes(k));
    fold.lines.push(C(...HIDDEN_TICKS));
    fold.sub = "Eszköz, egyéb jelölések";
  })();
  // the page put the ticks in a 3-row block on the right; here they stay one row under HR (Sport keeps its box)
  arrangeHeader = function () {
    const sport = state.fields.sport && state.fields.sport.cell, text = state.fields.sport_text && state.fields.sport_text.cell;
    if (sport && text) {
      const pair = el("div", "sport-pair");
      sport.before(pair);
      pair.append(sport, text);
    }
  };

  /* ---------------- The header button: Előzmény ---------------- */
  function addHistoryButton() {
    if ($("study-history-btn")) return;
    const b = el("button");
    b.id = "study-history-btn";
    b.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>' +
      '<path d="M3 3v5h5M12 7v5l3 2"/></svg><span>Előzmény</span>';
    b.addEventListener("click", () => {
      const taj = tajDigits(state.patient.taj);
      if (taj.length === 9) toggleSide({ kind: "history", key: taj, id: null });
    });
    $("save").before(b);
  }
  function drawHistoryButton() {
    const b = $("study-history-btn");
    if (!b) return;
    const p = cachedPatient(state.patient.taj);
    const n = p ? p.exams.filter((e) => e.file !== cur.file).length + p.conflicts.length : 0;
    b.disabled = n === 0;
    b.title = n ? `A beteg korábbi vizsgálatai (${n}), csak megtekintés` : "Ennek a betegnek nincs másik mentett vizsgálata";
  }

  /* ---------------- Dialog: patient + visit + date (new exam, or saving without them) ---------------- */
  // fixed: an existing patient (name and TAJ not editable). Resolves true when the fields were accepted (cur and
  // state.patient updated), false on Mégse.
  function askExamMeta({ title, sub, okText, fixed }) {
    return new Promise((resolve) => {
      const card = $("dlg-card");
      card.replaceChildren(el("div", "dlg-title", title), el("div", "dlg-sub", sub));
      const form = el("form"), name = el("input"), taj = el("input"), err = el("div", "dlg-error");
      const visit = visitSelect(cur.visit), date = el("input"), hint = el("div", "hint");
      for (const i of [name, taj]) { i.type = "text"; i.autocomplete = "off"; i.spellcheck = false; }
      name.value = state.patient.name; taj.value = tajShown(state.patient.taj); taj.placeholder = "9 számjegy";
      date.type = "date"; date.value = cur.date || localDate(); date.max = "2099-12-31";
      if (fixed) { name.disabled = taj.disabled = true; }
      let badChecksumOk = false;
      const advise = () => {
        const p = cachedPatient(taj.value);
        if (!visit.value && p) {               // the next visit of the schedule that is still missing
          const next = SCHEDULE.find((v) => !p.exams.some((e) => e.visit === v.id));
          if (next) visit.value = next.id;
        }
        const a = visitAdvice(p, visit.value, date.value, cur.file);
        let text = a.text;
        if (!fixed && p && tajDigits(taj.value).length === 9)
          text = `Már van ilyen TAJ a mappában: ${p.name || "(név nélkül)"}, ${p.exams.length} vizsgálat. ` + text;
        hint.textContent = text; hint.classList.toggle("warn", a.warn);
      };
      [taj, visit, date].forEach((i) => i.addEventListener(i === taj ? "input" : "change", () => { badChecksumOk = false; advise(); }));
      const ok = el("button", "primary", okText || "Tovább"), cancel = el("button", "", "Mégse");
      ok.type = "submit"; cancel.type = "button";
      const row = el("div", "dlg-buttons"); row.append(cancel, ok);
      const two1 = el("div", "two"), a1 = el("div"), a2 = el("div"), two2 = el("div", "two"), b1 = el("div"), b2 = el("div");
      a1.append(el("label", "", "Név"), name); a2.append(el("label", "", "TAJ"), taj);
      b1.append(el("label", "", "Vizit"), visit); b2.append(el("label", "", "Vizsgálat dátuma"), date);
      two1.append(a1, a2); two2.append(b1, b2);
      form.append(two1, two2, hint, err, row);
      card.appendChild(form);
      cancel.addEventListener("click", () => closeDlg(false));
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        err.textContent = "";
        const d = tajDigits(taj.value);
        if (!name.value.trim()) { err.textContent = "Add meg a beteg nevét."; name.focus(); return; }
        if (d.length !== 9) { err.textContent = "A TAJ 9 számjegy."; taj.focus(); return; }
        if (!tajChecksumOk(d) && !badChecksumOk) {
          err.textContent = "A TAJ ellenőrző számjegye nem stimmel: elírás? Ha biztosan így helyes, kattints újra.";
          badChecksumOk = true; taj.focus(); return;
        }
        if (!visit.value) { err.textContent = "Válaszd ki a vizitet."; visit.focus(); return; }
        if (!date.value) { err.textContent = "Add meg a vizsgálat dátumát."; date.focus(); return; }
        state.patient = { name: name.value.trim(), taj: d };
        cur.visit = visit.value; cur.date = date.value;
        if ($("p-name")) { $("p-name").value = state.patient.name; $("p-taj").value = d; }
        document.querySelectorAll(".patient-line select.visit").forEach((s) => { s.value = cur.visit; });
        document.querySelectorAll('.patient-line input[type="date"]').forEach((s) => { s.value = cur.date; });
        closeDlg(true);
      });
      dlgAnswer = (answer) => resolve(answer === true);
      openDlg(); advise();
      (fixed ? visit : name.value ? visit : name).focus();
    });
  }

  /* ---------------- Saving ---------------- */
  function allValues() {                           // every box as shown, the calculated ones too (for the export)
    const out = {};
    for (const [key, f] of Object.entries(state.fields)) if (f.input && f.input.value.trim()) out[key] = f.input.value.trim();
    Object.assign(out, valveValues());
    return out;
  }
  function freeName(p, date, visit, keep) {        // <date>_<visit>.json, or _2, _3 ... when taken
    const names = new Set([...(p ? p.exams : []), ...(p ? p.conflicts : [])].map((e) => e.file));
    if (keep) names.delete(keep);
    for (let n = 1; ; n++) {
      const name = `${date}_${visit}${n > 1 ? "_" + n : ""}.json`;
      if (!names.has(name)) return name;
    }
  }
  let saving = false;
  saveReport = async function () {
    if (saving) return false;
    saving = true;
    try { return await doSave(); }
    catch (e) { console.error(e); alert("Nem sikerült a mentés: " + (e && e.message ? e.message : e)); return false; }
    finally { saving = false; }
  };
  async function doSave() {
    if (!(await bloodPressureOk("save"))) return false;
    if (!(await ensureRepo())) return false;
    if (!pcName() && !(await askPcName())) return false;
    const metaOk = state.patient.name.trim() && tajDigits(state.patient.taj).length === 9 && cur.visit && cur.date;
    if (!metaOk || !tajChecksumOk(state.patient.taj)) {
      if (!(await askExamMeta({ title: "Mentés", okText: "Mentés",
            sub: "A vizsgálat mentéséhez kell a beteg neve, TAJ száma, a vizit és a vizsgálat dátuma." }))) return false;
    }
    const taj = tajDigits(state.patient.taj);
    const name = state.patient.name.trim();
    let p = await scanPatient(taj);              // read the folder again now: the other computer may have saved
    const moving = !!cur.file && cur.taj !== taj; // the TAJ was changed on a saved exam: it moves to the other patient
    let file = moving ? null : cur.file;
    let baseRevision = cur.revision, created = { at: cur.created_at, by: cur.created_by };

    // 1. the same exam saved elsewhere in the meantime?
    if (file) {
      const dir = await patientDir(taj);
      const now = dir && (await readJSON(dir, file));
      if (!now || !now.data) {
        const c = await askChoice("A vizsgálat fájlja nem található",
          `A(z) ${file} fájlt időközben áthelyezték vagy törölték a mappából. Mentsem új vizsgálatként?`,
          [["cancel", "Mégse"], ["new", "Mentés új vizsgálatként", "primary"]]);
        if (c !== "new") return false;
        file = null; baseRevision = 0; created = { at: "", by: "" };
      } else if ((now.data.revision || 0) !== cur.revision) {
        const c = await askChoice("Időközben valaki más is mentette",
          `Ezt a vizsgálatot ${now.data.updated_by || "egy másik gép"} mentette ${shownTime(now.data.updated_at)}-kor, ` +
          "miután te megnyitottad. Ha felülírod, az ő változásai elvesznek. Nézd meg az Előzményben, mi van benne.",
          [["cancel", "Mégse"], ["copy", "Mentés külön vizsgálatként"], ["overwrite", "Felülírás", "danger"]]);
        if (c === "cancel" || c === null) return false;
        if (c === "copy") { file = null; baseRevision = 0; created = { at: "", by: "" }; }
        else baseRevision = now.data.revision || 0;
      }
    }
    // 2. another name with this TAJ in the folder?
    if (p && p.name && plain(p.name) !== plain(name)) {
      const c = await askChoice("Más név tartozik ehhez a TAJ-hoz",
        `A mappában a(z) ${tajShown(taj)} TAJ-hoz „${p.name}” tartozik, most „${name}” van beírva.`,
        [["cancel", "Mégse"], ["theirs", `Legyen „${p.name}”`], ["mine", `Legyen „${name}”`, "primary"]]);
      if (c === "cancel" || c === null) return false;
      if (c === "theirs") { state.patient.name = p.name; if ($("p-name")) $("p-name").value = p.name; }
    }
    // 3. visit already exists / date far from the expected one (a label mistake?)
    const advice = visitAdvice(p, cur.visit, cur.date, file);
    const own = file && p && p.exams.find((e) => e.file === file);
    const changedVisit = !own || own.visit !== cur.visit || own.exam_date !== cur.date;
    if (changedVisit && advice.warn) {
      const c = await askChoice("Ellenőrizd a vizitet", advice.text.charAt(0).toUpperCase() + advice.text.slice(1) + ".",
        [["cancel", "Mégse, javítom"], ["save", "Mentés így", "primary"]]);
      if (c !== "save") return false;
    }

    // 4. write: patient folder, patient.json, the exam file (renamed when its date / visit changed)
    const dir = await patientDir(taj, true);
    const keepName = file && file.startsWith(`${cur.date}_${cur.visit}`) ? file : null;
    const target = keepName || freeName(p, cur.date, cur.visit, file);
    const nowIso = new Date().toISOString();
    const b = boxesPayload();
    const exam = {
      format: FORMAT, format_version: 1,
      patient: { name: state.patient.name.trim(), taj },
      visit: cur.visit, visit_label: visitLabel(cur.visit), exam_date: cur.date,
      place: b.place, values: b.values, texts: b.texts, egyeb: b.egyeb,
      all_values: allValues(),
      report_text: $("report").textContent,
      revision: (baseRevision || 0) + 1,
      created_at: created.at || nowIso, created_by: created.by || pcName(),
      updated_at: nowIso, updated_by: pcName(),
      app: buildInfo,
    };
    const pinfo = p && p.info ? { ...p.info } : { taj, created_at: nowIso, created_by: pcName() };
    if (pinfo.name !== exam.patient.name) {
      Object.assign(pinfo, { name: exam.patient.name, taj, updated_at: nowIso, updated_by: pcName() });
      await writeJSON(dir, "patient.json", pinfo);
    }
    await writeJSON(dir, target, exam);
    if (file && target !== file) { await removeFile(dir, file); await removeFile(dir, lockName(file)); }
    if (moving && cur.file) {                     // saved under the new TAJ: the old file goes from the old folder
      const old = await patientDir(cur.taj);
      if (old) { await removeFile(old, cur.file); await removeFile(old, lockName(cur.file)); }
    }
    if (cur.lock && (cur.lock.file !== target || cur.lock.taj !== taj)) releaseLock();
    Object.assign(cur, { taj, file: target, revision: exam.revision, created_at: exam.created_at, created_by: exam.created_by,
                         updated_at: exam.updated_at, updated_by: exam.updated_by });
    if (!cur.lock) await writeLock(taj, target);
    updateCache(await scanPatient(taj));
    state.savedId = target;
    state.savedSnapshot = snapshot();
    refreshSaveButton();
    drawVisitHint();
    toast("Mentve: " + tajShown(taj) + " · " + visitLabel(cur.visit) + " · " + shownDay(cur.date));
    return true;
  }

  /* ---------------- Reminder: the blood pressure (measured lying down) ---------------- */
  // Asked when saving and when going to the Kezdőlap with an exam open but no blood pressure. "Mentés így" /
  // "Tovább" lets a half-done exam be saved; the Kezdőlap path asks only once (not again in its own save).
  let bpAskedAt = 0;                               // the Kezdőlap path already asked (valid until home, max 1 min)
  const bpMissing = () => ["bp_sys", "bp_dia"].some((k) => state.fields[k] && !state.fields[k].input.value.trim());
  async function bloodPressureOk(why) {
    if (Date.now() - bpAskedAt < 60000) { bpAskedAt = 0; return true; }
    if (!bpMissing()) return true;
    const c = await askChoice("Hiányzik a vérnyomás",
      "Ne felejtsd el a fekvő helyzetben mért vérnyomást! Ha a vizsgálat még tart, mentheted most is, és később pótolhatod.",
      [["back", "Vissza, beírom"], ["go", why === "save" ? "Mentés vérnyomás nélkül" : "Tovább a kezdőlapra", "primary"]]);
    if (c === "go") return true;
    const f = state.fields.bp_sys && !state.fields.bp_sys.input.value.trim() ? state.fields.bp_sys : state.fields.bp_dia;
    if (f) {
      const card = f.cell.closest(".card.section");
      if (card && card.classList.contains("collapsed")) setFolded(card, false);
      f.cell.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => f.input.focus(), 300);
    }
    return false;
  }
  // Kezdőlap: asked before the page's own handler (which may then ask to save: that save does not ask again)
  $("home-btn").addEventListener("click", async (e) => {
    if (e.bpChecked || $("result").classList.contains("hidden") || !hasContent() || !bpMissing()) return;
    e.stopImmediatePropagation();
    if (!(await bloodPressureOk("home"))) return;
    bpAskedAt = Date.now();
    const again = new MouseEvent("click", { bubbles: true });
    again.bpChecked = true;
    $("home-btn").dispatchEvent(again);
  }, true);

  /* ---------------- Opening a saved exam for editing ---------------- */
  async function openExam(taj, file, skipLockCheck) {
    if (!(await ensureRepo())) return;
    const p = await scanPatient(taj);
    const exam = p && p.exams.find((e) => e.file === file);
    if (!exam) { alert("A vizsgálat nem található (időközben áthelyezték vagy törölték?)."); loadSaved(); return; }
    const lock = !skipLockCheck && activeLock(p, file);
    if (lock) {
      const c = await askChoice("Szerkesztés alatt",
        `Ezt a vizsgálatot a(z) „${lock.pc}” gépen nyitották meg szerkesztésre (${shownTime(lock.since)}). ` +
        "Ha egyszerre ketten szerkesztik, az egyik munka elveszhet. Ha ott már bezárták, a jelzés hamarosan eltűnik.",
        [["cancel", "Mégse"], ["view", "Csak megtekintés"], ["open", "Megnyitás mégis", "danger"]]);
      if (c === "view") { openSide({ kind: "history", key: taj, id: file }); return; }
      if (c !== "open") return;
    }
    $("place").value = PLACE;
    const res = await call("/render", { values: exam.values || {}, texts: exam.texts || {}, egyeb: exam.egyeb || "",
                                        transcript: "", place: $("place").value });
    const out = await res.json();
    if (!res.ok) { alert(out.error || "Nem sikerült megnyitni."); return; }
    closeSide(); hide("pick"); hide("error");
    newReport();
    state.patient = { name: (exam.patient && exam.patient.name) || p.name || "", taj };
    Object.assign(cur, { taj, file, revision: exam.revision || 0, visit: exam.visit || "", date: exam.exam_date || localDate(),
                         created_at: exam.created_at || "", created_by: exam.created_by || "",
                         updated_at: exam.updated_at || "", updated_by: exam.updated_by || "" });
    updateCache(p);
    showResult({ form: out, report: out.report, transcript: "", full_transcript: "", pauses: [], timing: {}, manual: true });
    restoreValves(exam.values || {});
    state.savedId = file;
    state.savedSnapshot = snapshot();
    refreshSaveButton();
    await writeLock(taj, file);
  }

  // a new exam for a patient (or a new patient): name / TAJ / visit / date first, then the empty form
  async function newExam(p) {
    if (!(await ensureRepo())) return;
    newReport();
    if (p) state.patient = { name: p.name, taj: p.taj };
    const ok = await askExamMeta({ title: p ? "Új vizsgálat" : "Új beteg",
      sub: p ? `${p.name || ""} · ${tajShown(p.taj)}` : "A beteg adatai és a vizit. A név és a TAJ a leletbe nem kerül bele.",
      okText: "Üres űrlap", fixed: !!p });
    if (!ok) { state.patient = { name: "", taj: "" }; return; }
    const patient = { ...state.patient }, visit = cur.visit, date = cur.date;
    try {
      const blank = await (await call("/blank")).json();
      hide("pick"); hide("error");
      state.patient = patient; cur.visit = visit; cur.date = date;
      showResult(blank);
    } catch (e) { fail("Nem sikerült az üres űrlapot betölteni: " + e); }
  }

  /* ---------------- The patient browser on the home page ---------------- */
  const browser = { open: new Set(), closed: new Set(), query: "", timer: null };   // closed: closed by hand during a search
  function ensureBrowser() {
    if ($("study-card")) return;
    const note = el("p", "study-note");
    note.id = "study-note";
    const card = el("div", "card study-card");
    card.id = "study-card";
    const starts = document.querySelector("#pick .starts");
    starts.before(note);
    starts.after(card);
  }
  loadSaved = async function () {
    ensureBrowser();
    await initRepo();
    drawNote();
    drawBrowser(true);
  };
  function drawNote() {
    $("study-note").textContent = "Panca vizsgálati változat. A leletek a kiválasztott (OneDrive) mappába mentődnek, " +
      "a program a böngészőben fut. Segédeszköz, nem orvostechnikai eszköz: a lelet tartalmáért a kitöltő orvos felel.";
  }
  function button(text, cls, onClick, title) {
    const b = el("button", cls || "", text);
    if (title) b.title = title;
    b.addEventListener("click", (e) => { e.stopPropagation(); onClick(e); });
    return b;
  }
  async function drawBrowser(rescan) {
    const card = $("study-card");
    if (!card) return;
    if (repo.status === "unsupported") {
      card.replaceChildren(el("h2", "", "Betegek"), el("div", "sb-warn",
        "Ez a böngésző nem tud mappába menteni. A Panca vizsgálathoz a Chrome-ot használd."));
      return;
    }
    if (repo.status !== "ok") {
      const setup = el("div", "sb-setup");
      if (repo.status === "missing") {
        setup.append(el("div", "sb-warn", `A korábban kiválasztott „${repo.dir.name}” mappa nem található: átnevezték, ` +
                                          "áthelyezték vagy törölték (vagy a OneDrive még nem töltötte le)."),
          el("p", "", "Válaszd ki újra a vizsgálat mappáját (az új nevén vagy helyén). A mentett vizsgálatok a mappában vannak, " +
                      "nem vesznek el."),
          button("Mappa kiválasztása", "primary", async () => { if (await chooseFolder()) drawBrowser(true); }), " ",
          button("Újrapróbálás", "", async () => { repo.status = "ok"; drawBrowser(true); }));
      } else if (repo.status === "prompt") {
        setup.append(el("p", "", `A böngésző újra engedélyt kér a(z) „${repo.dir.name}” mappához (biztonsági okból, ` +
                                 "a böngésző újraindítása után egyszer)."),
          button("Hozzáférés engedélyezése", "primary", async () => { await grantFolder(); drawBrowser(true); }), " ",
          button("Másik mappa", "", async () => { if (await chooseFolder()) drawBrowser(true); }));
      } else {
        setup.append(el("p", "", "Válaszd ki a Panca vizsgálat közös OneDrive mappáját. Ide kerül minden beteg és vizsgálat; " +
                                 "a másik gépen ugyanezt a mappát kell kiválasztani."),
          button("Mappa kiválasztása", "primary", async () => { if (await chooseFolder()) drawBrowser(true); }));
      }
      card.replaceChildren(el("h2", "", "Betegek"), setup);
      return;
    }
    if (rescan || !cache.patients) {
      let err = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try { await scanRepo(); err = null; break; }
        catch (e) {
          err = e;
          // a file or a lock note removed while the folder was being read (the other computer, or this page leaving
          // an exam) also gives NotFoundError: only a folder that is really gone counts as "missing"; else read again
          if (e.name !== "NotFoundError" || !(await repoAlive())) break;
        }
      }
      if (err) {
        const e = err;
        if (e.name === "NotAllowedError" || e.name === "SecurityError") { repo.status = "prompt"; return drawBrowser(false); }
        if (!(await repoAlive())) { repo.status = "missing"; return drawBrowser(false); }
        card.replaceChildren(el("h2", "", "Betegek"), el("div", "sb-warn", "A mappa nem olvasható: " + e.message),
          el("div", "sb-pacts"),
        );
        card.lastChild.append(button("Újrapróbálás", "", () => drawBrowser(true)),
                              button("Másik mappa kiválasztása", "", async () => { if (await chooseFolder()) drawBrowser(true); }));
        return;
      }
    }
    const head = el("div", "sb-head");
    const search = el("input");
    search.type = "search"; search.placeholder = "Keresés: név, TAJ, dátum"; search.value = browser.query;
    search.setAttribute("aria-label", "Keresés a betegek között");
    search.addEventListener("input", () => { browser.query = search.value; browser.closed.clear(); drawList(); });
    head.append(el("h2", "", "Betegek"), search,
      button("Új beteg", "primary", () => newExam(null), "Új beteg első vizsgálata"),
      button("Frissítés", "", () => drawBrowser(true), "A mappa újraolvasása (a másik gép mentései)"),
      button("Exportálás (Excel)", "", exportCsv, "Minden vizsgálat egy táblázatban, vizsgálatonként egy sor"));
    const folder = el("div", "sb-folder");
    folder.append("Mappa: ", el("b", "", TEST ? "teszt (böngészőn belüli)" : repo.dir.name), " · Gép: ", el("b", "", pcName() || "—"),
      button("Gépnév", "link", async () => { await askPcName(); drawBrowser(false); }),
      TEST ? "" : button("Mappa váltása", "link", async () => { if (await chooseFolder()) drawBrowser(true); }));
    const list = el("div");
    list.id = "sb-list";
    card.replaceChildren(head, folder, list);
    drawList();
    drawProfile();
  }
  function drawList() {
    const list = $("sb-list");
    if (!list) return;
    const q = plain(browser.query.trim()), qd = browser.query.replace(/\D/g, "");
    const rows = (cache.patients || []).filter((p) => {
      if (!q) return true;
      const hay = plain([p.name, ...p.exams.map((e) => shownDay(e.exam_date) + " " + e.exam_date + " " + visitLabel(e.visit))].join(" "));
      return hay.includes(q) || (qd.length >= 3 && p.taj.includes(qd));
    });
    list.replaceChildren();
    const conflicts = (cache.patients || []).filter((p) => p.conflicts.length);
    if (conflicts.length) list.append(el("div", "sb-warn",
      `OneDrive ütközési másolat ${conflicts.length} betegnél (piros jelzés). Két gép egyszerre mentette ugyanazt a vizsgálatot: ` +
      "nézd meg mindkét változatot az Előzményben, a helyeset nyisd meg és mentsd, a másolatot töröld a OneDrive mappából."));
    if (!rows.length) {
      list.append(el("div", "sb-empty", (cache.patients || []).length ? "Nincs találat." : "Még nincs beteg a mappában. Új beteg: fent."));
      return;
    }
    for (const p of rows) list.append(patientRow(p, !!q && rows.length <= 3));
  }
  function patientRow(p, autoOpen) {
    const box = el("div", "sb-patient" + (browser.open.has(p.taj) || (autoOpen && !browser.closed.has(p.taj)) ? " open" : ""));
    const row = el("div", "sb-prow");
    const chev = el("span", "chev");
    chev.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
    const chips = el("div", "chips");
    for (const v of SCHEDULE) {
      const e = p.exams.find((x) => x.visit === v.id);
      const c = el("span", "chip" + (e ? " done" : ""), v.label);
      c.title = e ? `${v.label}: ${shownDay(e.exam_date)}` : `${v.label}: még nincs`;
      chips.append(c);
    }
    const extra = p.exams.filter((e) => e.visit === "egyeb").length;
    if (extra) chips.append(el("span", "chip extra", `+${extra} egyéb`));
    const flags = el("div", "pflags");
    const editing = p.exams.map((e) => activeLock(p, e.file)).filter(Boolean);
    if (editing.length) { const t = el("span", "tag edit", "Szerkesztés: " + editing[0].pc); t.title = "Valaki éppen szerkeszti"; flags.append(t); }
    if (p.conflicts.length) flags.append(el("span", "tag conflict", `Ütközés (${p.conflicts.length})`));
    row.append(chev, el("span", "pname", p.name || "(név nélkül)"), el("span", "ptaj", tajShown(p.taj)), chips, flags);
    row.addEventListener("click", () => {
      const open = !box.classList.contains("open");
      box.classList.toggle("open", open);
      if (open) { browser.open.add(p.taj); browser.closed.delete(p.taj); }
      else { browser.open.delete(p.taj); browser.closed.add(p.taj); }
      const table = box.querySelector(".sb-exams");
      if (open && !table) box.append(examsTable(p));
      if (!open && table) table.remove();
    });
    box.append(row);
    if (box.classList.contains("open")) box.append(examsTable(p));
    return box;
  }
  function examsTable(p) {
    const wrap = el("div", "sb-exams");
    const table = el("table"), tb = el("tbody");
    const hr = el("tr");
    for (const h of ["Dátum", "Vizit", "Utolsó mentés", ""]) hr.append(el("th", "", h));
    const thead = el("thead"); thead.append(hr);
    table.append(thead, tb);
    for (const e of [...p.exams].reverse()) {
      const tr = el("tr");
      const lock = activeLock(p, e.file);
      const saved = el("td");
      saved.append(shownTime(e.updated_at), el("div", "meta", (e.updated_by || "") + (lock ? ` · most szerkeszti: ${lock.pc}` : "")));
      const acts = el("td", "acts");
      acts.append(button("Előzmény", "", () => openSide({ kind: "history", key: p.taj, id: e.file }), "Megtekintés, szerkesztés nélkül"),
                  button("Megnyitás", "primary", () => openExam(p.taj, e.file), "Megnyitás szerkesztésre"));
      tr.append(el("td", "", shownDay(e.exam_date)), el("td", "", visitLabel(e.visit)), saved, acts);
      tb.append(tr);
    }
    for (const c of p.conflicts) {
      const tr = el("tr", "conflict");
      const acts = el("td", "acts");
      if (!c.isPatientFile) acts.append(button("Megtekintés", "", () => openSide({ kind: "history", key: p.taj, id: c.file })));
      tr.append(el("td", "", c.exam_date ? shownDay(c.exam_date) : "—"),
                el("td", "", c.visit ? visitLabel(c.visit) : "beteg adatai"),
                el("td", "", "OneDrive ütközési másolat: " + c.file), acts);
      tb.append(tr);
    }
    if (!p.exams.length && !p.conflicts.length) {
      const tr = el("tr"), td = el("td", "meta", "Nincs mentett vizsgálat.");
      td.colSpan = 4; tr.append(td); tb.append(tr);
    }
    wrap.append(table);
    if (p.broken.length) wrap.append(el("div", "sb-warn", "Nem olvasható fájl: " + p.broken.join(", ")));
    const pacts = el("div", "sb-pacts");
    pacts.append(button("Új vizsgálat", "primary", () => newExam(p)));
    wrap.append(pacts);
    return wrap;
  }
  // the list follows the other computer's saves: read again when this window comes back, and every 30 s on the home page
  const homeVisible = () => !$("pick").classList.contains("hidden") && document.visibilityState === "visible";
  document.addEventListener("visibilitychange", () => { if (homeVisible() && repo.status === "ok") drawBrowser(true); });
  setInterval(() => { if (homeVisible() && repo.status === "ok" && $("acct-dlg").classList.contains("hidden")) drawBrowser(true); }, 30000);

  /* ---------------- Előzmény: earlier exams in the side panel, read only ---------------- */
  const pageDrawSide = drawSide;
  drawSide = function () {
    const page = currentPage();
    if (page.kind !== "history") return pageDrawSide();
    $("side-back").classList.toggle("hidden", side.pages.length < 2);
    $("side-search").classList.add("hidden");
    document.body.classList.add("side-wide");
    drawHistory(page);
  };
  async function drawHistory(page) {
    const body = $("side-body");
    const p0 = cachedPatient(page.key);
    $("side-title").textContent = "Előzmény" + (p0 && p0.name ? " · " + p0.name : "");
    if (!body.firstChild) body.replaceChildren(el("div", "small", "Betöltés…"));
    let p, meta;
    try { p = await scanPatient(page.key); meta = await formMeta(); }
    catch (e) { body.replaceChildren(el("div", "sb-warn", "Nem olvasható: " + e.message)); return; }
    if (currentPage() !== page) return;            // the panel moved on while reading
    if (!p) { body.replaceChildren(el("div", "small", "Ennek a betegnek nincs mentett vizsgálata.")); return; }
    updateCache(p);
    $("side-title").textContent = "Előzmény" + (p.name ? " · " + p.name : "");
    const editingHere = cur.file && cur.taj === p.taj && !$("result").classList.contains("hidden");
    const items = [...p.exams.filter((e) => !(editingHere && e.file === cur.file)), ...p.conflicts.filter((c) => !c.isPatientFile)];
    if (!items.length) { body.replaceChildren(el("div", "small", "Nincs másik mentett vizsgálat.")); return; }
    if (page.sel === undefined) page.sel = page.id;
    if (!page.sel || !items.some((e) => e.file === page.sel)) {
      // default: the latest exam before the one being edited (or simply the latest)
      const before = editingHere ? items.filter((e) => !e.isPatientFile && (e.exam_date || "") <= cur.date) : items;
      page.sel = (before[before.length - 1] || items[items.length - 1]).file;
    }
    const exam = items.find((e) => e.file === page.sel);
    const tabs = el("div", "hist-tabs");
    for (const e of items) {
      const isConflict = p.conflicts.includes(e);
      const b = button(`${shownDay(e.exam_date)} ${visitLabel(e.visit)}${isConflict ? " (ütközés)" : ""}`, e.file === page.sel ? "on" : "",
                       () => { page.sel = e.file; drawSide(); });
      tabs.append(b);
    }
    const info = el("div", "hist-meta");
    info.append(el("b", "", `${visitLabel(exam.visit)} · ${shownDay(exam.exam_date)}`), el("span", "hist-ro", "csak megtekintés"),
      el("br"), `Utolsó mentés: ${shownTime(exam.updated_at)}${exam.updated_by ? ", " + exam.updated_by : ""}`,
      el("br"), `Fájl: ${exam.file}`);
    const parts = [tabs, info];
    if (p.conflicts.includes(exam)) parts.push(el("div", "sb-warn",
      "Ez egy OneDrive ütközési másolat: két gép egyszerre mentette ugyanazt a vizsgálatot. Hasonlítsd össze a másik változattal."));
    // the values next to the ones being typed now (same patient)
    const values = exam.all_values || exam.values || {};
    const keys = meta.fields.map((f) => f.key).filter((k) => values[k] !== undefined && values[k] !== "");
    if (keys.length) {
      const sameNow = editingHere || (!$("result").classList.contains("hidden") && tajDigits(state.patient.taj) === p.taj);
      parts.push(el("div", "hist-h", sameNow ? "Értékek: akkor és most" : "Értékek"));
      const t = el("table", "hist-cmp"), hr = el("tr");
      hr.append(el("th", "", ""), el("th", "", shownDay(exam.exam_date)));
      if (sameNow) hr.append(el("th", "", "Most"));
      t.append(hr);
      let section = "";
      for (const k of keys) {
        const f = meta.byKey[k];
        if (f.section !== section) {
          section = f.section;
          const sr = el("tr"), sc = el("th", "", section); sc.colSpan = sameNow ? 3 : 2; sr.append(sc); t.append(sr);
        }
        const tr = el("tr");
        const then = values[k];
        tr.append(el("td", "", f.label + (f.unit ? ` (${f.unit})` : "")), el("td", "", then));
        if (sameNow) {
          const nowF = state.fields[k], now = nowF && nowF.input ? nowF.input.value.trim() : "";
          tr.append(el("td", now && now !== then ? "diff" : "", now || "—"));
        }
        t.append(tr);
      }
      parts.push(t);
    }
    parts.push(el("div", "hist-h", "Lelet"));
    parts.push(el("pre", "report-view" + (exam.place === "KARU" ? " proportional" : ""), exam.report_text || "(üres)"));
    body.replaceChildren(...parts);
  }

  /* ---------------- Export: one row per exam, for Excel ---------------- */
  async function exportCsv() {
    if (!(await ensureRepo())) return;
    let patients, meta;
    try { patients = await scanRepo(); meta = await formMeta(); }
    catch (e) { alert("Nem sikerült az exportálás: " + e.message); return; }
    const exams = [];
    for (const p of patients) {
      for (const e of p.exams) exams.push([p, e, ""]);
      for (const c of p.conflicts) if (!c.isPatientFile) exams.push([p, c, "OneDrive ütközési másolat"]);
    }
    if (!exams.length) { alert("Még nincs mentett vizsgálat."); return; }
    const used = new Set(), textKeys = new Set();
    for (const [, e] of exams) {
      Object.keys(e.all_values || e.values || {}).forEach((k) => used.add(k));
      Object.entries(e.texts || {}).forEach(([k, v]) => { if (v && v.trim()) textKeys.add(k); });
    }
    const keys = [...meta.fields.map((f) => f.key).filter((k) => used.has(k)), ...[...used].filter((k) => !meta.byKey[k]).sort()];
    const labelCount = {};
    meta.fields.forEach((f) => { labelCount[f.label] = (labelCount[f.label] || 0) + 1; });
    const colName = (k) => {
      const f = meta.byKey[k];
      if (!f) return k;
      const label = labelCount[f.label] > 1 ? `${f.section}: ${f.label}` : f.label;
      return `${label}${f.unit ? ` (${f.unit})` : ""} [${k}]`;
    };
    const header = ["TAJ", "Név", "Vizit", "Vizsgálat dátuma", "Utolsó mentés", "Mentette", "Revízió", "Fájl", "Megjegyzés",
                    ...keys.map(colName), ...[...textKeys].map((k) => `Szöveg: ${k}`), "Egyéb"];
    const lines = [header];
    exams.sort((a, b) => (a[0].name || "").localeCompare(b[0].name || "", "hu") || (a[1].exam_date || "").localeCompare(b[1].exam_date || ""));
    for (const [p, e, note] of exams) {
      const v = e.all_values || e.values || {};
      lines.push([tajShown(p.taj), (e.patient && e.patient.name) || p.name, visitLabel(e.visit), e.exam_date || "", shownTime(e.updated_at),
                  e.updated_by || "", String(e.revision || ""), e.file, note,
                  ...keys.map((k) => v[k] || ""), ...[...textKeys].map((k) => (e.texts || {})[k] || ""), e.egyeb || ""]);
    }
    const cell = (s) => { s = String(s == null ? "" : s); return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    // UTF-8 with BOM and ";" between columns: a Hungarian Excel opens it with accents and decimal commas right
    const csv = "﻿" + lines.map((r) => r.map(cell).join(";")).join("\r\n");
    const a = el("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `panca_echo_export_${localDate()}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    toast(`Exportálva: ${exams.length} vizsgálat, ${patients.length} beteg`);
  }

  /* ---------------- Little things ---------------- */
  function toast(text) {
    const t = el("div", "", text);
    t.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;padding:8px 18px;" +
      "border-radius:999px;font:500 13px system-ui,sans-serif;color:#fff;background:var(--accent);box-shadow:0 4px 16px rgba(0,0,0,.2)";
    document.body.append(t);
    setTimeout(() => t.remove(), 3200);
  }
  let buildInfo = "";
  fetch("study/build.txt", { cache: "no-cache" }).then((r) => r.ok ? r.text() : "").then((t) => { buildInfo = t.trim(); }).catch(() => {});
  function drawProfile() {
    $("pp-name").textContent = "Gép: " + (pcName() || "nincs megadva");
    $("pp-sub").textContent = repo.status === "ok" ? "Mappa: " + (TEST ? "teszt" : repo.dir.name) : "Nincs mappa kiválasztva";
    $("acct-name").textContent = pcName() || "Profil";
    if (!$("pp-pc")) {
      const b = button("Gépnév módosítása", "link", async () => { closeProfile(); await askPcName(); if (homeVisible()) drawBrowser(false); });
      b.id = "pp-pc"; b.style.cssText = "display:block;margin:4px 0 0 -6px";
      $("pp-sub").after(b);
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    // static-api.js's version line in the profile panel: say which version this is
    document.querySelectorAll("#profile-panel .pp-sub").forEach((d) => {
      if (/^Nyilvános változat/.test(d.textContent)) d.textContent = d.textContent.replace("Nyilvános változat", "Panca vizsgálati változat");
    });
  });

  $("place").value = PLACE;
  try { localStorage.setItem("place", JSON.stringify({ place: PLACE, day: "study" })); } catch (e) {}
  $("place-ask").classList.add("hidden");
  addHistoryButton();
  initRepo().then(drawProfile);
  // the home page was drawn before this script ran (startAccount → enterHome): draw the browser now
  if (!$("pick").classList.contains("hidden")) loadSaved();
})();
