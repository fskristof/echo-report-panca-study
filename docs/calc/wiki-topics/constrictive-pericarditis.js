// Content for the "Constrictive Pericarditis" wiki topic — lazy-loaded only
// when that topic is opened (see loadWikiTopicBody() in app.js). Metadata
// used by the topic list/search (title, category, summary, keywords,
// sources) stays in wiki-data.js since that's needed eagerly; only the
// heavy body HTML + the figures it embeds live here.
(function () {
  function cpAlgorithmFigure(lang) {
    const t = lang === "hu"
      ? {
        caption: "Az ESC/EACVI diagnosztikus echo algoritmus döntési útja constrictiv pericarditis gyanúja esetén.",
        step1a: "Mitralis E/A > 0,8", step1b: "+ tágult VCI?",
        exit1: "Valószínűtlen",
        step2a: "Kóros légzésfüggő", step2b: "septum elmozdulás?",
        exit2a: "További képalkotás", exit2b: "ha a gyanú fennáll", exit2c: "(CT / kateterezés)",
        step3: "Medialis e′ (septalis)",
        pillCP: "Constrictio", pillMixed: "Kevert", pillRestr: "Restrictio",
        step4a: "Annulus reversus, vagy vena hepatica", step4b: "diasztolés reverz áramlás (kilégzési",
        step4c: "retrográd/antegrád arány ≥ 0,8)?",
        finalCP: "Constrictio", finalMixed: "Kevert",
        yes: "igen", no: "nem",
      }
      : {
        caption: "The ESC/EACVI diagnostic echo algorithm's decision path when constriction is suspected.",
        step1a: "Mitral E/A > 0.8", step1b: "+ dilated IVC?",
        exit1: "Unlikely",
        step2a: "Abnormal respirophasic", step2b: "septal shift?",
        exit2a: "Further imaging", exit2b: "if still suspected", exit2c: "(CT / catheterization)",
        step3: "Medial e′ (septal)",
        pillCP: "Constriction", pillMixed: "Mixed", pillRestr: "RCM",
        step4a: "Annulus reversus, or hepatic vein", step4b: "diastolic reversal (expiratory",
        step4c: "retrograde/antegrade flow ≥ 0.8)?",
        finalCP: "Constriction", finalMixed: "Mixed",
        yes: "yes", no: "no",
      };
    return `
      <figure class="wiki-figure">
        <svg viewBox="0 0 380 572" role="img" aria-label="${t.caption}">
          <defs>
            <marker id="cp-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--text-sub)"></path>
            </marker>
          </defs>
  
          <!-- Step 1 -->
          <rect x="15" y="16" width="220" height="54" rx="10" fill="var(--subtle-bg)" stroke="var(--divider)" stroke-width="1.5"></rect>
          <text x="125" y="38" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text-main)">${t.step1a}</text>
          <text x="125" y="54" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text-main)">${t.step1b}</text>
          <rect x="255" y="16" width="110" height="54" rx="10" fill="var(--subtle-bg)" stroke="var(--divider)" stroke-width="1.5"></rect>
          <text x="310" y="47" text-anchor="middle" font-size="11" fill="var(--text-sub)">${t.exit1}</text>
          <line x1="125" y1="70" x2="125" y2="106" stroke="var(--text-sub)" stroke-width="1.5" marker-end="url(#cp-arrow)"></line>
          <rect x="131" y="82" width="26" height="14" fill="var(--bg)"></rect>
          <text x="144" y="93" text-anchor="middle" font-size="11" fill="var(--text-sub)">${t.yes}</text>
          <line x1="235" y1="43" x2="251" y2="43" stroke="var(--text-sub)" stroke-width="1.5" marker-end="url(#cp-arrow)"></line>
          <rect x="232" y="26" width="26" height="14" fill="var(--bg)"></rect>
          <text x="245" y="37" text-anchor="middle" font-size="11" fill="var(--text-sub)">${t.no}</text>
  
          <!-- Step 2 -->
          <rect x="15" y="110" width="220" height="54" rx="10" fill="var(--subtle-bg)" stroke="var(--divider)" stroke-width="1.5"></rect>
          <text x="125" y="132" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text-main)">${t.step2a}</text>
          <text x="125" y="148" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text-main)">${t.step2b}</text>
          <rect x="255" y="110" width="110" height="64" rx="10" fill="var(--subtle-bg)" stroke="var(--divider)" stroke-width="1.5"></rect>
          <text x="310" y="129" text-anchor="middle" font-size="10" fill="var(--text-sub)">${t.exit2a}</text>
          <text x="310" y="143" text-anchor="middle" font-size="10" fill="var(--text-sub)">${t.exit2b}</text>
          <text x="310" y="157" text-anchor="middle" font-size="10" fill="var(--text-sub)">${t.exit2c}</text>
          <line x1="125" y1="164" x2="125" y2="200" stroke="var(--text-sub)" stroke-width="1.5" marker-end="url(#cp-arrow)"></line>
          <rect x="131" y="176" width="26" height="14" fill="var(--bg)"></rect>
          <text x="144" y="187" text-anchor="middle" font-size="11" fill="var(--text-sub)">${t.yes}</text>
          <line x1="235" y1="137" x2="251" y2="137" stroke="var(--text-sub)" stroke-width="1.5" marker-end="url(#cp-arrow)"></line>
          <rect x="232" y="120" width="26" height="14" fill="var(--bg)"></rect>
          <text x="245" y="131" text-anchor="middle" font-size="11" fill="var(--text-sub)">${t.no}</text>
  
          <!-- Step 3: medial e' three-way split -->
          <rect x="15" y="204" width="220" height="48" rx="10" fill="var(--subtle-bg)" stroke="var(--divider)" stroke-width="1.5"></rect>
          <text x="125" y="233" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text-main)">${t.step3}</text>
  
          <line x1="125" y1="252" x2="70" y2="297" stroke="var(--text-sub)" stroke-width="1.5" marker-end="url(#cp-arrow)"></line>
          <line x1="125" y1="252" x2="190" y2="297" stroke="var(--text-sub)" stroke-width="1.5" marker-end="url(#cp-arrow)"></line>
          <line x1="125" y1="252" x2="310" y2="297" stroke="var(--text-sub)" stroke-width="1.5" marker-end="url(#cp-arrow)"></line>
          <rect x="76" y="264" width="42" height="14" fill="var(--bg)"></rect>
          <text x="97" y="275" text-anchor="middle" font-size="10.5" fill="var(--text-sub)">&gt; 8 cm/s</text>
          <rect x="136" y="264" width="52" height="14" fill="var(--bg)"></rect>
          <text x="162" y="275" text-anchor="middle" font-size="10.5" fill="var(--text-sub)">6–8 cm/s</text>
          <rect x="248" y="264" width="42" height="14" fill="var(--bg)"></rect>
          <text x="269" y="275" text-anchor="middle" font-size="10.5" fill="var(--text-sub)">&lt; 6 cm/s</text>
  
          <rect x="20" y="300" width="100" height="44" rx="10" fill="var(--grade-mild-bg)"></rect>
          <text x="70" y="326" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--grade-mild-text)">${t.pillCP}</text>
          <rect x="140" y="300" width="100" height="44" rx="10" fill="var(--grade-moderate-bg)"></rect>
          <text x="190" y="326" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--grade-moderate-text)">${t.pillMixed}</text>
          <rect x="260" y="300" width="100" height="44" rx="10" fill="var(--grade-severe-bg)"></rect>
          <text x="310" y="326" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--grade-severe-text)">${t.pillRestr}</text>
  
          <!-- Step 4: only reached from the Mixed pill -->
          <line x1="190" y1="344" x2="190" y2="396" stroke="var(--text-sub)" stroke-width="1.5" marker-end="url(#cp-arrow)"></line>
          <rect x="40" y="400" width="300" height="76" rx="10" fill="var(--subtle-bg)" stroke="var(--divider)" stroke-width="1.5"></rect>
          <text x="190" y="418" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-main)">${t.step4a}</text>
          <text x="190" y="432" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-main)">${t.step4b}</text>
          <text x="190" y="446" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-main)">${t.step4c}</text>
  
          <line x1="160" y1="476" x2="115" y2="498" stroke="var(--text-sub)" stroke-width="1.5" marker-end="url(#cp-arrow)"></line>
          <rect x="104" y="482" width="26" height="14" fill="var(--bg)"></rect>
          <text x="117" y="493" text-anchor="middle" font-size="11" fill="var(--text-sub)">${t.yes}</text>
          <line x1="220" y1="476" x2="265" y2="498" stroke="var(--text-sub)" stroke-width="1.5" marker-end="url(#cp-arrow)"></line>
          <rect x="252" y="482" width="26" height="14" fill="var(--bg)"></rect>
          <text x="265" y="493" text-anchor="middle" font-size="11" fill="var(--text-sub)">${t.no}</text>
  
          <rect x="60" y="502" width="110" height="44" rx="10" fill="var(--grade-mild-bg)"></rect>
          <text x="115" y="529" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--grade-mild-text)">${t.finalCP}</text>
          <rect x="210" y="502" width="110" height="44" rx="10" fill="var(--grade-moderate-bg)"></rect>
          <text x="265" y="529" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--grade-moderate-text)">${t.finalMixed}</text>
        </svg>
        <figcaption>${t.caption}</figcaption>
      </figure>
    `;
  }
  
  // Photo figure: ventricular interdependence across the respiratory cycle.
  // The source image (constriction-diagram.png) has had its original Spanish
  // labels erased; the labels here are real HTML text overlaid by percentage
  // position, so they stay crisp and swap with the language toggle instead
  // of being baked into the image.
  function ventInterdependenceFigure(lang) {
    const t = lang === "hu"
      ? {
        caption: "Kamrai interdependencia apnoéban, belégzésben és kilégzésben — a belégzés fokozza a jobb kamrai, a kilégzés a bal kamrai telődést.",
        source: "Forrás",
        apnea: "Apnoe", insp: "Belégzés", exp: "Kilégzés",
        rv: "JK", lv: "BK",
        ivc1: "Vena cava", ivc2: "inferior",
        pv: "Pulmonalis vénák",
      }
      : {
        caption: "Ventricular interdependence across apnea, inspiration, and expiration — inspiration boosts RV filling, expiration boosts LV filling.",
        source: "Source",
        apnea: "Apnea", insp: "Inspiration", exp: "Expiration",
        rv: "RV", lv: "LV",
        ivc1: "Inferior", ivc2: "vena cava",
        pv: "Pulmonary veins",
      };
    return `
      <figure class="wiki-figure">
        <div class="anatomy-figure">
          <img src="./constriction-diagram.png" alt="${t.caption}" loading="lazy">
          <span class="lbl title" style="left:18.9%;top:7.5%;">${t.apnea}</span>
          <span class="lbl title" style="left:50.6%;top:7.5%;">${t.insp}</span>
          <span class="lbl title" style="left:82.0%;top:7.5%;">${t.exp}</span>
          <span class="lbl chamber" style="left:12.6%;top:32.8%;">${t.rv}</span>
          <span class="lbl chamber" style="left:21.9%;top:29.1%;">${t.lv}</span>
          <span class="lbl small" style="left:8.5%;top:92.4%;">${t.ivc1}<br>${t.ivc2}</span>
          <span class="lbl small" style="left:32.7%;top:96.8%;">${t.pv}</span>
        </div>
        <figcaption>${t.caption}<br>${t.source}: <a href="https://doi.org/10.1016/S0304-5412(13)70664-4" target="_blank" rel="noopener">doi.org/10.1016/S0304-5412(13)70664-4</a></figcaption>
      </figure>
    `;
  }

  window.wikiTopicBodies = window.wikiTopicBodies || {};
  window.wikiTopicBodies["constrictive-pericarditis"] = {
    en: `
      <h3>Definition &amp; pathophysiology</h3>
      <p>A chronically thickened, fibrotic — sometimes calcified — pericardium loses its elasticity and encases the heart like a rigid shell, mechanically limiting diastolic filling. Two hemodynamic hallmarks follow:</p>
      <ul>
        <li>Inspiratory drops in intrathoracic pressure don't transmit fully to the encased LA/LV, so LV filling falls with inspiration.</li>
        <li>Exaggerated ventricular interdependence: as LV filling falls, RV filling rises reciprocally — this drives the respirophasic septal shift and the discordant RV/LV systolic pressures.</li>
        <li>Kussmaul's sign (an inspiratory <em>rise</em> in jugular venous pressure, instead of the normal fall) has a separate mechanism: the encased heart is already maximally filled, so it cannot accommodate the extra venous return that inspiration drives forward, and the pressure backs up into the jugular veins. This is why Kussmaul's sign is seen in constriction but not in tamponade.</li>
      </ul>
      <p>Restrictive cardiomyopathy (RCM) produces a similar filling pattern, but from myocardial stiffness rather than pericardial constraint — pericardial compliance is normal, so respiratory pressure changes transmit normally. Telling the two apart matters: constriction is often surgically curable (pericardiectomy).</p>

      <h3>Echocardiographic findings in constriction</h3>
      ${ventInterdependenceFigure("en")}
      <ul>
        <li><strong>2D/M-mode:</strong> septal bounce — an abrupt early-diastolic shift of the septum toward the LV, following the respiratory cycle (most pronounced on the first beat of inspiration); septal "shudder". Adhesions may be visible tethering the ventricular wall, and the pericardium can appear thickened and echodense — but normal pericardial thickness on echo does <em>not</em> exclude constriction — TTE is unreliable for thickness; TEE, CT or MRI are better suited for that.</li>
        <li><strong>Mitral inflow:</strong> E/A &gt; 1.6 in expiration with a deceleration time usually &lt; 160 ms — the established restrictive filling pattern. (The algorithm below enters at the more permissive E/A &gt; 0.8: that is a deliberately sensitive screening threshold, not a description of established constriction.) Peak E velocity falls &ge; 25% on the first beat of inspiration — the Mayo criterion; a looser &gt; 15% is sometimes used, at the cost of specificity. The variation is absent in up to a third of patients with constriction, and unreliable in AF.</li>
        <li><strong>Tricuspid inflow:</strong> peak E velocity rises &gt; 40% with inspiration, reciprocal to the mitral change.</li>
        <li><strong>Hepatic veins:</strong> prominent diastolic flow reversal in expiration — stays reliable even in AF.</li>
        <li><strong>Tissue Doppler (medial e′):</strong> preserved or high (≥ 8–9 cm/s) despite elevated filling pressures — the opposite of restriction. "Annulus reversus": medial e′ ≥ lateral e′, seen in up to 75% of surgically proven constriction.</li>
        <li><strong>Strain:</strong> longitudinal strain preserved, circumferential strain impaired — the reverse pattern from RCM, where longitudinal strain is reduced. Regionally the gradient flips too: the adherent pericardium tethers the lateral wall, so lateral longitudinal strain drops while septal strain stays preserved.</li>
        <li><strong>IVC:</strong> dilated, &lt;50% collapse with sniff — reflects elevated RA pressure but isn't specific to constriction.</li>
      </ul>
      <p class="wiki-callout"><strong>Important! – "annulus reversus":</strong> because annular motion is exaggerated despite high filling pressures, E/e′ should not be used to estimate LV filling pressure in suspected constriction.</p>

      <h3>Constriction vs. restriction — quick comparison</h3>
      <ul>
        <li><strong>Septum:</strong> constriction → respirophasic shift; restriction → absent.</li>
        <li><strong>Medial e′:</strong> constriction → preserved/high (≥8–9 cm/s); restriction → globally reduced.</li>
        <li><strong>Annulus reversus (medial e′ ≥ lateral e′):</strong> constriction → often present; restriction → absent.</li>
        <li><strong>Mitral inflow respiratory variation:</strong> constriction → &ge;25% fall on inspiration (&gt;15% is the looser threshold); restriction → minimal.</li>
        <li><strong>Hepatic vein expiratory diastolic reversal:</strong> constriction → prominent; restriction → minimal.</li>
        <li><strong>Longitudinal strain:</strong> constriction → preserved; restriction → reduced.</li>
        <li><strong>RV/LV systolic pressure with inspiration:</strong> constriction → discordant (opposite directions); restriction → concordant (same direction).</li>
      </ul>

      <h3 id="cp-diagnostic-algorithm">Diagnostic algorithm (ESC/EACVI echo algorithm)</h3>
      ${cpAlgorithmFigure("en")}
      <p><strong>Findings favoring restriction</strong> (when suspicion of a restrictive component persists): DT &lt; 150 ms, IVRT &lt; 50 ms, PV systolic fraction &lt; 40%, E/e′ &gt; 15, LAVI &gt; 48 ml/m².</p>
      <p>When a comprehensive TTE study is diagnostic for constriction, no further testing is usually necessary; cardiac catheterization is reserved for inconclusive or discordant cases.</p>

      <h3>Common causes</h3>
      <p>Post-cardiac surgery, prior radiation therapy, tuberculosis, and recurrent/viral pericarditis are the most common etiologies. Post-radiation cases often show a mixed constriction/restriction pattern.</p>

      <h3>Pitfalls</h3>
      <ul>
        <li>COPD can mimic constriction's respiratory inflow variation, but shows a lower E/A ratio, longer deceleration time, and marked inspiratory forward flow in the SVC (absent in constriction).</li>
        <li>Atrial fibrillation makes mitral inflow variation unreliable — lean on medial e′ and hepatic vein findings instead.</li>
        <li>Normal pericardial thickness on imaging does not exclude constriction.</li>
      </ul>
    `,
    hu: `
      <h3>Definíció és patofiziológia</h3>
      <p>A krónikusan megvastagodott, fibrotikus — néha meszes — pericardium elveszti rugalmasságát, és merev héjként veszi körül a szívet, mechanikusan korlátozva a diasztolés telődést. Ebből két hemodinamikai jellegzetesség következik:</p>
      <ul>
        <li>A belégzés során csökkenő intrathoracalis nyomás nem terjed át teljesen a körülzárt bal pitvarra/kamrára, ezért a bal kamrai telődés belégzéskor csökken.</li>
        <li>Fokozott kamrai interdependencia: ahogy a bal kamrai telődés csökken, a jobb kamrai telődés reciprok módon nő — ez áll a légzésfüggő septum-elmozdulás és a diszkordáns jobb/bal kamrai szisztolés nyomások hátterében.</li>
        <li>A Kussmaul-jel (a jugularis vénás nyomás belégzéskori <em>emelkedése</em> a normális csökkenés helyett) mechanizmusa ettől eltér: a körülzárt szív már maximálisan telt, ezért nem tudja befogadni a belégzés által előrehajtott többlet vénás visszaáramlást, így a nyomás a jugularis vénákra tevődik át. Ezért látunk Kussmaul-jelet constrictióban, de tamponádban nem.</li>
      </ul>
      <p>A restriktív cardiomyopathia (RCM) hasonló telődési mintázatot okoz, de a myocardium merevsége, nem a pericardialis korlátozás miatt — a pericardialis compliance normális, így a légzési nyomásváltozások normálisan terjednek át. A kettő elkülönítése azért fontos, mert a constrictio gyakran sebészileg (pericardectomiával) gyógyítható.</p>

      <h3>Echokardiográfiás jelek constrictióban</h3>
      ${ventInterdependenceFigure("hu")}
      <ul>
        <li><strong>2D/M-mode:</strong> septum "bounce" — a septum hirtelen, korai diasztolés elmozdulása a bal kamra felé, a légzési ciklust követve (a belégzés első ütésében a legkifejezettebb); septalis "shudder". Adhéziók láthatók lehetnek, amik "tartják" a kamrafalat, a pericardium pedig megvastagodottnak és echodenznek tűnhet — de a normális pericardialis vastagság echoval <em>nem</em> zárja ki a constrictiót — a TTE megbízhatatlan a vastagság megítélésében, erre a TEE, CT vagy MRI alkalmasabb.</li>
        <li><strong>Mitralis beáramlás:</strong> E/A &gt; 1,6 kilégzésben, a decelerációs idő általában &lt; 160 ms — ez a kialakult restriktív telődési mintázat. (Az alábbi algoritmus a megengedőbb E/A &gt; 0,8 értéknél lép be: ez szándékosan érzékeny szűrőküszöb, nem a kialakult constrictio leírása.) A csúcs E sebesség &ge; 25%-kal csökken a belégzés első ütésében — ez a Mayo-kritérium; a lazább &gt; 15% is használatos, a specificitás rovására. A variabilitás a constrictiós betegek akár egyharmadánál hiányzik, és pitvarfibrillációban nem megbízható.</li>
        <li><strong>Tricuspidalis beáramlás:</strong> a csúcs E sebesség &gt; 40%-kal nő belégzéskor, reciprok a mitralis változással.</li>
        <li><strong>Vena hepaticák:</strong> kifejezett diasztolés reverz áramlás kilégzéskor — pitvarfibrillációban is megbízható marad.</li>
        <li><strong>Szöveti Doppler (medialis e′):</strong> megtartott vagy magas (≥ 8–9 cm/s) az emelkedett telődési nyomások ellenére — ez az ellenkezője a restrictiónak. "Annulus reversus": medialis e′ ≥ lateralis e′, a sebészileg igazolt constrictiós esetek akár 75%-ában megfigyelhető.</li>
        <li><strong>Strain:</strong> a longitudinális strain megtartott, a circumferentialis strain beszűkült — ez fordított mintázat az RCM-hez képest, ahol a longitudinális strain csökkent. Regionálisan is megfordul a gradiens: a letapadt pericardium megköti a lateralis falat, így a lateralis longitudinális strain csökken, miközben a septalis megtartott marad.</li>
        <li><strong>V. cava inferior:</strong> tágult, &lt;50%-os collapsus szimatolásra (sniff) — emelkedett jobb pitvari nyomást tükröz, de nem specifikus constrictióra.</li>
      </ul>
      <p class="wiki-callout"><strong>Fontos! – "annulus reversus":</strong> mivel az annulus mozgása fokozott a magas telődési nyomások ellenére, az E/e′ hányados nem használható a bal kamrai telődési nyomás becslésére feltételezett constrictio esetén.</p>

      <h3>Constrictio vs. restrictio — gyors összehasonlítás</h3>
      <ul>
        <li><strong>Septum:</strong> constrictio → légzésfüggő elmozdulás; restrictio → hiányzik.</li>
        <li><strong>Medialis e′:</strong> constrictio → megtartott/magas (≥8–9 cm/s); restrictio → globálisan csökkent.</li>
        <li><strong>Annulus reversus (medialis e′ ≥ lateralis e′):</strong> constrictio → gyakran jelen van; restrictio → hiányzik.</li>
        <li><strong>Mitralis beáramlás légzési variabilitása:</strong> constrictio → &ge;25%-os csökkenés belégzéskor (&gt;15% a lazább küszöb); restrictio → minimális.</li>
        <li><strong>Vena hepatica kilégzési diasztolés reverz áramlás:</strong> constrictio → kifejezett; restrictio → minimális.</li>
        <li><strong>Longitudinális strain:</strong> constrictio → megtartott; restrictio → csökkent.</li>
        <li><strong>Jobb/bal kamrai szisztolés nyomás belégzéskor:</strong> constrictio → diszkordáns (ellentétes irányú); restrictio → konkordáns (azonos irányú).</li>
      </ul>

      <h3 id="cp-diagnostic-algorithm">Diagnosztikus algoritmus (ESC/EACVI echo algoritmus)</h3>
      ${cpAlgorithmFigure("hu")}
      <p><strong>Restrictiót valószínűsítő jelek</strong> (ha restriktív komponens gyanúja továbbra is fennáll): DT &lt; 150 ms, IVRT &lt; 50 ms, pulmonalis vénás szisztolés frakció &lt; 40%, E/e′ &gt; 15, LAVI &gt; 48 ml/m².</p>
      <p>Ha egy átfogó TTE vizsgálat diagnosztikus constrictióra, további vizsgálat általában nem szükséges; a szívkatéterezés a nem egyértelmű vagy ellentmondó esetek számára van fenntartva.</p>

      <h3>Gyakori okok</h3>
      <p>A leggyakoribb etiológiák: szívműtét utáni állapot, korábbi sugárkezelés, tuberkulózis, valamint recidiváló/virális pericarditis. A sugárkezelés utáni esetek gyakran kevert constrictiv/restriktiv mintázatot mutatnak.</p>

      <h3>Buktatók</h3>
      <ul>
        <li>A COPD utánozhatja a constrictio légzésfüggő beáramlási variabilitását, de alacsonyabb E/A hányadossal, hosszabb decelerációs idővel és kifejezett belégzési előremenő áramlással jár a vena cava superiorban (ami constrictióban hiányzik).</li>
        <li>Pitvarfibrillációban a mitralis beáramlás variabilitása nem megbízható — ilyenkor a medialis e′-re és a vena hepatica jelekre érdemes támaszkodni.</li>
        <li>A normális pericardialis vastagság képalkotáson nem zárja ki a constrictiót.</li>
      </ul>
    `,
  };
})();
