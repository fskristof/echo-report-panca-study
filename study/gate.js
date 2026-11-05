// A small password screen in front of the study page (loaded in <head>, before the page draws).
// It is a "visual defence" only: it keeps out someone who opens the address by accident. The page is public
// static code, so it is not real access control, and it does not need to be: patient data is never on this site,
// only in the study's OneDrive folder (protected by OneDrive's own sign-in).
// Only a SHA-256 fingerprint of the password is published (build_study.py fills it in from gate_password.txt,
// which is never committed). Once entered, a computer is remembered; changing the password locks every computer again.
(function () {
  "use strict";
  const HASH = "__GATE_HASH__";                       // filled in by build_study.py
  const SALT = "panca-echo-study:";
  const KEY = "panca-gate";
  if (!/^[0-9a-f]{64}$/.test(HASH)) return;           // no password set at build time: no gate
  let ok = false;
  try { ok = localStorage.getItem(KEY) === HASH; } catch (e) { /* private mode: asked every time */ }
  if (ok) return;
  document.documentElement.classList.add("gate-locked");
  const style = document.createElement("style");
  style.textContent =
    "html.gate-locked body > *:not(#gate) { display: none !important; }" +
    "#gate { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 100000;" +
    "  background: var(--bg, #f2f2f7); font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }" +
    "#gate form { background: var(--card, #fff); color: var(--text, #1d1d1f); border-radius: 18px; padding: 30px 30px 24px;" +
    "  width: min(360px, 90vw); box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 6px 24px rgba(0,0,0,.08); text-align: center; }" +
    "#gate img { width: 56px; height: 56px; display: block; margin: 0 auto 12px; }" +
    "#gate h1 { font-size: 1.25rem; margin: 0 0 4px; }" +
    "#gate p { color: var(--muted, #6e6e73); font-size: .875rem; margin: 0 0 18px; }" +
    "#gate input { font: inherit; width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px;" +
    "  border: 0; background: var(--fill-2, rgba(118,118,128,.07)); color: inherit; box-shadow: inset 0 0 0 1px var(--sep, rgba(60,60,67,.16)); }" +
    "#gate input:focus { outline: none; box-shadow: inset 0 0 0 1.5px var(--accent, #1f8a4c); }" +
    "#gate button { font: inherit; font-weight: 600; width: 100%; margin-top: 12px; padding: 10px; border: 0; border-radius: 10px;" +
    "  color: #fff; background: var(--accent, #1f8a4c); cursor: pointer; }" +
    "#gate .err { color: #d70015; font-size: .8125rem; min-height: 1.2em; margin-top: 10px; }";
  document.head.appendChild(style);

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function show() {
    const gate = document.createElement("div");
    gate.id = "gate";
    gate.innerHTML =
      '<form autocomplete="off"><img src="study/logo.svg" alt=""><h1>Panca vizsgálat</h1>' +
      "<p>A program a vizsgálat résztvevőinek szól. Add meg a jelszót (gépenként egyszer kell).</p>" +
      '<input type="password" aria-label="Jelszó" placeholder="Jelszó" autofocus>' +
      '<button type="submit">Belépés</button><div class="err" role="alert"></div></form>';
    document.body.appendChild(gate);
    const form = gate.querySelector("form"), input = gate.querySelector("input"), err = gate.querySelector(".err");
    input.focus();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if ((await sha256(SALT + input.value)) !== HASH) {
        err.textContent = "Hibás jelszó.";
        input.select();
        return;
      }
      try { localStorage.setItem(KEY, HASH); } catch (e2) { /* remembered for this visit only */ }
      gate.remove();
      document.documentElement.classList.remove("gate-locked");
      window.dispatchEvent(new Event("resize"));      // the form fits itself to the window: measure again
    });
  }
  if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
})();
