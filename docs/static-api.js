// The public by-hand version (GitHub Pages, no server). build_public.py puts this file and pyodide/pyodide.js in
// front of index.html's own script. It answers the page's report requests (/render, /velemeny, /import, /blank)
// with the SAME Python code as the full program (page_api.py → report.py, velemeny.py, import_report.py), run here
// in the browser by Pyodide (Python compiled to WebAssembly). Nothing is sent anywhere: everything the doctor types
// stays in this browser tab, and nothing is stored.
window.ECHO_STATIC = true;

(function () {
  // The program's Python files, published next to the page in py/ (build_public.py copies exactly these)
  const FILES = ["fields.py", "hu_numbers.py", "report.py", "velemeny.py", "import_report.py", "page_api.py"];
  const ROUTES = { "/render": "render", "/velemeny": "velemeny", "/import": "import_report", "/blank": "blank" };
  let ready = null;

  function load() {                    // once: start Python, load the program's files; later calls wait for it
    if (!ready) ready = (async () => {
      const py = await loadPyodide({ indexURL: new URL("pyodide/", document.baseURI).href });
      for (const name of FILES) {
        const r = await fetch("py/" + name, { cache: "no-cache" });
        if (!r.ok) throw new Error(`py/${name}: ${r.status}`);
        py.FS.writeFile("/home/pyodide/" + name, await r.text());
      }
      py.runPython([
        "import json, sys",
        "sys.path.insert(0, '/home/pyodide')",
        "import page_api",
        "def _call(name, body):",
        "    status, answer = getattr(page_api, name)(json.loads(body) if body else {})",
        "    return json.dumps([status, answer], ensure_ascii=False)",
      ].join("\n"));
      return py.globals.get("_call");
    })();
    return ready;
  }

  // Answers like the server's fetch() would: { ok, status, json() }
  window.echoStatic = {
    async call(path, body) {
      let status, answer;
      try {
        const pyCall = await load();
        const name = ROUTES[path];
        if (!name) throw new Error("ismeretlen kérés: " + path);
        [status, answer] = JSON.parse(pyCall(name, body === undefined ? "" : JSON.stringify(body)));
      } catch (e) {
        console.error(e);
        status = 500;
        answer = { error: "Hiba a program futásában: " + (e && e.message ? e.message.split("\n").slice(-2).join(" ") : e) };
      }
      return { ok: status < 400, status, json: async () => answer };
    },
    ready: () => load(),
  };

  // A wiki figure that is not published (build_public.py EXCLUDED, e.g. a picture being redrawn for copyright
  // reasons): a short note instead of a broken image and its floating labels
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.closest("#side, .wiki-figure")) return;
    const box = img.closest(".anatomy-figure") || img;
    const note = document.createElement("div");
    note.textContent = "Az ábra hamarosan elérhető (újrarajzolás alatt).";
    note.style.cssText = "padding:18px;border-radius:10px;text-align:center;font-size:13px;" +
      "color:var(--muted,#6e6e73);background:var(--fill,rgba(120,120,128,.12))";
    box.replaceWith(note);
  }, true);

  // Start loading at once; a small notice while Python starts (the first visit downloads about 13 MB, then cached)
  document.addEventListener("DOMContentLoaded", () => {
    // The version in the settings panel (the person icon top right): which program state this page was built from
    const version = document.querySelector('meta[name="echocore-version"]');
    const panel = document.getElementById("profile-panel");
    if (version && panel) {
      const line = document.createElement("div");
      line.className = "pp-sub";
      line.style.cssText = "display:block;margin-top:8px";
      line.textContent = "Nyilvános változat · " + version.content;
      panel.append(line);
    }
    const note = document.createElement("div");
    note.id = "static-loading";
    note.textContent = "A program betöltése…";
    note.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;padding:7px 16px;" +
      "border-radius:999px;font:500 13px system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.72);pointer-events:none";
    document.body.append(note);
    load().then(() => note.remove(), (e) => {
      note.textContent = "A program nem tudott elindulni ebben a böngészőben: " + (e && e.message ? e.message : e);
      note.style.background = "#c62828";
    });
  });
})();
