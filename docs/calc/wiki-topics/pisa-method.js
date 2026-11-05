// Content for the "The PISA method" wiki topic — lazy-loaded only when
// that topic is opened (see loadWikiTopicBody() in app.js). Metadata used
// by the topic list/search (title, category, summary, keywords, sources)
// stays in wiki-data.js since that's needed eagerly; only the heavy body
// HTML + the figure it embeds live here.
(function () {
  // Flow convergence geometry: isovelocity shells above the orifice, the first
  // aliasing boundary highlighted, and the radius drawn where it is actually
  // measured — from that boundary to the vena contracta, not to the leaflet tips.
  // Themed entirely with the app's CSS custom properties, so it follows light/dark.
  function pisaFigure(lang) {
    const t = lang === "hu"
      ? {
        caption: "Az áramlási konvergencia geometriája: az orificium felett azonos sebességű héjak alakulnak ki. A sugarat az első aliasing határtól a vena contractáig mérjük.",
        prox: "BK", dist: "BP",
        alias1: "első aliasing", alias2: "határ",
        orif1: "orificium /", orif2: "vena contracta",
      }
      : {
        caption: "Flow convergence geometry: isovelocity shells form above the orifice. The radius is measured from the first aliasing boundary to the vena contracta.",
        prox: "LV", dist: "LA",
        alias1: "first aliasing", alias2: "boundary",
        orif1: "orifice /", orif2: "vena contracta",
      };
    return `
      <figure class="wiki-figure">
        <svg viewBox="0 0 340 252" role="img" aria-label="${t.caption}">
          <defs>
            <marker id="pisa-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)"></path>
            </marker>
            <marker id="pisa-tick" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--text-sub)"></path>
            </marker>
          </defs>
  
          <text x="22" y="34" font-size="12" font-weight="700" fill="var(--text-sub)">${t.prox}</text>
          <text x="22" y="230" font-size="12" font-weight="700" fill="var(--text-sub)">${t.dist}</text>
  
          <path d="M158,152 L128,240 L212,240 L182,152 Z" fill="var(--accent)" opacity="0.16"></path>
  
          <path d="M52,150 L152,150" stroke="var(--text-main)" stroke-width="5" stroke-linecap="round"></path>
          <path d="M188,150 L288,150" stroke="var(--text-main)" stroke-width="5" stroke-linecap="round"></path>
  
          <path d="M142,150 A28,28 0 0 1 198,150" fill="none" stroke="var(--text-sub)" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7"></path>
          <path d="M126,150 A44,44 0 0 1 214,150" fill="none" stroke="var(--text-sub)" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7"></path>
          <path d="M110,150 A60,60 0 0 1 230,150" fill="none" stroke="var(--accent)" stroke-width="2.5"></path>
  
          <line x1="140" y1="110" x2="159" y2="140" stroke="var(--text-sub)" stroke-width="1.2" marker-end="url(#pisa-tick)" opacity="0.8"></line>
          <line x1="200" y1="110" x2="181" y2="140" stroke="var(--text-sub)" stroke-width="1.2" marker-end="url(#pisa-tick)" opacity="0.8"></line>
  
          <line x1="170" y1="149" x2="170" y2="91" stroke="var(--accent)" stroke-width="1.5" marker-start="url(#pisa-arrow)" marker-end="url(#pisa-arrow)"></line>
          <!-- Label mask: must match .wiki-figure's own background (--subtle-bg),
               NOT --bg. In dark mode --bg is darker than --subtle-bg, so a --bg
               mask shows up as a visible box. -->
          <rect x="174" y="110" width="16" height="18" fill="var(--subtle-bg)"></rect>
          <text x="182" y="124" text-anchor="middle" font-size="13" font-weight="700" font-style="italic" fill="var(--accent)">r</text>
  
          <line x1="232" y1="90" x2="214" y2="105" stroke="var(--accent)" stroke-width="1" opacity="0.7"></line>
          <text x="236" y="84" font-size="10" fill="var(--accent)">${t.alias1}</text>
          <text x="236" y="96" font-size="10" fill="var(--accent)">${t.alias2}</text>
  
          <line x1="238" y1="172" x2="184" y2="154" stroke="var(--text-sub)" stroke-width="1" opacity="0.7"></line>
          <text x="238" y="178" font-size="10" fill="var(--text-sub)">${t.orif1}</text>
          <text x="238" y="190" font-size="10" fill="var(--text-sub)">${t.orif2}</text>
        </svg>
        <figcaption>${t.caption}</figcaption>
      </figure>
    `;
  }

  window.wikiTopicBodies = window.wikiTopicBodies || {};
  window.wikiTopicBodies["pisa-method"] = {
    en: `
      <h3>The principle</h3>
      <p>Blood converging on a small orifice organises itself into shells of equal velocity. Color Doppler draws the shell where velocity equals the aliasing velocity as a sharp color reversal, and that boundary is the one thing in the flow field you can actually measure.</p>
      ${pisaFigure("en")}
      <p>If that shell is a hemisphere, its surface area is 2&pi;r&sup2;, so the flow crossing it is <strong>Q = 2&pi;r&sup2; &times; V<sub>aliasing</sub></strong>. All of that flow then passes through the orifice at the jet's peak velocity, which gives <strong>ERO = Q / V<sub>max</sub></strong> and <strong>Reg. volume = ERO &times; VTI</strong>.</p>
      <p>Two assumptions carry the entire method: <em>the shell is a hemisphere</em>, and <em>the flow crossing it equals the flow through the orifice at that instant</em>. Every limitation below is one of those two failing — which is more useful to remember than the list itself.</p>

      <h3>How to measure it</h3>
      <ol>
        <li>Zoom on the valve and narrow the sector. Frame rate matters more here than field of view.</li>
        <li>Color on, with the smallest box that contains the convergence zone.</li>
        <li>Shift the color baseline <em>in the direction the jet is travelling</em> — downward for a jet moving away from the transducer, which is the usual apical MR and TR case. Target an aliasing velocity of 20–40 cm/s.</li>
        <li>Adjust until the first aliasing boundary is <em>well-defined and hemispherical</em>. That is the goal — not the largest possible convergence zone.</li>
        <li>Freeze and scroll to mid-systole for MR and TR, or early diastole for AR.</li>
        <li>Measure r from the first aliasing boundary to the vena contracta — the narrowest point of the jet, <em>not</em> the leaflet tips.</li>
        <li>CW through the jet, tracing the whole regurgitant envelope: the peak gives V<sub>max</sub>, the traced integral gives the VTI. Whether either is usable comes down to alignment and envelope density — see Limitations. In AF, match beats of similar RR interval, or average several consecutive beats.</li>
      </ol>
      <p class="wiki-callout"><strong>Important!</strong> The radius is squared, so every measurement error is squared with it. At a typical 8–10 mm radius, being 1 mm out moves the ERO by roughly a fifth to a quarter. It is the single largest source of error in the whole calculation, and the one most worth repeating.</p>

      <h3>Valve-specific notes</h3>
      <ul>
        <li><strong>Mitral:</strong> apical 4-chamber or 3-chamber, color baseline shifted down. A visible flow convergence at a Nyquist limit around 50 cm/s is itself a flag for significant MR, before any measurement. The leaflets funnel the converging flow, so the angle it converges through is often nearer 120&deg; than a full hemisphere — see angle correction under Limitations. Secondary MR needs the caveat below.</li>
        <li><strong>Aortic:</strong> the hardest of the three, and the least relied upon — vena contracta width, pressure half-time and holodiastolic reversal in the descending aorta usually carry more weight. Apical 5-chamber or 3-chamber for central jets, parasternal long axis for eccentric ones. Measure in early diastole at the first aliasing. Feasibility is often limited by valve calcification, and the Nyquist limit usually needs raising in apical views to bring the convergence zone to a measurable size.</li>
        <li><strong>Tricuspid:</strong> apical 4-chamber, RV-focused. Velocities are lower — a large convergence zone at a Nyquist limit around 28 cm/s flags significant TR. Tricuspid orifices are often markedly non-circular, particularly in atrial functional TR with annular dilatation, which is where PISA underestimates most.</li>
      </ul>

      <h3>Limitations</h3>
      <p><strong>When the shell isn't a hemisphere:</strong></p>
      <ul>
        <li><strong>Constrained convergence.</strong> When leaflets or a chamber wall bound the inflow, the shell is a wedge rather than a full hemisphere, so assuming 2&pi;r&sup2; credits it with more surface than it has and the flow is overestimated. Correct by multiplying the area by &alpha;/180, where &alpha; is the angle the flow actually converges through — typically around 120&deg; at the mitral valve, and close to 180&deg; in the aortic root, where no correction is needed.</li>
        <li><strong>Non-circular orifices.</strong> The crescentic orifice of secondary MR and the dilated tricuspid annulus both flatten the shell, and PISA underestimates.</li>
        <li>These two act in opposite directions, and in secondary MR both are present at once — the leaflet funnel pushes the number up, the crescentic orifice pushes it down. That is a large part of why PISA is unreliable there, and why the number should not be trusted in isolation.</li>
        <li><strong>Aliasing set wrong.</strong> Too low and the shell is large and distorted by nearby structures; too high and it is so small that a single pixel of measurement error dominates.</li>
      </ul>
      <p><strong>When flow through the shell isn't flow through the orifice:</strong></p>
      <ul>
        <li><strong>Non-holosystolic MR</strong> — prolapse and late-systolic MR in particular. The peak instant is not representative of the whole cycle, so applying it to the whole cycle overestimates severity.</li>
        <li><strong>Secondary (functional) MR.</strong> The orifice is dynamic across systole, typically peaking in early and late systole, so a single mid-systolic frame underestimates the true regurgitant burden.</li>
        <li><strong>Multiple jets.</strong> PISA measures one convergence zone. Adding two PISA-derived orifices together is not a valid way to grade a two-jet valve.</li>
        <li><strong>Atrial fibrillation</strong> and other beat-to-beat variation — match beats of similar RR interval, or average several consecutive beats, and treat any single measurement with suspicion.</li>
      </ul>
      <p><strong>When the CW trace is the problem:</strong></p>
      <ul>
        <li>An eccentric jet that can't be aligned gives an underestimated V<sub>max</sub> and VTI. The direction of the resulting error is worth knowing because it is counterintuitive: V<sub>max</sub> sits in the <em>denominator</em> of ERO, so underestimating it <em>inflates</em> the ERO, while the underestimated VTI <em>deflates</em> the regurgitant volume. The two partly cancel in the regurgitant volume — but not in the ERO, which is left overstated.</li>
        <li>A faint or incomplete CW envelope does the same thing. If you cannot get a full, dense envelope, do not report an ERO from it.</li>
      </ul>

      <h3>When to use something else</h3>
      <ul>
        <li><strong>3D vena contracta area</strong> — direct planimetry of the orifice, which sidesteps the geometric assumption entirely. The best option when the orifice is known to be non-circular.</li>
        <li><strong>Vena contracta width</strong> — simpler and robust for a single central jet, and unaffected by the hemisphere problem.</li>
        <li><strong>Volumetric method</strong> (total SV minus LVOT forward SV) — available, but often inaccurate; treat it as a cross-check rather than a primary number.</li>
      </ul>
      <p>PISA is one input, not a verdict. Grade with it alongside the vena contracta, the jet, the pulmonary or hepatic vein pattern, chamber size and ventricular function — the severity tables behind the calculator's info buttons carry the cutoffs and the supporting signs for each valve.</p>
    `,
    hu: `
      <h3>Az elv</h3>
      <p>A szűk orificium felé konvergáló vér azonos sebességű héjakba rendeződik. A color Doppler éles színátcsapásként rajzolja ki azt a héjat, ahol a sebesség eléri az aliasing sebességet — és ez az egyetlen olyan határ az áramlási térben, amit ténylegesen meg tudunk mérni.</p>
      ${pisaFigure("hu")}
      <p>Ha ez a héj félgömb, akkor a felszíne 2&pi;r&sup2;, tehát a rajta átáramló vérmennyiség <strong>Q = 2&pi;r&sup2; &times; V<sub>aliasing</sub></strong>. Ez a teljes áramlás halad át az orificiumon a jet csúcssebességével, amiből <strong>ERO = Q / V<sub>max</sub></strong>, illetve <strong>Reg. volumen = ERO &times; VTI</strong>.</p>
      <p>Az egész módszert két feltevés tartja: <em>a héj félgömb alakú</em>, és <em>a rajta átáramló mennyiség megegyezik az orificiumon abban a pillanatban átáramló mennyiséggel</em>. Az alább felsorolt összes korlát e kettő valamelyikének a sérülése — ezt érdemesebb megjegyezni, mint magát a felsorolást.</p>

      <h3>A mérés menete</h3>
      <ol>
        <li>Nagyítsunk rá a billentyűre, szűkítsük a szektort. Itt a képfrissítési frekvencia fontosabb, mint a látótér mérete.</li>
        <li>Color Doppler bekapcsolva, a lehető legkisebb box-szal, ami még tartalmazza a konvergencia zónát.</li>
        <li>Toljuk el a color baseline-t <em>a jet haladási irányába</em> — lefelé, ha a jet a transzducertől távolodik, ami a szokásos apicalis MR és TR helyzet. A cél 20–40 cm/s aliasing sebesség.</li>
        <li>Állítsuk addig, amíg az első aliasing határ <em>jól kivehető és félgömb alakú</em> lesz. Ez a cél — nem a lehető legnagyobb konvergencia zóna.</li>
        <li>Fagyasszuk le a képet, és keressük meg a mid-szisztolés (MR, TR), illetve koradiasztolés (AR) fázist.</li>
        <li>Mérjük az r-t az első aliasing határtól a vena contractáig — a jet legszűkebb pontjáig, <em>nem</em> a vitorlavégekig.</li>
        <li>CW Doppler a jeten keresztül, a teljes regurgitációs burkológörbét trace-elve: a csúcs adja a V<sub>max</sub>-ot, a trace integrálja a VTI-t. Hogy bármelyik használható-e, a beállástól és a burkológörbe denzitásától függ — lásd a Korlátokat. Pitvarfibrillációban hasonló RR-távolságú ütéseket mérjünk, vagy átlagoljunk több egymást követő ütést.</li>
      </ol>
      <p class="wiki-callout"><strong>Fontos!</strong> A sugár négyzeten szerepel, így minden mérési hiba is négyzetre emelődik. Egy tipikus 8–10 mm-es sugárnál 1 mm tévedés nagyjából egyötöd–egynegyed résznyit mozdít az ERO-n. Ez a teljes számítás legnagyobb hibaforrása, és ezt éri meg a leginkább megismételni.</p>

      <h3>Billentyű-specifikus megjegyzések</h3>
      <ul>
        <li><strong>Mitralis:</strong> apicalis 4-üregű vagy 3-üregű nézet, a color baseline lefelé tolva. A kb. 50 cm/s-os Nyquist-limitnél is látható áramlási konvergencia önmagában jelzi a szignifikáns MR-t, még bármilyen mérés előtt. A vitorlák tölcsérszerűen szűkítik a konvergáló áramlást, így a konvergencia szöge gyakran inkább 120&deg; körüli, mint teljes félgömb — lásd a szögkorrekciót a Korlátok alatt. A szekunder MR-re a lenti megszorítás vonatkozik.</li>
        <li><strong>Aorta:</strong> a három közül a legnehezebb, és amelyikre a legkevésbé támaszkodunk — a vena contracta szélessége, a nyomásfelezési idő és az aorta descendens holodiasztolés reverz áramlása általában többet nyom a latban. Centrális jetnél apicalis 5-üregű vagy 3-üregű nézet, excentrikusnál parasternalis hossztengely. Koradiasztoléban mérjünk, az első aliasingnál. A kivitelezhetőséget gyakran korlátozza a billentyű meszesedése, és apicalis nézetekben rendszerint emelni kell a Nyquist-limitet, hogy a konvergencia zóna mérhető méretű legyen.</li>
        <li><strong>Tricuspidalis:</strong> apicalis 4-üregű, jobb kamrára fókuszált nézet. A sebességek alacsonyabbak — a kb. 28 cm/s-os Nyquist-limitnél látható nagy konvergencia zóna jelzi a szignifikáns TR-t. A tricuspidalis orificium gyakran kifejezetten nem kör alakú, különösen anulus tágulattal járó pitvari funkcionális TR-ben, és a PISA itt becsül alá a leginkább.</li>
      </ul>

      <h3>Korlátok</h3>
      <p><strong>Ha a héj nem félgömb:</strong></p>
      <ul>
        <li><strong>Korlátozott konvergencia zóna.</strong> Ha a beáramlást vitorlák vagy üregfal határolják, a héj nem teljes félgömb, hanem ék alakú, így a 2&pi;r&sup2; feltételezés nagyobb felszínt tulajdonít neki a valósnál, és túlbecsüli az áramlást. Korrigáljunk úgy, hogy a felszínt megszorozzuk &alpha;/180-nal, ahol &alpha; az a szög, amelyen keresztül az áramlás ténylegesen konvergál — a mitralis billentyűnél jellemzően 120&deg; körül, az aortagyökben viszont közel 180&deg;, ahol nincs szükség korrekcióra.</li>
        <li><strong>Nem kör alakú orificium.</strong> A szekunder MR félhold alakú orificiuma és a tágult tricuspidalis anulus egyaránt ellapítja a héjat, és a PISA alábecsül.</li>
        <li>Ez a kettő ellentétes irányba hat, és szekunder MR-ben egyszerre van jelen — a vitorlatölcsér felfelé, a félhold alakú orificium lefelé tolja az értéket. Nagyrészt ezért megbízhatatlan itt a PISA, és ezért nem szabad az értéket önmagában elfogadni.</li>
        <li><strong>Rosszul beállított aliasing.</strong> Túl alacsonyan a héj nagy lesz, és a környező struktúrák torzítják; túl magasan pedig olyan kicsi, hogy már egyetlen pixelnyi mérési hiba is dominál.</li>
      </ul>
      <p><strong>Ha a héjon átáramló mennyiség nem egyezik az orificiumon átáramlóval:</strong></p>
      <ul>
        <li><strong>Nem holoszisztolés MR</strong> — különösen prolapsus és későszisztolés MR esetén. A csúcspillanat nem reprezentatív az egész ciklusra, így az egész ciklusra vetítve túlbecsüli a súlyosságot.</li>
        <li><strong>Szekunder (funkcionális) MR.</strong> Az orificium a szisztolé során dinamikusan változik, jellemzően a korai és a késői szisztoléban a legnagyobb, ezért egyetlen mid-szisztolés kép alábecsüli a valódi regurgitációs terhet.</li>
        <li><strong>Több jet.</strong> A PISA egyetlen konvergencia zónát mér. Két PISA-ból származó orificium összeadása nem érvényes módja egy kétjetes billentyű megítélésének.</li>
        <li><strong>Pitvarfibrilláció</strong> és egyéb ütésről ütésre változó helyzet — hasonló RR-távolságú ütéseket válasszunk, vagy átlagoljunk több egymást követő ütést, és kezeljünk gyanakvással minden egyetlen mérésből származó értéket.</li>
      </ul>
      <p><strong>Ha a CW görbével van a baj:</strong></p>
      <ul>
        <li>A nem beállítható excentrikus jetnél alábecsüljük a V<sub>max</sub>-ot és a VTI-t. Az ebből adódó hiba iránya azért fontos, mert nem magától értetődő: a V<sub>max</sub> az ERO képletének <em>nevezőjében</em> áll, így az alábecslése <em>felfelé</em> tolja az ERO-t, míg az alábecsült VTI <em>lefelé</em> tolja a regurgitációs volument. A kettő a regurgitációs volumenben részben kiegyenlíti egymást — az ERO-ban viszont nem, az túlbecsült marad.</li>
        <li>A halvány vagy hiányos CW burkológörbe ugyanezt okozza. Ha nem sikerül teljes, denz burkológörbét kapni, ne közöljünk belőle ERO-t.</li>
      </ul>

      <h3>Mikor használjunk mást</h3>
      <ul>
        <li><strong>3D vena contracta terület</strong> — az orificium közvetlen planimetriája, ami teljesen megkerüli a geometriai feltevést. Ez a legjobb választás, ha tudjuk, hogy az orificium nem kör alakú.</li>
        <li><strong>Vena contracta szélesség</strong> — egyszerűbb és megbízható egyetlen centrális jetnél, és nem érinti a félgömb-probléma.</li>
        <li><strong>Volumetrikus módszer</strong> (teljes SV mínusz LVOT forward SV) — rendelkezésre áll, de gyakran pontatlan; kontrollértéknek kezeljük, ne elsődleges számnak.</li>
      </ul>
      <p>A PISA egy adat, nem ítélet. A súlyosságot mindig a vena contractával, a jettel, a pulmonalis vagy vena hepatica mintázattal, az üregek méretével és a szívfunkcióval együtt ítéljük meg — a határértékeket és az egyes billentyűkhöz tartozó kiegészítő jeleket a kalkulátor info gombjai mögötti súlyossági táblázatok tartalmazzák.</p>
    `,
  };
})();
