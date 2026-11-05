// Echo Wiki topic METADATA — title, category, summary, keywords, sources.
// Split out of index.html per the deferred-work note that used to live
// here — this file only holds data, no render logic; the interactive
// list/search/routing logic (renderWikiList, openWikiTopic, goWiki, etc.)
// stays in app.js since it depends on that file's state/translations/DOM
// helpers. Loaded before app.js (see index.html) so wikiTopics/
// wikiCategories exist by the time app.js's own top-level code runs. Must
// be listed in sw.js PRECACHE_URLS with the same version-bump discipline
// as index.html, or offline users get an app with an empty wiki.
//
// A topic's `body` (the heavy part — prose + inline-SVG figures) is NOT
// here. It's lazy-loaded on demand from wiki-topics/<id>.js (see
// loadWikiTopicBody() in app.js) so the app doesn't have to download and
// parse every topic's full HTML on every launch as the wiki grows — only
// this metadata is eager. Each wiki-topics/<id>.js is still listed in
// sw.js PRECACHE_URLS, so it's downloaded up front during install/update
// same as before and works fully offline; "lazy" here only means "not
// parsed into the page until opened," not "not on the phone yet."
// Trade-off: search (wikiTopicMatchesQuery in app.js) can only match
// title/keywords/summary for a topic whose body hasn't been opened this
// session — it can no longer scan body text it hasn't loaded. Give a
// topic thorough `keywords` to compensate for anything important that
// only appears in the body prose.

// ---- Echo Wiki ----
// Add new topics here as they're written — each needs a stable id, a
// category (must match a wikiCategories id below), and a title. Two
// shapes, controlled by `kind` (optional, defaults to "deep"):
//   kind: "deep" — full entry: optional summary, optional table, body,
//         sources. body (in wiki-topics/<id>.js) is raw HTML (wrapped in
//         .wiki-body), so <p>, <h3>, <ul>/<li>, <ol>, .wiki-figure,
//         .wiki-callout, and .info-table-wrap/.info-table (via
//         buildSeverityTable()) all work. No <h2>/<h4>.
//   kind: "card" — quick card: summary (+ optional table), no body at all
//         (no wiki-topics/<id>.js file needed).
// `summary` is the "at the machine" block rendered above the body (deep)
// or as the main content (card): an array of short plain strings, same
// language order and *line count* on both sides — not an HTML string, so
// it can't quietly grow into a paragraph and so EN/HU parity is a simple
// length check (see auditWikiTopics). Inline <strong> is fine; no block
// elements.
// `keywords` (optional) extends what the list-view search matches beyond
// the title — see the search trade-off note above.
// Topics render in category order (see wikiCategories), then array order
// within a category; card rows get a small "Card" chip so it's clear
// before opening whether it's five lines or a full entry.
//
// Example entries:
// { id: "pisa", category: "methods", kind: "deep", reviewed: "2026-08",
//   title:    { en: "The PISA method", hu: "A PISA módszer" },
//   summary:  { en: ["Set aliasing 15–40 cm/s...", "..."], hu: ["...", "..."] },
//   keywords: { en: ["pisa", "eroa"], hu: ["pisa", "eroa"] },
//   sources: [
//     { url: "https://...", label: { en: "...", hu: "..." } },
//     { label: { en: "Textbook ref, no URL", hu: "Könyv hivatkozás, URL nélkül" } },
//   ] }
//   // ...and a matching wiki-topics/pisa.js:
//   //   window.wikiTopicBodies["pisa"] = { en: "<p>...</p>", hu: "<p>...</p>" };
// { id: "continuity-equation", category: "methods", kind: "card",
//   title: { en: "The continuity equation", hu: "A kontinuitási egyenlet" },
//   summary: { en: ["..."], hu: ["..."] } }

// Deferred work, recorded so it isn't rediscovered later — check this list
// when adding a new topic, since several of these trigger on topic count.
//   - Cross-link severityInfo (MR/AR/TR/AS) and wikiTopics: a
//     `wikiTopic: "<id>"` field on a severity entry, rendering a "read
//     more" link at the bottom of the info overlay. Natural once a valve
//     topic exists.
//   - constriction-diagram.png's labels are brittle: absolutely positioned
//     by hardcoded percentage over a raster image, with a fixed dark
//     label color because the image background doesn't invert in dark
//     mode. Recropping/replacing the image silently misaligns every
//     label. If a second photo figure is ever needed, prefer a themed
//     inline SVG like cpAlgorithmFigure instead — none of these problems.

// Wiki categories, in list display order. A topic whose `category` is
// missing or unknown falls into the "other" bucket, rendered last.
const wikiCategories = [
  { id: "methods",      label: { en: "Methods & measurement", hu: "Módszerek és mérés" } },
  { id: "pericardium",  label: { en: "Pericardium",   hu: "Pericardium" } },
  { id: "valves",       label: { en: "Valves",        hu: "Billentyűk" } },
  { id: "myocardium",   label: { en: "Myocardium",    hu: "Myocardium" } },
  { id: "right-heart",  label: { en: "Right heart",   hu: "Jobb szív" } },
  { id: "hemodynamics", label: { en: "Haemodynamics", hu: "Hemodinamika" } },
  { id: "aorta",        label: { en: "Aorta",         hu: "Aorta" } },
  { id: "other",        label: { en: "Other",         hu: "Egyéb" } },
];

// The inline-SVG figure builders topics embed (cpAlgorithmFigure,
// ventInterdependenceFigure, pisaFigure) now live alongside the topic that
// uses them, in wiki-topics/<id>.js — see the comment above wikiTopics'
// body field below for why.
const wikiTopics = [
  {
    id: "constrictive-pericarditis",
    category: "pericardium",
    reviewed: "2026-08",
    title: { en: "Constrictive Pericarditis", hu: "Constrictiv Pericarditis" },
    summary: {
      en: [
        "Respirophasic septal shift is the entry finding — look for it on the first beat of inspiration.",
        "Medial e′ preserved or high (&ge; 8–9 cm/s), often exceeding lateral e′ — “annulus reversus”.",
        "Hepatic vein expiratory diastolic flow reversal; stays reliable in AF, unlike mitral inflow variation.",
        "<strong>Do not use E/e′ to estimate filling pressure here</strong> — annular motion is exaggerated despite high pressures.",
        "Longitudinal strain preserved, circumferential impaired — the reverse of restrictive cardiomyopathy.",
        '<button type="button" class="wiki-inline-link" data-scroll-target="cp-diagnostic-algorithm">Diagnostic algorithm</button>',
      ],
      hu: [
        "A légzésfüggő septum-elmozdulás a belépő jel — a belégzés első ütésében keressük.",
        "A medialis e′ megtartott vagy magas (&ge; 8–9 cm/s), gyakran meghaladja a lateralist — „annulus reversus”.",
        "Vena hepatica kilégzési diasztolés reverz áramlás; pitvarfibrillációban is megbízható, a mitralis beáramlással ellentétben.",
        "<strong>Az E/e′ itt nem használható a telődési nyomás becslésére</strong> — az annulus mozgása a magas nyomások ellenére fokozott.",
        "A longitudinális strain megtartott, a circumferentialis beszűkült — fordítva, mint restriktív cardiomyopathiában.",
        '<button type="button" class="wiki-inline-link" data-scroll-target="cp-diagnostic-algorithm">Diagnosztikus algoritmus</button>',
      ],
    },
    sources: [
      {
        url: "https://www.cardioserv.net/constrictive-pericarditis-vs-restrictive-cardiomyopathy-echo-findings/",
        label: { en: "Cardioserv — Constrictive Pericarditis vs Restrictive Cardiomyopathy", hu: "Cardioserv — Constrictive Pericarditis vs Restrictive Cardiomyopathy" },
      },
      {
        url: "https://www.escardio.org/communities/councils/cardiology-practice/scientific-documents-and-publications/ejournal/volume-15/Constrictive-pericarditis-role-of-echocardiography-and-magnetic-resonance-imaging/",
        label: { en: "ESC e-Journal — Constrictive pericarditis: role of echocardiography and MRI", hu: "ESC e-Journal — Constrictive pericarditis: role of echocardiography and MRI" },
      },
      {
        label: { en: "EACVI Imaging Summer School, Graz 2026 (slide reference)", hu: "EACVI Imaging Summer School, Graz 2026 (dia hivatkozás)" },
      },
    ],
  },
  {
    id: "pisa-method",
    category: "methods",
    kind: "deep",
    reviewed: "2026-08",
    title: { en: "The PISA method", hu: "A PISA módszer" },
    keywords: {
      en: ["pisa", "eroa", "ero", "regurgitant volume", "flow convergence", "aliasing", "nyquist"],
      hu: ["pisa", "eroa", "ero", "regurgitációs volumen", "áramlási konvergencia", "aliasing", "nyquist"],
    },
    summary: {
      en: [
        "Zoom the valve, shift the color baseline in the direction of the jet, aliasing 20–40 cm/s.",
        "Measure <strong>r</strong> from the first aliasing boundary to the vena contracta — mid-systole for MR/TR, early diastole for AR.",
        "<strong>r is squared:</strong> 1 mm of error moves ERO by 20–27% at a typical 8–10 mm radius. Measure it twice.",
        "Trace the whole CW envelope; a misaligned or faint trace underestimates Vmax and VTI. In AF, match beats of similar RR interval or average several consecutive beats.",
        "Invalid for multiple jets. Overestimates when the regurgitation is not holosystolic.",
      ],
      hu: [
        "Nagyítsunk rá a billentyűre, toljuk el a color baseline-t a jet irányába, aliasing 20–40 cm/s.",
        "Az <strong>r</strong>-t az első aliasing határtól a vena contractáig mérjük — MR/TR esetén mid-szisztoléban, AR esetén koradiasztoléban.",
        "<strong>Az r négyzeten szerepel:</strong> 1 mm mérési hiba 20–27%-kal mozdítja el az ERO-t egy tipikus 8–10 mm-es sugárnál. Mérjük meg kétszer.",
        "A teljes CW burkológörbét trace-eljük; a rossz beállás vagy a halvány burkológörbe alábecsüli a Vmax-ot és a VTI-t. Pitvarfibrillációban hasonló RR-távolságú ütéseket mérjünk, vagy átlagoljunk több egymást követő ütést.",
        "Több jet esetén nem érvényes. Túlbecsül, ha a regurgitáció nem holoszisztolés.",
      ],
    },
    sources: [
      {
        url: "https://academic.oup.com/ehjcimaging/article/14/7/611/2465068",
        label: {
          en: "EACVI — Recommendations for the echocardiographic assessment of native valvular regurgitation (executive summary)",
          hu: "EACVI — Ajánlás a natív billentyű-regurgitáció echokardiográfiás megítéléséhez (vezetői összefoglaló)",
        },
      },
      {
        url: "https://www.sciencedirect.com/science/article/pii/S089473171730007X",
        label: {
          en: "ASE — Recommendations for Noninvasive Evaluation of Native Valvular Regurgitation (Zoghbi et al.)",
          hu: "ASE — Ajánlás a natív billentyű-regurgitáció noninvazív megítéléséhez (Zoghbi és mtsai)",
        },
      },
      {
        url: "https://www.cardioserv.net/echo-mr-pisa/",
        label: {
          en: "Cardioserv — A complete guide to performing MR PISA",
          hu: "Cardioserv — Teljes útmutató az MR PISA kivitelezéséhez",
        },
      },
    ],
  },
];

// Dev guard: EN/HU should carry the same numbers, and a summary's two
// language arrays should have the same line count. A mismatch almost
// always means one language got edited and the other didn't — the single
// largest maintenance risk here, since every fact exists twice. Topics
// lacking a summary are skipped for that check rather than erroring; a
// topic with *one* language present and the other missing is a genuine
// contract violation and is left to throw loudly instead of being
// silently swallowed. Console-only, dev-gated — never runs for production
// users.
//
// The body half of this check (EN/HU numeric drift) can no longer run for
// every topic up front, since body now lives in wiki-topics/<id>.js and is
// only loaded once that topic is opened — see auditTopicBody() below,
// called from loadWikiTopicBody() in app.js right after a body loads.
const wikiDevMode = location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.search.includes("audit");

function wikiNumberTokens(html) {
  return (html
    .replace(/<[^>]*>/g, " ")
    .replace(/(\d),(\d)/g, "$1.$2")
    .match(/\d+(?:\.\d+)?/g) || []).sort().join(" ");
}

function auditWikiTopics() {
  wikiTopics.forEach(t => {
    if (t.summary) {
      const enLen = t.summary.en.length, huLen = t.summary.hu.length;
      if (enLen !== huLen) {
        console.warn(`[wiki] summary line-count mismatch in "${t.id}": en=${enLen} hu=${huLen}`);
      }
    }
  });
}
if (wikiDevMode) auditWikiTopics();

// HU decimal commas are normalised to dots first. SVG coordinates appear in
// both bodies identically, so they cancel out.
function auditTopicBody(id, body) {
  if (!wikiDevMode) return;
  const en = wikiNumberTokens(body.en), hu = wikiNumberTokens(body.hu);
  if (en !== hu) {
    console.warn(`[wiki] numeric drift in "${id}"\n  en: ${en}\n  hu: ${hu}`);
  }
}
