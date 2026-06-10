// =====================================================================
// QuoteBoids — „Ptáčci nosí citát"
// ---------------------------------------------------------------------
// Hejno procedurálně kreslených ptáčků po jednom přináší písmena
// náhodně vybraného citátu a pokládá je na předpočítané pozice.
// Inspirace mechanikou ze hry Bounty Bob (Atari 800 XL).
// Čistý p5.js, žádné externí obrázky ani knihovny, vše v jednom souboru.
// =====================================================================

// =====================================================================
// CONFIG — všechny laditelné hodnoty na jednom místě
// =====================================================================
const CONFIG = {

  // --- Plátno a scéna ---
  scene: {
    fullscreen: true,
    defaultMode: "night",          // "night" | "day" — výchozí je noc
    modeTransitionMs: 1200,        // délka plynulého přechodu den/noc
    starCount: 130,                // počet hvězd v nočním režimu
    autoNextMs: 25000,             // režim spořiče: po složení citátu a tolika
                                   // ms klidu se sám spustí další (0 = vypnuto)
    celestialX: 90,                // pozice měsíce/slunce (vlevo nahoře,
    celestialY: 140,               // kousek níž, ať nekoliduje s ovládáním)
  },

  // --- Nebe: vzácné odměny za dlouhé koukání ---
  sky: {
    meteorMsMin: 20000,            // min pauza mezi padajícími hvězdami (noc)
    meteorMsMax: 55000,            // max pauza
    meteorDurMs: 1200,             // jak dlouho meteor letí
    cloudCount: 3,                 // počet pomalu plujících obláčků (den)
    cloudAlpha: 36,                // průhlednost obláčků (jemné!)
    flockMsMin: 25000,             // min pauza mezi přelety hejna v dálce (den)
    flockMsMax: 60000,             // max pauza
    flockSizeMin: 7,               // kolik ptáků v dálkovém hejnu (min)
    flockSizeMax: 13,              // (max)
  },

  // --- Peříčka při dopadu písmene (vzácná, ať se na ně divák těší) ---
  feathers: {
    dropChance: 0.3,               // šance, že se při položení písmene uvolní
    perchChance: 0.25,             // šance při dosednutí na hrad
    durMsMin: 2200,                // jak dlouho se peříčko snáší (min)
    durMsMax: 3800,                // (max)
  },

  // --- Břečťan kolem složeného citátu (FEATURE FLAG) ---
  ivy: {
    enabled: true,               // zapnout/vypnout celou dekoraci břečťanu
    perchDecor: true,            // pár lístků i na koncích bydýlka
    growDelayMs: 2600,           // start růstu po složení citátu (po autorovi)
    fadeMs: 800,                 // rozplynutí při odchodu scény
    margin: 26,                  // bezpečný odstup od citátu i autora
    seed: null,                  // pevný seed pro reprodukovatelnost (null = náhodně)
    // layout se vybírá náhodně (nikdy stejný dvakrát po sobě):
    //   "single" — jedna větvička (pod citátem / po straně)
    //   "multi"  — víc větviček kolem
    //   "wreath" — klikatý věnec kolem dokola (A a B kousek od sebe)
    //   "behind" — elipsa ZA písmeny; písmena dostanou obrys, aby kontury
    //              zůstaly ostré a čitelné
    sideMinSpace: 130,           // místo vedle citátu nutné pro boční větvičku
    wreathPoints: 12,            // počet kontrolních bodů věnce/elipsy
    padMin: 8,                   // odsazení věnce od obdélníku textu (min)
    padMax: 16,                  // (max)
    gapRadMin: 0.3,              // mezera mezi A a B (radiány obvodu, min)
    gapRadMax: 0.6,              // (max)
    jitterOut: 14,               // klikatost — náhodné vyhnutí bodů SMĚREM VEN
    // růst
    growMs: 1000,                // za jak dlouho se namaluje CELÁ větvička
    leafGrowMs: 450,             // klíčení listu: scale 0 → 1 (s overshootem)
    // stonek
    stemThickness: 4,            // tloušťka stonku u báze (ke špičce se zužuje)
    waveAmplitude: 7,            // oscilace stonku kolem vodící linky (px)
    waveFrequency: 0.011,        // frekvence oscilace (cyklů na px délky)
    speckleEvery: 9,             // rozestup zrnitých teček na stonku (px)
    // listy
    leafSpacing: 56,             // průměrný rozestup listů podél stonku (px)
    leafSize: 26,                // základní velikost listu (px)
    leafSizeVar: 0.25,           // ± náhodná variance velikosti
    leafTipShrink: 0.55,         // listy u špičky úponku menší (násobek)
    rotJitterDeg: 15,            // náhodné pootočení listu (±°)
    // barvy podle předlohy (variegated šedozelený břečťan)
    stemColor: "#8A6A4F",        // hnědý stonek
    stemDark: "#54402E",         // tmavé tečkování + obrys stonku
    stemLight: "#C9AE93",        // světlé tečkování stonku
    leafFillLight: "#CFE3CE",    // základní světle šedozelená výplň
    leafFillDark: "#92AF95",     // tmavší skvrny variegace
    veinColor: "#F2F7EE",        // skoro bílé žilky (+ světlé skvrnky)
    outlineColor: "#2A2A22",     // tmavý obrys listů
  },

  // --- Pérování větvičky (tlumený oscilátor) ---
  perchSpring: {
    stiffness: 0.025,              // tuhost pružiny (vyšší = rychlejší kmit)
    damping: 0.06,                 // útlum (vyšší = dřív se uklidní)
    landKick: 1.0,                 // impuls dolů při dosednutí ptáčka
    takeoffKick: -0.6,             // impuls nahoru při vzletu
  },

  // --- Ptáčci: počet a chování ---
  birds: {
    count: 6,                      // počet ptáčků v hejnu
    spawnStaggerMsMin: 200,        // min odstup prvních spawnů na začátku
    spawnStaggerMsMax: 1500,       // max odstup prvních spawnů
    waitMsMin: 1000,               // min čekání mimo obrazovku mezi písmeny
    waitMsMax: 4000,               // max čekání mimo obrazovku
  },

  // --- Let: fyzika (jednotky px/frame při 60 fps) ---
  flight: {
    maxSpeed: 6.0,                 // cestovní rychlost
    acceleration: 0.15,            // limit steeringu při letu (široké oblouky)
    deceleration: 0.22,            // limit steeringu při brzdění/přistávání
    arriveRadius: 110,             // minimální vzdálenost, kdy začíná landing
    // Brzdná dráha se počítá z AKTUÁLNÍ rychlosti (v²/2a) — rychlý ptáček
    // začne brzdit dřív, pomalý později; žádné „ze 100 na 0 za pikosekundu".
    brakeSafety: 1.7,              // rezerva nad čistě fyzikální brzdnou dráhu
    brakeMin: 50,                  // minimální brzdná dráha (px)
    spawnSpeed: 2.0,               // počáteční rychlost po spawnu
    snapDist: 3,                   // jak blízko u cíle se „doklapne" na místo
  },

  // --- Animace: mávání křídel ---
  wings: {
    flapFreqCruise: 0.11,          // frekvence mávání při letu (cyklů/frame)
    flapFreqLanding: 0.26,         // intenzivnější mávání při přistávání
    flapAmplitude: 0.9,            // rozsah mávání (rad)
    bodyTiltCruise: 0.1,           // mírný náklon těla při letu
    bodyTiltLanding: -0.45,        // hlava nahoru / tělo proti směru při brzdění
  },

  // --- Plynulé přechody animace mezi stavy (žádné skoky pózy) ---
  anim: {
    tiltEase: 0.10,              // dojíždění náklonu těla a úhlu letu (podíl/frame)
    flapEase: 0.12,              // dojíždění frekvence a rozsahu mávání
    turnEase: 0.15,              // rychlost otočky (zrcadlení přes squash v ose X)
  },

  // --- Ptáček: rozměry vektorové grafiky (px) ---
  birdShape: {
    bodyLength: 26,
    bodyWidth: 14,
    headRadius: 7,
    beakLength: 7,
    wingLength: 22,
    legLength: 10,
  },

  // --- Časování jednotlivých stavů (ms) ---
  timing: {
    dropMs: 380,                   // pauza ve stavu dropping (upouštění písmene)
    turnMs: 320,                   // délka otočky před odletem
    letterFallMs: 240,             // jak dlouho padá písmeno z pacek na místo
    stretchMs: 950,                // délka protažení na hradě
    authorFadeMs: 1600,            // fade-in autora po složení citátu
  },

  // --- Idle na hradě ---
  perch: {
    headTurnMsMin: 1500,           // jak často (min) otáčí hlavu
    headTurnMsMax: 4000,           // jak často (max)
    stretchChance: 0.15,           // šance na protažení při každém idle cyklu
    stepShuffleAmplitude: 2,       // amplituda přešlapování (px)
    blinkMsMin: 2000,              // jak často ptáček mrkne (min)
    blinkMsMax: 7000,              // (max)
    blinkDurMs: 130,               // jak dlouho je oko zavřené
    swapMsMin: 15000,              // jak často si dva ptáčci prohodí místa (min)
    swapMsMax: 40000,              // (max)
  },

  // --- Hrad (bydýlko) ---
  perchBar: {
    anchor: "top-right",           // umístění: vpravo nahoře pod ovládáním
    marginTop: 120,                // odsazení shora (pod ovládacími prvky)
    marginRight: 40,               // odsazení zprava
    width: 220,                    // délka větvičky
    sag: 6,                        // prohnutí větvičky uprostřed (px)
  },

  // --- Zvuk: procedurální WebAudio, žádné soubory ---
  audio: {
    defaultOn: false,            // výchozí MUTE — zvuk si zapne uživatel sám
                                 // (po zapnutí se rozezní hned, klik = gesto)
    masterGain: 0.16,            // celková hlasitost — jemné podbarvení, ne efekty
    pickupGain: 0.45,            // „naložení" písmene za kamerou (ztlumené)
    dropGain: 0.55,              // položení písmene na místo
    chirpGain: 0.7,              // cvrlikání sedících ptáčků
    popGain: 0.9,                // prásknutí balónku (výraznější, ale pořád decentní)
    perchChirpMsMin: 5000,       // jak často (min) si sedící ptáček zacvrliká
    perchChirpMsMax: 14000,      // jak často (max)
    chirpPitchMin: 1700,         // rozsah vlastní výšky hlasu ptáčka (Hz)
    chirpPitchMax: 3000,
  },

  // --- Povahy ptáčků (loudal ↔ horlivec) ---
  personality: {
    speedFactorMin: 0.8,         // loudal: násobek rychlosti letu
    speedFactorMax: 1.2,         // horlivec
    waitFactorMin: 0.65,         // horlivec čeká mezi písmeny kratčeji…
    waitFactorMax: 1.5,          // …loudal déle (odvozeno z rychlosti)
  },

  // --- Jemné vyhýbání se v letu ---
  avoid: {
    radius: 55,                  // od jaké vzdálenosti se ptáčci odpuzují
    force: 0.08,                 // max síla úhybu (malá — cíl má vždy přednost)
  },

  // --- Tranzice odchodu starého citátu (tlačítko „Další citát") ---
  transition: {
    durationMs: 1400,            // délka odchodu jednoho písmene (~1–2 s celkem)
    staggerMs: 350,              // max náhodné zpoždění startu jednotlivých písmen
    gravity: 0.55,               // zrychlení pádu (varianta „gravity")
    scatterSpeed: 3.0,           // počáteční rychlost rozletu (varianta „scatter")
    riseAccel: 0.06,             // zrychlení stoupání (varianta „rise")
    // varianta „balloons": písmena odlétají na barevných balóncích,
    // řádek po řádku odshora; všechny balónky unáší společný vítr
    balloons: {
      rowDelayMs: 700,           // rozestup startu jednotlivých řádků
      withinRowMs: 500,          // cik-cak rozptyl balónků uvnitř řádku
      riseAccel: 0.05,           // zrychlení stoupání
      riseMax: 3.8,              // strop rychlosti stoupání
      popMs: 180,                // nafouknutí balónku (scale 0 → 1)
      tailMs: 4500,              // dojezd po startu posledního řádku
      lighten: 0.35,             // o kolik světlejší než barvy ptáčků
      // FINÁLNÍ GAG: jeden ptáček vzlétne z hradu a propíchne balónek
      // zobáčkem — prásk, písmeno padá gravitací, ostatní se rozprchnou.
      // Spouští se VŽDY, když tranzice běží a na hradě někdo sedí
      // (balónky samy jsou vzácné, další náhoda by gag pohřbila).
      pop: {
        enabled: true,           // feature flag celého gagu
        atMsMin: 300,            // kdy nejdřív lovec vyrazí (po startu tranzice)
        atMsMax: 800,            // kdy nejpozději (balónky rychle stoupají!)
        speedBoost: 1.6,         // lovec letí rychleji než v běžném provozu
        radius: 18,              // jak blízko zobáček musí být, aby prásklo
        panicMs: 1500,           // jak dlouho jsou ostatní splašení (rychlejší let)
        panicBoost: 1.5,         // násobek rychlosti splašených ptáčků
      },
    },
  },

  // --- Paleta barev ptáčků (každý ptáček = 1 barva) ---
  palette: [
    "#E63946", // červená
    "#FFD60A", // žlutá
    "#FB8500", // oranžová
    "#2A9D8F", // zelená
    "#457B9D", // modrá
    "#8E7DBE", // fialová
    "#9AA0A6", // šedá
    "#F4A6C0", // růžová
    "#52B788", // mátová
  ],

  // --- Citát: typografie ---
  quote: {
    font: "Georgia, serif",        // web-safe font; viz fontFile níže
    fontFile: null,                // cesta k .ttf/.otf — když je null, použije se font výše
    fontSize: 42,                  // základní velikost písma citátu
    minFontSize: 18,               // pod tuhle velikost se při zmenšování okna nejde
    authorFontSize: 22,            // velikost jména autora
    lineHeight: 1.4,               // řádkování (násobek fontSize)
  },

  // --- Layout textu ---
  layout: {
    maxLineWidthRatio: 0.7,        // max šířka řádku vůči šířce plátna
    carryPunctuation: true,        // interpunkci nosí ptáčci jako písmena
    carrySpaces: false,            // mezery se nenosí — vznikají rozestupy samy
    dropHeight: 12,                // z jaké výšky písmeno „dopadne" na místo
  },

  // --- Barevné schéma den / noc ---
  theme: {
    night: {
      bg: "#0B1026",
      text: "#F1F5F9",
      accent: "#FDE68A",           // měsíc / hvězdy
    },
    day: {
      bg: "#BFE3F2",
      text: "#1E293B",
      accent: "#FFD93B",           // slunce
    },
  },

  // --- Ovládací prvky (vpravo nahoře) ---
  ui: {
    marginTop: 18,                 // odsazení ovládání shora
    marginRight: 40,               // odsazení zprava
    toggleW: 58,                   // šířka přepínače den/noc
    toggleH: 28,                   // výška přepínače
    buttonH: 30,                   // výška tlačítka „Další citát"
    gap: 10,                       // mezera mezi prvky
    fontSize: 14,                  // písmo UI
  },
};

// =====================================================================
// QUOTES — offline zásoba citátů po jazycích (snadno ručně doplnitelná)
// =====================================================================
const QUOTES = {};

QUOTES.cs = [
  { text: "Buď změnou, kterou chceš vidět ve světě.", author: "Mahátma Gándhí" },
  { text: "Cesta dlouhá tisíc mil začíná jediným krokem.", author: "Lao-c'" },
  { text: "Vím, že nic nevím.", author: "Sókratés" },
  { text: "Myslím, tedy jsem.", author: "René Descartes" },
  { text: "Pravda a láska musí zvítězit nad lží a nenávistí.", author: "Václav Havel" },
  { text: "Žij, jako bys měl zítra zemřít. Uč se, jako bys měl žít navždy.", author: "Mahátma Gándhí" },
  { text: "Štěstí přeje připraveným.", author: "Louis Pasteur" },
  { text: "Představivost je důležitější než vědění.", author: "Albert Einstein" },
  { text: "Být, či nebýt — to je otázka.", author: "William Shakespeare" },
  { text: "Co tě nezabije, to tě posílí.", author: "Friedrich Nietzsche" },
  { text: "Úspěch je schopnost jít od porážky k porážce beze ztráty nadšení.", author: "Winston Churchill" },
  { text: "Kdo chce hýbat světem, ať nejdřív pohne sám sebou.", author: "Sókratés" },
  { text: "Jediný způsob, jak dělat skvělou práci, je milovat to, co děláš.", author: "Steve Jobs" },
  { text: "Nikdy, nikdy, nikdy se nevzdávej.", author: "Winston Churchill" },
  { text: "Život je to, co se ti děje, zatímco si děláš jiné plány.", author: "John Lennon" },
  { text: "Méně je více.", author: "Ludwig Mies van der Rohe" },
  { text: "Není důležité zvítězit, ale zúčastnit se.", author: "Pierre de Coubertin" },
  { text: "Chybovat je lidské, odpouštět božské.", author: "Alexander Pope" },
  { text: "Kdo nikdy neudělal chybu, nikdy nezkusil nic nového.", author: "Albert Einstein" },
  { text: "Naděje umírá poslední.", author: "české přísloví" },
  { text: "Kdo se bojí, nesmí do lesa.", author: "české přísloví" },
];

QUOTES.en = [
  { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "I know that I know nothing.", author: "Socrates" },
  { text: "I think, therefore I am.", author: "René Descartes" },
  { text: "Truth and love must prevail over lies and hatred.", author: "Václav Havel" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "Fortune favors the prepared mind.", author: "Louis Pasteur" },
  { text: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  { text: "To be, or not to be, that is the question.", author: "William Shakespeare" },
  { text: "What does not kill me makes me stronger.", author: "Friedrich Nietzsche" },
  { text: "Success is going from failure to failure without losing enthusiasm.", author: "Winston Churchill" },
  { text: "Let him who would move the world first move himself.", author: "Socrates" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Never, never, never give up.", author: "Winston Churchill" },
  { text: "Life is what happens while you are busy making other plans.", author: "John Lennon" },
  { text: "Less is more.", author: "Ludwig Mies van der Rohe" },
  { text: "The most important thing is not winning but taking part.", author: "Pierre de Coubertin" },
  { text: "To err is human, to forgive divine.", author: "Alexander Pope" },
  { text: "Anyone who has never made a mistake has never tried anything new.", author: "Albert Einstein" },
  { text: "Hope dies last.", author: "proverb" },
  { text: "Time is money.", author: "Benjamin Franklin" },
];

// =====================================================================
// Jazyk (čeština / angličtina) — citáty i texty UI
// =====================================================================
const STRINGS = {
  cs: { next: "Další citát", copyLink: "Zkopírovat odkaz", copied: "Odkaz zkopírován ✓" },
  en: { next: "Next quote", copyLink: "Copy link", copied: "Link copied ✓" },
};

// Detekce: uložená volba má přednost, jinak jazyk prohlížeče
// (navigator.language je nejspolehlivější webový zdroj; slovenštině
// nabídneme češtinu, ta je bližší než angličtina).
function detectLang() {
  try {
    const saved = localStorage.getItem("quoteboids-lang");
    if (saved === "cs" || saved === "en") return saved;
  } catch (e) { /* localStorage může být zakázané — nevadí */ }
  const nav = (navigator.language || "en").toLowerCase();
  return (nav.startsWith("cs") || nav.startsWith("sk")) ? "cs" : "en";
}

let lang = detectLang();

function setLang(l) {
  lang = l;
  try { localStorage.setItem("quoteboids-lang", l); } catch (e) { /* viz výše */ }
}

// =====================================================================
// Deep-link — konkrétní citát jde poslat odkazem: ?lang=cs&q=5
// (q je 1-based index v sadě daného jazyka). Adresní řádek se při každé
// nové scéně aktualizuje přes replaceState, takže stačí zkopírovat URL —
// nebo použít tlačítko, které se objeví pod autorem po složení citátu.
// =====================================================================
let forcedQuoteIndex = null; // vyžádaný citát z URL (jen pro první scénu)

function applyUrlParams() {
  try {
    const p = new URLSearchParams(location.search);
    const l = p.get("lang");
    if (l === "cs" || l === "en") setLang(l);
    const q = parseInt(p.get("q"), 10);
    if (q >= 1 && q <= QUOTES[lang].length) forcedQuoteIndex = q - 1;
  } catch (e) { /* bez URL parametrů se prostě losuje */ }
}

// Zapiš aktuální citát do adresního řádku (na file:// to může být zakázané).
function updateUrl() {
  try {
    const q = QUOTES[lang].indexOf(quote) + 1;
    history.replaceState(null, "", "?lang=" + lang + "&q=" + q);
  } catch (e) { /* nevadí */ }
}

// Kopírování do schránky s fallbackem pro nezabezpečený kontext (file://).
function copyText(t) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(t).catch(() => {});
  } else {
    const ta = document.createElement("textarea");
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* smůla */ }
    document.body.removeChild(ta);
  }
}

// =====================================================================
// Stavy ptáčka (stavový automat)
// =====================================================================
const S = {
  WAITING: "waiting",            // mimo obrazovku, čeká na další písmeno
  SPAWNING: "spawning",          // objevil se vlevo, rozlétá se
  CARRYING: "carrying",          // nese písmeno k cíli
  LANDING: "landing",            // brzdí nad cílem (přistávací manévr)
  DROPPING: "dropping",          // upouští písmeno
  TURNING: "turning",            // otáčí se k odletu
  DEPARTING: "departing",        // odlétá vlevo mimo obrazovku
  FLY_TO_PERCH: "flyingToPerch", // už není co nosit → letí na hrad
  LANDING_PERCH: "landingPerch", // dosedá na hrad
  PERCHED: "perched",            // idle na hradě (pohled zepředu)
  STRETCHING: "stretching",      // protahovací smyčka na hradě
  HUNTING: "hunting",            // letí propíchnout balónek (gag tranzice)
};

// =====================================================================
// Globální stav aplikace
// =====================================================================
let birds = [];          // hejno
let letters = [];        // znaky citátu: {ch, x, y, placed, dropFrom, dropStart}
let taskQueue = [];      // náhodně zamíchané indexy zatím nepřiřazených znaků
let quote = null;        // aktuální citát {text, author}
let authorPos = null;    // {x, y} pozice jména autora
let quoteDoneAt = 0;     // millis() okamžiku položení posledního písmene (0 = neběží)
let dayness = 0;         // 0 = noc, 1 = den (interpolovaná hodnota)
let dayTarget = 0;       // cílová hodnota dayness (0/1)
let stars = [];          // {x, y, r, phase} — hvězdy nočního nebe
let loadedFont = null;   // font načtený přes loadFont() (pokud CONFIG.quote.fontFile)
let uiRects = {};        // hitboxy ovládacích prvků {toggle, next, sound, lang, copy}
let nextSwapAt = 0;      // kdy si dva sedící ptáčci prohodí místa (0 = neplánováno)
let lastInteractionMs = 0; // poslední interakce uživatele (režim spořiče)
let toastText = "";      // krátká potvrzovací hláška (zkopírovaný odkaz)
let toastUntil = 0;      // dokdy je toast vidět

function preload() {
  // Volitelný vlastní font — když není dodán soubor, zůstane web-safe z CONFIG.
  if (CONFIG.quote.fontFile) loadedFont = loadFont(CONFIG.quote.fontFile);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  dayTarget = CONFIG.scene.defaultMode === "day" ? 1 : 0;
  dayness = dayTarget;
  buildStars();
  buildClouds();
  nextMeteorAt = millis() + random(CONFIG.sky.meteorMsMin, CONFIG.sky.meteorMsMax);
  nextFlockAt = millis() + random(CONFIG.sky.flockMsMin, CONFIG.sky.flockMsMax);
  applyUrlParams();
  startScene(true);
}

// =====================================================================
// Scéna — start / reset
// =====================================================================

// Spustí novou scénu s náhodným citátem. firstRun=true znamená čerstvý start
// (ptáčci se teprve vytvoří), jinak jde o reset tlačítkem „Další citát".
function startScene(firstRun) {
  // starý citát neodstraníme skokem — odejde náhodně vybranou tranzicí
  // (musí se zachytit PŘED výběrem nového citátu a přepočtem layoutu)
  if (!firstRun) captureOutgoing();

  // vyber nový citát z aktuálního jazyka (při resetu jiný než aktuální);
  // deep-link z URL má přednost (jen poprvé)
  const pool = QUOTES[lang];
  let q;
  if (forcedQuoteIndex !== null) {
    q = pool[forcedQuoteIndex];
    forcedQuoteIndex = null;
  } else {
    do { q = random(pool); } while (pool.length > 1 && quote && q === quote);
  }
  quote = q;
  quoteDoneAt = 0;
  nextSwapAt = 0;       // prohazování míst se plánuje až po složení citátu
  if (ivy) ivy.dying = millis(); // břečťan se při odchodu scény rozplyne
  updateUrl();

  computeLayout();

  // znaky se ptáčkům přidělují NÁHODNĚ — citát se neskládá sekvenčně
  taskQueue = shuffle(letters.map((_, i) => i));

  if (firstRun) {
    birds = [];
    let delay = 0;
    for (let i = 0; i < CONFIG.birds.count; i++) {
      delay += random(CONFIG.birds.spawnStaggerMsMin, CONFIG.birds.spawnStaggerMsMax);
      birds.push(new Bird(i, delay));
    }
  } else {
    // při balónkové tranzici si jeden sedící ptáček (lovec) počká na hradě
    // a v náhodný čas vyrazí prásknout balónek — viz popBalloon
    let hunter = null;
    const P = CONFIG.transition.balloons.pop;
    if (P.enabled && outgoing && outgoing.type === "balloons") {
      const seated = birds.filter(b => b.state === S.PERCHED);
      if (seated.length) {
        hunter = random(seated);
        const target = pickPopTarget(hunter);
        if (target) {
          hunter.huntPlan = {
            at: millis() + random(P.atMsMin, P.atMsMax),
            item: target,
          };
        } else {
          hunter = null;
        }
      }
    }

    // reset: ptáčci na scéně (typicky na hradě) odletí doleva a vrátí se
    // s písmeny nového citátu; kdo je mimo obrazovku, jen dostane novou pauzu
    let delay = 0;
    for (const b of birds) {
      if (b === hunter) continue; // lovec zůstává na hradě a číhá
      b.letter = null;
      delay += random(CONFIG.birds.spawnStaggerMsMin, CONFIG.birds.spawnStaggerMsMax);
      if (b.state === S.WAITING) {
        b.waitUntil = millis() + delay;
      } else {
        b.beginDeparting(delay);
      }
    }
  }
}

// =====================================================================
// Layout citátu — zalomení na řádky a předpočet cílových pozic znaků
// =====================================================================

// Vrátí aktuálně použitý font (loadnutý soubor má přednost před web-safe).
function quoteFont() { return loadedFont || CONFIG.quote.font; }

// Rozvrhne citát: zalomí po slovech přes textWidth(), spočítá (x, y) středu
// každého viditelného znaku (mezery se nenosí ani neevidují) a pozici autora.
// Při resize se volá znovu — zachovává příznaky `placed` existujících znaků.
function computeLayout() {
  const maxW = width * CONFIG.layout.maxLineWidthRatio;

  // písmo se zmenšuje, dokud se nejširší slovo nevejde do povoleného pruhu
  let fs = CONFIG.quote.fontSize;
  textFont(quoteFont());
  textSize(fs);
  const longest = Math.max(...quote.text.split(" ").map(w => textWidth(w)));
  while (fs > CONFIG.quote.minFontSize && longest * (fs / CONFIG.quote.fontSize) > maxW) fs--;
  textSize(fs);

  // zalomení po slovech
  const lines = [];
  let cur = "";
  for (const w of quote.text.split(" ")) {
    const test = cur ? cur + " " + w : w;
    if (!cur || textWidth(test) <= maxW) cur = test;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);

  // cílové souřadnice znaků — blok řádků vycentrovaný na plátně
  const lineH = fs * CONFIG.quote.lineHeight;
  const totalH = lines.length * lineH;
  const y0 = height / 2 - totalH / 2 + lineH / 2;

  const targets = [];
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const lineX = width / 2 - textWidth(line) / 2;
    const y = y0 + li * lineH;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === " ") continue; // mezery se nenosí (CONFIG.layout.carrySpaces)
      // prefix-měření respektuje kerning celé sekvence před znakem
      const x = lineX + textWidth(line.substring(0, j)) + textWidth(ch) / 2;
      targets.push({ ch, x, y });
    }
  }

  // při resize jen přesuneme existující znaky na nové pozice
  if (letters.length === targets.length && letters.every((l, i) => l.ch === targets[i].ch)) {
    for (let i = 0; i < letters.length; i++) {
      letters[i].x = targets[i].x;
      letters[i].y = targets[i].y;
    }
  } else {
    letters = targets.map(t => ({ ...t, placed: false, dropFrom: null, dropStart: 0 }));
  }

  // Autor se zobrazí až po složení celého citátu (zvolená varianta B):
  // během skládání by jeho text překážel a tahal pozornost; fade-in na konci
  // funguje jako přirozená „pointa" celé scény.
  authorPos = { x: width / 2, y: y0 + lines.length * lineH + CONFIG.quote.authorFontSize * 0.8 };

  letters.quoteFontSize = fs; // skutečně použitá velikost (po případném zmenšení)
}

// =====================================================================
// Hrad (bydýlko) — vodorovná větvička vpravo nahoře
// =====================================================================

// Geometrie hradu: vrací {x0, x1, y} podle CONFIG.perchBar a velikosti plátna.
function perchGeom() {
  const pb = CONFIG.perchBar;
  const x1 = width - pb.marginRight;
  const x0 = x1 - pb.width;
  return { x0, x1, y: pb.marginTop + 40 };
}

// --- Pérování větvičky -------------------------------------------------
// Jeden tlumený oscilátor pro celou větvičku; výchylka se po délce násobí
// parabolou 4t(1-t), takže konce (zavěšené háčky) drží a střed houpe.
// Dosednutí ptáčka větvičku kopne dolů, vzlet nahoru — síla podle toho,
// jak blízko středu ptáček sedí.
let perchSpring = { y: 0, v: 0 };

function perchSpringKick(amount, slot) {
  const t = (slot + 0.5) / CONFIG.birds.count;
  perchSpring.v += amount * 4 * t * (1 - t);
}

function updatePerchSpring(f) {
  const S = CONFIG.perchSpring;
  const a = -S.stiffness * perchSpring.y - S.damping * perchSpring.v;
  perchSpring.v += a * f;
  perchSpring.y += perchSpring.v * f;
}

// Pozice sedátka pro ptáčka s daným slotem (sloty rozmístěné rovnoměrně).
function perchSlotPos(slot) {
  const g = perchGeom();
  const n = CONFIG.birds.count;
  const t = (slot + 0.5) / n;
  const x = lerp(g.x0, g.x1, t);
  // prohnutí větvičky (parabola) + aktuální výchylka pérování
  const bend = 4 * t * (1 - t);
  const y = g.y + CONFIG.perchBar.sag * bend + perchSpring.y * bend;
  return { x, y };
}

function drawPerchBar() {
  const g = perchGeom();
  const c = themeLerp("text");
  stroke(red(c), green(c), blue(c), 170);
  strokeWeight(3);
  noFill();
  // prohnutá pérující větvička + dva háčky na koncích (zavěšený drátek)
  beginShape();
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const bend = 4 * t * (1 - t);
    vertex(lerp(g.x0, g.x1, t),
      g.y + (CONFIG.perchBar.sag + perchSpring.y) * bend);
  }
  endShape();
  line(g.x0, g.y, g.x0 - 8, g.y - 14);
  line(g.x1, g.y, g.x1 + 8, g.y - 14);
  strokeWeight(1);

  // pár břečťanových lístků na koncích bydýlka (součást feature flagu);
  // seedy jsou pevné, ať variegace mezi snímky nebliká
  if (CONFIG.ivy.enabled && CONFIG.ivy.perchDecor) {
    drawIvyLeafAt(g.x0 - 5, g.y - 6, -2.0, 9, 1, 1, 11.3);
    drawIvyLeafAt(g.x0 + 2, g.y + 3, 1.7, 8, 1, 1, 22.7);
    drawIvyLeafAt(g.x0 - 9, g.y - 12, -1.1, 7, 1, 1, 33.1);
    drawIvyLeafAt(g.x1 + 5, g.y - 6, -1.1, 9, 1, 1, 44.9);
    drawIvyLeafAt(g.x1 - 2, g.y + 3, 1.4, 8, 1, 1, 55.5);
    drawIvyLeafAt(g.x1 + 9, g.y - 12, -2.1, 7, 1, 1, 66.2);
  }
}

// =====================================================================
// Ptáček — procedurální vektorová grafika + stavový automat
// =====================================================================
class Bird {
  constructor(idx, firstDelayMs) {
    this.idx = idx;
    this.color = color(CONFIG.palette[idx % CONFIG.palette.length]);
    this.slot = idx;                      // předem vybrané místo na hradě
    this.pos = createVector(-80, random(height * 0.15, height * 0.85));
    this.vel = createVector(0, 0);
    this.facing = 1;                      // 1 = doprava, -1 = doleva
    this.state = S.WAITING;
    this.stateSince = 0;
    this.waitUntil = millis() + firstDelayMs;
    this.letter = null;                   // přidělený znak (objekt z letters[])
    this.flapPhase = random(TWO_PI);      // fáze mávání (každý ptáček jinak)
    this.exit = null;                     // cíl odletu mimo obrazovku
    // povaha: loudal (pomalejší let, delší pauzy) ↔ horlivec — z jedné náhody
    const P = CONFIG.personality;
    this.speedFactor = random(P.speedFactorMin, P.speedFactorMax);
    this.waitFactor = map(this.speedFactor,
      P.speedFactorMin, P.speedFactorMax, P.waitFactorMax, P.waitFactorMin);
    // vlastní výška hlasu (každý ptáček cvrliká jinak vysoko)
    this.chirpPitch = random(CONFIG.audio.chirpPitchMin, CONFIG.audio.chirpPitchMax);
    this.chirpAt = 0;                     // kdy si příště zacvrliká na hradě
    this.blinkAt = millis() + random(CONFIG.perch.blinkMsMin, CONFIG.perch.blinkMsMax);
    this.blinkUntil = 0;                  // dokdy je oko zavřené (mrknutí)
    this.huntPlan = null;                 // {at, item} — plán prásknutí balónku
    this.panicUntil = 0;                  // dokdy je ptáček splašený (po prásku)
    // plynule dojížděné animační parametry (cíle určuje stav, viz update)
    this.tilt = CONFIG.wings.bodyTiltCruise; // aktuální náklon těla
    this.heading = 0;                     // aktuální úhel letu (vyhlazený)
    this.brakeDist = 0;                   // brzdná dráha zachycená při landing
    this.flapFreqCur = 0;                 // aktuální frekvence mávání
    this.flapAmpCur = 1;                  // aktuální rozsah mávání (0..1)
    this.facingSmooth = 1;                // vyhlazené otočení (squash při obratu)
    // idle na hradě
    this.headDir = 1;                     // kam kouká zobáček (1 vpravo, -1 vlevo)
    this.headTurnAt = 0;
    this.shuffleX = 0;                    // aktuální přešlápnutí
    this.shuffleTarget = 0;
  }

  setState(s) { this.state = s; this.stateSince = millis(); }

  // --- pomocné: cíl letu pro nesené písmeno (ptáček visí NAD pozicí znaku) ---
  carryOffset() {
    return CONFIG.birdShape.bodyWidth / 2 + letters.quoteFontSize * 0.55 + 4;
  }
  letterTarget() {
    return createVector(this.letter.x,
      this.letter.y - this.carryOffset() - CONFIG.layout.dropHeight);
  }
  perchTarget() {
    const p = perchSlotPos(this.slot);
    const sh = CONFIG.birdShape;
    // střed těla sedícího ptáčka = nad větvičkou o nohy + půl těla
    return createVector(p.x, p.y - sh.legLength - sh.bodyLength * 0.45);
  }

  // Naplánuje odlet doleva mimo obrazovku; delayMs zpozdí návrat (užito při resetu).
  beginDeparting(extraWaitMs = 0) {
    // vzlet z větvičky ji odpruží nahoru
    if (this.state === S.PERCHED || this.state === S.STRETCHING) {
      perchSpringKick(CONFIG.perchSpring.takeoffKick, this.slot);
    }
    this.exit = createVector(-80, random(height * 0.15, height * 0.85));
    this.extraWait = extraWaitMs;
    this.setState(S.TURNING);
  }

  // max rychlost konkrétního ptáčka (horlivec létá rychleji než loudal);
  // splašený ptáček letí výrazně rychleji, lovec balónku taky (musí ho
  // stihnout dřív, než uletí nahoru)
  vMax() {
    const P = CONFIG.transition.balloons.pop;
    const boost = millis() < this.panicUntil ? P.panicBoost
      : (this.state === S.HUNTING ? P.speedBoost : 1);
    return CONFIG.flight.maxSpeed * this.speedFactor * boost;
  }

  // brzdná dráha z aktuální rychlosti: v²/2a + rezerva — rychlý ptáček
  // potřebuje k zabrzdění víc místa, takže landing začíná dřív
  brakeDistance() {
    const FL = CONFIG.flight;
    const v = this.vel.mag();
    return Math.max(FL.brakeMin, v * v / (2 * FL.deceleration) * FL.brakeSafety);
  }

  // --- steering: plynulé dolétání k cíli (arrive) ---
  steerTo(target, f, maxForce, brake) {
    const toT = p5.Vector.sub(target, this.pos);
    const d = toT.mag();
    let desiredSpeed = this.vMax();
    // při brzdění klesá žádaná rychlost lineárně s dráhou zbývající
    // z brzdné dráhy zachycené při vstupu do landing stavu
    if (brake) desiredSpeed = constrain(
      this.vMax() * d / (this.brakeDist || CONFIG.flight.arriveRadius),
      0.4, this.vMax());
    const desired = toT.copy().setMag(desiredSpeed);
    const steer = p5.Vector.sub(desired, this.vel).limit(maxForce * f * this.speedFactor);
    this.vel.add(steer);
    this.vel.limit(this.vMax());
    return d;
  }

  // jemné vyhýbání ostatním ptáčkům — malá odpudivá síla, cíl má vždy přednost
  // (aplikuje se jen v letových stavech, ne při přistávání, aby nerušila dosednutí)
  avoidOthers(f) {
    const A = CONFIG.avoid;
    const push = createVector(0, 0);
    for (const o of birds) {
      if (o === this || o.state === S.WAITING) continue;
      const d = p5.Vector.dist(this.pos, o.pos);
      if (d > 0.001 && d < A.radius) {
        push.add(p5.Vector.sub(this.pos, o.pos).setMag(1 - d / A.radius));
      }
    }
    if (push.magSq() > 0) {
      push.limit(A.force * f);
      this.vel.add(push);
      this.vel.limit(this.vMax());
    }
  }

  integrate(f) {
    this.pos.add(p5.Vector.mult(this.vel, f));
    if (this.vel.magSq() > 0.01) this.facing = this.vel.x >= 0 ? 1 : -1;
  }

  // =====================================================
  // Krok stavového automatu (f = násobek 60fps snímku)
  // =====================================================
  update(f) {
    const now = millis();
    const FL = CONFIG.flight;

    switch (this.state) {

      case S.WAITING:
        // mimo obrazovku; po vypršení pauzy si vezme další písmeno,
        // a když už žádné nezbývá, letí rovnou na své místo na hradě.
        // Při prázdném zásobníku nemá smysl vyčkávat celou pauzu —
        // zkrátí se, ať ptáček dosedne na hrad bez dlouhého otálení.
        if (taskQueue.length === 0) {
          this.waitUntil = Math.min(this.waitUntil, now + 500);
        }
        if (now >= this.waitUntil) {
          if (taskQueue.length > 0) {
            this.letter = letters[taskQueue.pop()];
            this.pos.set(-60, random(height * 0.12, height * 0.88));
            this.vel = p5.Vector.sub(this.letterTarget(), this.pos).setMag(FL.spawnSpeed);
            sfxPickup(); // „naložení" písmene za kamerou
            this.setState(S.SPAWNING);
          } else {
            this.pos.set(-60, random(height * 0.1, height * 0.4));
            this.vel = p5.Vector.sub(this.perchTarget(), this.pos).setMag(FL.spawnSpeed);
            this.setState(S.FLY_TO_PERCH);
          }
          // mimo obraz se animační parametry srovnají skokem (nikdo to nevidí)
          this.facing = 1;
          this.facingSmooth = 1;
          this.heading = constrain(Math.atan2(this.vel.y, Math.abs(this.vel.x)), -0.9, 0.9);
          this.tilt = CONFIG.wings.bodyTiltCruise;
        }
        break;

      case S.SPAWNING:
        // krátké nasazení do letu — rozjezd, pak plynule do carrying
        this.steerTo(this.letterTarget(), f, FL.acceleration, false);
        this.avoidOthers(f);
        this.integrate(f);
        if (now - this.stateSince > 400) this.setState(S.CARRYING);
        break;

      case S.CARRYING: {
        const d = this.steerTo(this.letterTarget(), f, FL.acceleration, false);
        this.avoidOthers(f);
        this.integrate(f);
        // brzdit se začíná podle aktuální rychlosti (rychlý dřív)
        if (d < Math.max(FL.arriveRadius, this.brakeDistance())) {
          this.brakeDist = d;
          this.setState(S.LANDING);
        }
        break;
      }

      case S.LANDING: {
        // přistávací manévr: brzdí, tělo proti směru letu, rychlejší mávání
        const target = this.letterTarget();
        const d = this.steerTo(target, f, FL.deceleration, true);
        this.integrate(f);
        // posledních pár px doklouže přímo (žádné kroužení kolem cíle)
        if (d < 14) {
          this.pos.lerp(target, 0.18 * f);
          this.vel.mult(Math.pow(0.85, f));
        }
        if (d < FL.snapDist && this.vel.mag() < 1.2) {
          this.pos.set(target.x, target.y);
          this.vel.set(0, 0);
          // upuštění: písmeno se odpojí a krátce dopadne na své místo
          this.letter.placed = true;
          this.letter.dropFrom = { x: this.pos.x, y: this.pos.y + this.carryOffset() };
          this.letter.dropStart = now;
          this.letter = null;
          sfxDrop();
          // vzácně se při upuštění uvolní peříčko či dvě — schválně ne vždy,
          // ať je to drobnost, na kterou se divák těší
          if (random() < CONFIG.feathers.dropChance) {
            spawnFeathers(this.pos.x, this.pos.y + 4, this.color,
              random() < 0.4 ? 2 : 1);
          }
          this.setState(S.DROPPING);
          checkQuoteDone();
        }
        break;
      }

      case S.DROPPING:
        // krátká pauza na místě — ptáček „pustil" a srovnává se;
        // když už v zásobníku žádné písmeno nezbývá, letí rovnou na hrad
        // (zbytečný odlet ze scény a návrat působil rušivě)
        if (now - this.stateSince > CONFIG.timing.dropMs) {
          if (taskQueue.length === 0) this.setState(S.FLY_TO_PERCH);
          else this.beginDeparting();
        }
        break;

      case S.TURNING:
        // otočka proti směru odletu (mimo obrazovku vlevo, náhodná výška)
        this.facing = -1;
        if (now - this.stateSince > CONFIG.timing.turnMs) this.setState(S.DEPARTING);
        break;

      case S.DEPARTING: {
        // Zásobník se mezitím vyprázdnil (poslední písmena si rozebrali
        // ostatní) → nemá smysl odlétat ze scény a vracet se naprázdno;
        // ptáček se otočí rovnou na hrad. Netýká se odletu při resetu
        // (extraWait > 0) — tam je zásobník nového citátu plný.
        if (taskQueue.length === 0 && !this.extraWait) {
          this.setState(S.FLY_TO_PERCH);
          break;
        }
        // zrychluje pryč; po nabrání rychlosti už jen klidně plachtí
        this.steerTo(this.exit, f, CONFIG.flight.acceleration * 1.4, false);
        this.avoidOthers(f);
        this.integrate(f);
        // pryč je i přes horní hranu (splašený útěk po prásknutí balónku)
        if (this.pos.x < -70 || this.pos.y < -70) {
          this.setState(S.WAITING);
          // pauza mezi písmeny podle povahy: horlivec krátce, loudal déle
          this.waitUntil = now + (this.extraWait || 0)
            + random(CONFIG.birds.waitMsMin, CONFIG.birds.waitMsMax) * this.waitFactor;
          this.extraWait = 0;
        }
        break;
      }

      case S.FLY_TO_PERCH: {
        const d = this.steerTo(this.perchTarget(), f, FL.acceleration, false);
        this.avoidOthers(f);
        this.integrate(f);
        // i dosednutí na hrad brzdí podle rychlosti — let přes celou
        // obrazovku končí dlouhým plavným dobrzděním, ne zaseknutím
        if (d < Math.max(FL.arriveRadius * 0.7, this.brakeDistance())) {
          this.brakeDist = d;
          this.setState(S.LANDING_PERCH);
        }
        break;
      }

      case S.LANDING_PERCH: {
        const target = this.perchTarget();
        const d = this.steerTo(target, f, FL.deceleration, true);
        this.integrate(f);
        if (d < 14) {
          this.pos.lerp(target, 0.18 * f);
          this.vel.mult(Math.pow(0.85, f));
        }
        if (d < FL.snapDist && this.vel.mag() < 1.2) {
          this.pos.set(target.x, target.y);
          this.vel.set(0, 0);
          // dosednutí rozhoupe větvičku; vzácně se uvolní peříčko
          perchSpringKick(CONFIG.perchSpring.landKick, this.slot);
          if (random() < CONFIG.feathers.perchChance) {
            spawnFeathers(this.pos.x, this.pos.y, this.color, 1);
          }
          this.setState(S.PERCHED);
          this.headDir = random() < 0.5 ? -1 : 1;
          this.headTurnAt = now + random(CONFIG.perch.headTurnMsMin, CONFIG.perch.headTurnMsMax);
          this.chirpAt = now + random(CONFIG.audio.perchChirpMsMin, CONFIG.audio.perchChirpMsMax);
          this.shuffleX = 0;
          this.shuffleTarget = 0;
        }
        break;
      }

      case S.PERCHED:
        // naplánovaný lov balónku: v určený čas vzlétne a letí ho prásknout
        if (this.huntPlan && now >= this.huntPlan.at) {
          perchSpringKick(CONFIG.perchSpring.takeoffKick, this.slot);
          const it = this.huntPlan.item;
          this.vel.set(Math.sign(it.x - this.pos.x) * 2, -2.5);
          this.setState(S.HUNTING);
          break;
        }
        // idle zepředu: po náhodné době otočí hlavu, občas přešlápne,
        // s pravděpodobností stretchChance se místo toho protáhne
        this.pos.x = this.perchTarget().x + this.shuffleX;
        this.pos.y = this.perchTarget().y;
        this.shuffleX = lerp(this.shuffleX, this.shuffleTarget, 0.1 * f);
        if (now >= this.headTurnAt) {
          if (random() < CONFIG.perch.stretchChance) {
            this.setState(S.STRETCHING);
          } else {
            this.headDir *= -1;
            if (random() < 0.5) {
              this.shuffleTarget = random(-1, 1) * CONFIG.perch.stepShuffleAmplitude;
            }
          }
          this.headTurnAt = now + random(CONFIG.perch.headTurnMsMin, CONFIG.perch.headTurnMsMax);
        }
        // občasné tiché zacvrlikání (každý ptáček svou výškou hlasu)
        if (now >= this.chirpAt) {
          sfxChirp(this.chirpPitch);
          this.chirpAt = now + random(CONFIG.audio.perchChirpMsMin, CONFIG.audio.perchChirpMsMax);
        }
        // mrkání
        if (now >= this.blinkAt) {
          this.blinkUntil = now + CONFIG.perch.blinkDurMs;
          this.blinkAt = now + random(CONFIG.perch.blinkMsMin, CONFIG.perch.blinkMsMax);
        }
        break;

      case S.STRETCHING:
        // protažení: napne nohy, roztáhne a zamává křídly, vrátí se do idle
        this.pos.x = this.perchTarget().x + this.shuffleX;
        if (now - this.stateSince > CONFIG.timing.stretchMs) {
          this.setState(S.PERCHED);
          this.headTurnAt = now + random(CONFIG.perch.headTurnMsMin, CONFIG.perch.headTurnMsMax);
        }
        break;

      case S.HUNTING: {
        // letí propíchnout balónek; cíl se hýbe (balónek stoupá)
        const it = this.huntPlan && this.huntPlan.item;
        const valid = it && !it.popped && outgoing
          && outgoing.type === "balloons" && it.y > -40;
        if (!valid) {
          // balónek mezitím zmizel/praskl — nech to být a odleť
          this.huntPlan = null;
          this.beginDeparting();
          break;
        }
        // střed balónku (přibližně jako v drawBalloon)
        const br = it.size * 0.38 + 6;
        const target = createVector(it.x, it.y - it.size * 0.55 - 16 - br);
        const d = this.steerTo(target, f, CONFIG.flight.acceleration * 1.6, false);
        this.integrate(f);
        if (d < CONFIG.transition.balloons.pop.radius) {
          popBalloon(it, this);
          this.huntPlan = null;
          this.beginDeparting();
        }
        break;
      }
    }

    // --- plynulé tranzice animačních parametrů mezi stavy ---
    // Stav určuje jen CÍLE (náklon, frekvence/rozsah mávání, úhel letu,
    // otočení); k nim se dojíždí exponenciálním easingem, takže změna stavu
    // nikdy neudělá skok pózy během jednoho frame.
    const W = CONFIG.wings;
    const flying = [S.SPAWNING, S.CARRYING, S.DEPARTING, S.FLY_TO_PERCH, S.HUNTING].includes(this.state);
    const braking = this.state === S.LANDING || this.state === S.LANDING_PERCH;
    const pausing = this.state === S.DROPPING || this.state === S.TURNING;

    let freqT = 0, ampT = this.flapAmpCur; // na hradě mávání plynule dozní
    if (flying) { freqT = W.flapFreqCruise * this.speedFactor; ampT = 1; }
    else if (braking) { freqT = W.flapFreqLanding; ampT = 1; }
    else if (pausing) { freqT = W.flapFreqLanding; ampT = 0.55; }
    const tiltT = (braking || pausing) ? W.bodyTiltLanding : W.bodyTiltCruise;
    let headT = this.vel.mag() > 0.3
      ? constrain(Math.atan2(this.vel.y, Math.abs(this.vel.x)), -0.9, 0.9) : 0;

    const ke = e => 1 - Math.pow(1 - e, f); // easing nezávislý na fps
    const E = CONFIG.anim;
    this.flapFreqCur = lerp(this.flapFreqCur, freqT, ke(E.flapEase));
    this.flapAmpCur = lerp(this.flapAmpCur, ampT, ke(E.flapEase));
    this.tilt = lerp(this.tilt, tiltT, ke(E.tiltEase));
    this.heading = lerp(this.heading, headT, ke(E.tiltEase));
    this.facingSmooth = lerp(this.facingSmooth, this.facing, ke(E.turnEase));
    this.flapPhase += this.flapFreqCur * f * TWO_PI;
  }

  // =====================================================
  // Kreslení — samostatně transformovatelné části
  // =====================================================
  draw() {
    if (this.state === S.WAITING) return; // mimo obrazovku
    if (this.state === S.PERCHED || this.state === S.STRETCHING) this.drawFront();
    else this.drawSide();
  }

  // tmavší/světlejší odvozeniny základní barvy (křídla, bříško, nohy)
  shade(amt) { return lerpColor(this.color, color(0, 0, 30), amt); }
  belly() { return lerpColor(this.color, color(255), 0.45); }

  // --- boční pohled (let) ---
  drawSide() {
    const sh = CONFIG.birdShape;
    const W = CONFIG.wings;

    // všechny pózové parametry jsou vyhlazené (viz konec update) — náklon,
    // úhel letu i rozsah mávání dojíždí ke stavovým cílům bez skoků
    const flap = Math.sin(this.flapPhase) * W.flapAmplitude * this.flapAmpCur;

    // otočka se kreslí jako plynulý „squash" přes osu X (zrcadlo dojíždí
    // od 1 k -1); kolem nuly se drží minimální šířka, ať ptáček nezmizí
    let sx = this.facingSmooth;
    if (Math.abs(sx) < 0.08) sx = sx < 0 ? -0.08 : 0.08;

    push();
    translate(this.pos.x, this.pos.y);
    scale(sx, 1);
    rotate(this.heading + this.tilt);

    // vzdálenější křídlo (za tělem, tmavší, v protifázi nevypadá dobře — stejná fáze)
    push();
    translate(-2, -3);
    rotate(-0.5 - flap * 0.85);
    fill(this.shade(0.45)); noStroke();
    ellipse(-sh.wingLength * 0.45, 0, sh.wingLength, sh.wingLength * 0.38);
    pop();

    // ocásek
    fill(this.shade(0.3)); noStroke();
    triangle(-sh.bodyLength * 0.4, 0,
             -sh.bodyLength * 0.75, -sh.bodyWidth * 0.4,
             -sh.bodyLength * 0.75, sh.bodyWidth * 0.25);

    // tělo + světlejší bříško
    fill(this.color);
    ellipse(0, 0, sh.bodyLength, sh.bodyWidth);
    fill(this.belly());
    ellipse(-1, sh.bodyWidth * 0.18, sh.bodyLength * 0.7, sh.bodyWidth * 0.55);

    // nohy: v letu přitažené pod tělem (písmeno nesou packy — viz drawCarried)
    stroke(this.shade(0.6)); strokeWeight(1.5);
    if (!this.letter) {
      line(2, sh.bodyWidth * 0.3, -2, sh.bodyWidth * 0.55);
      line(5, sh.bodyWidth * 0.3, 2, sh.bodyWidth * 0.55);
    }
    noStroke();

    // hlava se zobáčkem a okem
    const hx = sh.bodyLength * 0.42, hy = -sh.bodyWidth * 0.42;
    fill(this.color);
    circle(hx, hy, sh.headRadius * 2);
    fill(255, 160, 40);
    triangle(hx + sh.headRadius * 0.8, hy - 2.5,
             hx + sh.headRadius * 0.8, hy + 2.5,
             hx + sh.headRadius * 0.8 + sh.beakLength, hy);
    fill(20); circle(hx + 2.5, hy - 1.5, 3);

    // bližší křídlo (před tělem)
    push();
    translate(0, -2);
    rotate(-0.45 + flap);
    fill(this.shade(0.18));
    ellipse(-sh.wingLength * 0.45, 0, sh.wingLength, sh.wingLength * 0.42);
    pop();

    pop();

    // nesené písmeno se kreslí ve světových souřadnicích (visí pod ptáčkem)
    if (this.letter) this.drawCarried();
  }

  // nesené písmeno + packy, kterými ho ptáček drží
  drawCarried() {
    const fs = letters.quoteFontSize;
    const gx = this.pos.x - this.vel.x * 1.4;          // mírný „závěs" proti pohybu
    const gy = this.pos.y + this.carryOffset();

    // packy od bříška k hornímu okraji znaku
    stroke(this.shade(0.6)); strokeWeight(1.5);
    const byy = this.pos.y + CONFIG.birdShape.bodyWidth * 0.35;
    line(this.pos.x - 3, byy, gx - fs * 0.16, gy - fs * 0.42);
    line(this.pos.x + 3, byy, gx + fs * 0.16, gy - fs * 0.42);
    noStroke();

    fill(themeLerp("text"));
    textFont(quoteFont());
    textSize(fs);
    textAlign(CENTER, CENTER);
    text(this.letter.ch, gx, gy);
  }

  // --- čelní pohled (idle na hradě) ---
  drawFront() {
    const sh = CONFIG.birdShape;
    const now = millis();

    // průběh protažení 0..1..0 (nahoru a zpět)
    let st = 0;
    if (this.state === S.STRETCHING) {
      const t = (now - this.stateSince) / CONFIG.timing.stretchMs;
      st = Math.sin(constrain(t, 0, 1) * PI); // plynule tam a zpět
    }

    const bodyW = sh.bodyWidth * 1.5;
    const bodyH = sh.bodyLength * 0.9;
    const legLen = sh.legLength * (1 + st * 0.35);    // napnuté nohy při protažení
    const lift = st * sh.legLength * 0.35;            // tělo se zvedne
    const footY = perchSlotPos(this.slot).y;          // nohy stojí na větvičce

    push();
    translate(this.pos.x, footY);

    // nohy (viditelné zepředu, mírně rozkročené)
    stroke(this.shade(0.6)); strokeWeight(2);
    line(-bodyW * 0.18, -legLen, -bodyW * 0.18 - 1, 0);
    line(bodyW * 0.18, -legLen, bodyW * 0.18 + 1, 0);
    // prstíky
    line(-bodyW * 0.18 - 1, 0, -bodyW * 0.18 - 4, 1);
    line(-bodyW * 0.18 - 1, 0, -bodyW * 0.18 + 2, 1);
    line(bodyW * 0.18 + 1, 0, bodyW * 0.18 - 2, 1);
    line(bodyW * 0.18 + 1, 0, bodyW * 0.18 + 4, 1);
    noStroke();

    const bodyCy = -legLen - bodyH * 0.45 - lift;

    // křídla: složená podél těla; při protažení se roztáhnou a zamávají
    const wingAng = 0.15 + st * (1.15 + 0.25 * Math.sin(now * 0.03));
    for (const side of [-1, 1]) {
      push();
      translate(side * bodyW * 0.42, bodyCy - bodyH * 0.1);
      rotate(side * wingAng);
      fill(this.shade(0.25));
      ellipse(side * sh.wingLength * 0.32, bodyH * 0.12,
              sh.wingLength * 0.75, sh.wingLength * 0.4);
      pop();
    }

    // tělo + bříško
    fill(this.color);
    ellipse(0, bodyCy, bodyW, bodyH);
    fill(this.belly());
    ellipse(0, bodyCy + bodyH * 0.12, bodyW * 0.62, bodyH * 0.6);

    // hlava otočená do strany (zobáček míří headDir), při protažení vzhůru
    const headY = bodyCy - bodyH * 0.52 - lift * 0.3;
    const hx = this.headDir * 1.5;
    fill(this.color);
    circle(hx, headY, sh.headRadius * 2);
    fill(255, 160, 40);
    const bx = hx + this.headDir * sh.headRadius * 0.75;
    triangle(bx, headY - 2.2, bx, headY + 2.2,
             bx + this.headDir * sh.beakLength, headY + (st > 0.3 ? -2 : 0.5));
    // oko: občas mrkne (krátká vodorovná čárka místo kuličky)
    if (millis() < this.blinkUntil) {
      stroke(20); strokeWeight(1.4);
      line(hx + this.headDir * 1.3, headY - 1.5, hx + this.headDir * 3.7, headY - 1.5);
      noStroke();
    } else {
      fill(20);
      circle(hx + this.headDir * 2.5, headY - 1.5, 3);
    }

    pop();
  }
}

// =====================================================================
// Citát — vykreslení položených písmen a autora
// =====================================================================

function drawQuote() {
  const now = millis();
  textFont(quoteFont());
  textSize(letters.quoteFontSize);
  textAlign(CENTER, CENTER);
  noStroke();
  const col = themeLerp("text");

  // když břečťan roste ZA písmeny, dostanou písmena obrys v barvě pozadí
  // — kontury zůstanou ostré a dobře čitelné i přes listy pod nimi
  const halo = ivy && ivy.layout === "behind";
  if (halo) {
    const bg = themeLerp("bg");
    stroke(red(bg), green(bg), blue(bg), 230);
    strokeWeight(4);
    strokeJoin(ROUND);
  }

  for (const l of letters) {
    if (!l.placed) continue;
    let x = l.x, y = l.y, a = 255;
    // dopad: písmeno krátce padá z pacek na svou pozici
    if (l.dropFrom) {
      const t = constrain((now - l.dropStart) / CONFIG.timing.letterFallMs, 0, 1);
      const e = 1 - (1 - t) * (1 - t); // ease-out
      x = lerp(l.dropFrom.x, l.x, e);
      y = lerp(l.dropFrom.y, l.y, e);
      if (t >= 1) l.dropFrom = null;
    }
    fill(red(col), green(col), blue(col), a);
    text(l.ch, x, y);
  }

  // autor: fade-in až po složení celého citátu (viz komentář v computeLayout)
  if (quoteDoneAt > 0) {
    const a = constrain((now - quoteDoneAt) / CONFIG.timing.authorFadeMs, 0, 1) * 255;
    textSize(CONFIG.quote.authorFontSize);
    fill(red(col), green(col), blue(col), a * 0.85);
    text("— " + quote.author, authorPos.x, authorPos.y);

    // tlačítko „Zkopírovat odkaz" — objeví se po doznění autora; zkopíruje
    // deep-link na právě složený citát (?lang=…&q=…)
    const ba = constrain((now - quoteDoneAt - CONFIG.timing.authorFadeMs) / 600, 0, 1);
    if (ba > 0) {
      textFont("sans-serif");
      textSize(12);
      const clabel = STRINGS[lang].copyLink;
      const cw = textWidth(clabel) + 24;
      const ch = 24;
      const cx0 = width / 2 - cw / 2;
      const cy0 = authorPos.y + CONFIG.quote.authorFontSize * 1.5;
      uiRects.copy = { x: cx0, y: cy0, w: cw, h: ch };
      fill(red(col), green(col), blue(col), 36 * ba);
      rect(cx0, cy0, cw, ch, ch / 2);
      fill(red(col), green(col), blue(col), 185 * ba);
      text(clabel, width / 2, cy0 + ch / 2 - 1);
    }
  } else {
    delete uiRects.copy; // mimo složený citát tlačítko neexistuje (ani hitbox)
  }
}

// Po položení posledního písmene spustí fade-in autora.
function checkQuoteDone() {
  if (letters.every(l => l.placed)) quoteDoneAt = millis();
}

// =====================================================================
// Břečťan — procedurální větvička podle vodící linky (CONFIG.ivy.enabled)
// ---------------------------------------------------------------------
// Kolem složeného citátu se položí NEVIDITELNÁ vodící křivka (Catmull-Rom
// spline z kontrolních bodů, resamplovaná na konstantní krok po délce)
// a po ní vyroste břečťanová větvička podle předlohy (brectan.png):
//  - stonek linku nekopíruje přesně — osciluje kolem ní po normále
//    (sinus + Perlin noise), od báze ke špičce se zužuje; hnědý, se
//    zrnitým tečkováním a tmavým obrysem,
//  - listy mají charakteristický 5-laločný tvar se srdcovitou bází,
//    variegovanou výplň (světle šedozelená + tmavší skvrny, ořezané do
//    tvaru listu přes canvas clip), skoro bílé žilky do špiček laloků
//    a tmavý obrys; sedí na řapíku, střídají strany stonku, mají náhodné
//    pootočení (±rotJitterDeg) a u špičky úponku se zmenšují,
//  - růst: stonek vyrůstá z A do B (growT dle growthSpeed); list se
//    spawne, když ho stonek míjí, a vyklíčí scale 0 → 1 s lehkým
//    overshootem (easeOutBack). Kreslí se od báze ke špičce (překryvy).
// Při odchodu scény se větvička rozplyne; resize ⇒ vyroste znovu.
// =====================================================================
let ivy = null; // {vines: [{stemPts, cum, total, speckles, leaves}], t0, dying}

// Obdélník, do kterého břečťan nesmí: citát + autor + tlačítko odkazu.
function quoteBounds() {
  const I = CONFIG.ivy;
  const fs = letters.quoteFontSize;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of letters) {
    x0 = Math.min(x0, l.x - fs * 0.5);
    x1 = Math.max(x1, l.x + fs * 0.5);
    y0 = Math.min(y0, l.y - fs * 0.6);
    y1 = Math.max(y1, l.y + fs * 0.6);
  }
  // autor + „Zkopírovat odkaz" pod ním
  y1 = Math.max(y1, authorPos.y + CONFIG.quote.authorFontSize * 2.8);
  x0 = Math.min(x0, authorPos.x - 140);
  x1 = Math.max(x1, authorPos.x + 140);
  return { x0: x0 - I.margin, y0: y0 - I.margin,
           x1: x1 + I.margin, y1: y1 + I.margin };
}

function updateIvy() {
  const I = CONFIG.ivy;
  if (!I.enabled) return;
  if (quoteDoneAt > 0 && !ivy && millis() > quoteDoneAt + I.growDelayMs) {
    buildIvy();
  }
}

const IVY_LAYOUTS = ["single", "multi", "wreath", "behind"];
let lastIvyLayout = null; // nikdy stejný layout dvakrát po sobě

function buildIvy() {
  const I = CONFIG.ivy;
  // pevný seed = reprodukovatelná větvička (ladění); null = pokaždé jiná
  if (I.seed !== null) { randomSeed(I.seed); noiseSeed(I.seed); }
  const b = quoteBounds();
  const center = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
  // na úzkém displeji (mobil) je vedle citátu málo místa — listy věnce
  // se globálně zmenší, ať nelezou do textu ani mimo obraz
  const sideSpace = Math.min(b.x0, width - b.x1);
  const leafScale = constrain((sideSpace - 14) / 40, 0.55, 1);

  // boční větvičky jen tam, kde je vedle citátu místo
  const spots = ["below"];
  if (b.x0 > I.sideMinSpace) spots.push("left");
  if (width - b.x1 > I.sideMinSpace) spots.push("right");

  const layout = random(IVY_LAYOUTS.filter(l => l !== lastIvyLayout));
  lastIvyLayout = layout;

  let vines;
  switch (layout) {
    case "single":
      vines = [makeVine(lineControlPoints(random(spots), b), null, 1)];
      break;
    case "multi": {
      const n = Math.min(spots.length, Math.floor(random(2, 4)));
      vines = shuffle(spots).slice(0, n)
        .map(side => makeVine(lineControlPoints(side, b), null, 1));
      break;
    }
    case "behind":
      // elipsa ZA písmeny — listy plné velikosti, text dostane obrys
      vines = [makeVine(behindControlPoints(b), null, 1)];
      break;
    case "wreath":
    default:
      vines = [makeVine(wreathControlPoints(b), center, leafScale)];
      break;
  }
  ivy = { layout, vines, t0: millis(), dying: 0 };
  // po deterministickém buildu vrať náhodě volnost (kvůli zbytku scény)
  if (I.seed !== null) randomSeed(Math.floor(millis()) % 1e9);
}

// Kontrolní body jedné volně zakroucené větvičky pod/vedle citátu
// (layouty "single" a "multi").
function lineControlPoints(side, b) {
  const pts = [];
  if (side === "below") {
    const dir = random() < 0.5 ? 1 : -1; // zleva doprava, nebo naopak
    const xA = lerp(b.x0, b.x1, dir > 0 ? random(0, 0.15) : random(0.85, 1));
    const xB = lerp(b.x0, b.x1, dir > 0 ? random(0.85, 1) : random(0, 0.15));
    const y = Math.min(b.y1 + random(20, 38), height - 60);
    for (let i = 0; i < 5; i++) {
      pts.push({
        x: lerp(xA, xB, i / 4),
        y: constrain(y + random(-18, 18), b.y1 + 10, height - 26),
      });
    }
  } else {
    const sgn = side === "left" ? -1 : 1;
    const x = side === "left" ? b.x0 - random(20, 36) : b.x1 + random(20, 36);
    const yA = lerp(b.y0, b.y1, random(0, 0.15));
    const yB = Math.min(height - 40, b.y1 + random(30, 110));
    for (let i = 0; i < 4; i++) {
      pts.push({
        x: constrain(x + random(-14, 14) + sgn * i * random(2, 9), 16, width - 16),
        y: lerp(yA, yB, i / 3),
      });
    }
  }
  return pts;
}

// Elipsa procházející ZA písmeny (layout "behind") — užší než citát,
// na výšku přesahuje; s jitterem a mezerou mezi A a B.
function behindControlPoints(b) {
  const I = CONFIG.ivy;
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const rx = (b.x1 - b.x0) / 2 * random(0.55, 0.8);
  const ry = Math.max(40, (b.y1 - b.y0) / 2 * random(1.0, 1.5));
  const start = random(TWO_PI);
  const dir = random() < 0.5 ? 1 : -1;
  const sweep = TWO_PI - random(I.gapRadMin, I.gapRadMax);
  const j = I.jitterOut * 0.6;
  const pts = [];
  for (let i = 0; i < I.wreathPoints; i++) {
    const th = start + dir * sweep * (i / (I.wreathPoints - 1));
    pts.push({
      x: constrain(cx + Math.cos(th) * rx + random(-j, j), 18, width - 18),
      y: constrain(cy + Math.sin(th) * ry + random(-j, j), 18, height - 18),
    });
  }
  return pts;
}

// Vodící linka „kolem dokola": klikatý věnec po obvodu obdélníku citátu.
// Body se počítají paprskem ze středu na obvod obdélníku (+ odsazení pad)
// a klikatí se náhodným vyhnutím SMĚREM VEN (dovnitř by lezly do textu).
// A a B nejsou na stejné souřadnici — výsek obvodu končí o gapRad dřív.
function wreathControlPoints(b) {
  const I = CONFIG.ivy;
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const hw = (b.x1 - b.x0) / 2 + random(I.padMin, I.padMax);
  const hh = (b.y1 - b.y0) / 2 + random(I.padMin, I.padMax);
  const start = random(TWO_PI);                 // odkud věnec vyrůstá
  const dir = random() < 0.5 ? 1 : -1;          // po/proti směru hodin
  const sweep = TWO_PI - random(I.gapRadMin, I.gapRadMax);
  const pts = [];
  for (let i = 0; i < I.wreathPoints; i++) {
    const th = start + dir * sweep * (i / (I.wreathPoints - 1));
    const c = Math.cos(th), s = Math.sin(th);
    // průsečík paprsku se zvětšeným obdélníkem citátu
    const t = 1 / Math.max(Math.abs(c) / hw, Math.abs(s) / hh);
    const m = Math.hypot(c * t, s * t) || 1;
    const out = random(0, I.jitterOut);
    pts.push({
      x: constrain(cx + c * t + (c * t / m) * out, 18, width - 18),
      y: constrain(cy + s * t + (s * t / m) * out, 18, height - 18),
    });
  }
  return pts;
}

// Vodící linka: Catmull-Rom spline přes kontrolní body, resamplovaná na
// konstantní krok po délce — růst pak běží plynule bez ohledu na rozložení
// kontrolních bodů. Vrací {pts, step, total}.
function buildIvyPath(cps) {
  const raw = [];
  for (let i = 0; i < cps.length - 1; i++) {
    const p0 = cps[Math.max(0, i - 1)], p1 = cps[i],
          p2 = cps[i + 1], p3 = cps[Math.min(cps.length - 1, i + 2)];
    for (let t = 0; t < 1; t += 0.04) {
      raw.push({
        x: curvePoint(p0.x, p1.x, p2.x, p3.x, t),
        y: curvePoint(p0.y, p1.y, p2.y, p3.y, t),
      });
    }
  }
  raw.push({ x: cps[cps.length - 1].x, y: cps[cps.length - 1].y });

  const step = 4;
  const pts = [{ x: raw[0].x, y: raw[0].y }];
  let carry = 0;
  let prev = raw[0];
  for (let i = 1; i < raw.length; i++) {
    const cur = raw[i];
    let d = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    while (carry + d >= step && d > 1e-6) {
      const f01 = (step - carry) / d;
      prev = { x: prev.x + (cur.x - prev.x) * f01,
               y: prev.y + (cur.y - prev.y) * f01 };
      pts.push(prev);
      d = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      carry = 0;
    }
    carry += d;
    prev = cur;
  }
  return { pts, step, total: (pts.length - 1) * step };
}

// Tečna polyliny v daném indexu (z sousedních bodů); normála = kolmice.
function pathTangent(pts, i) {
  const a = pts[Math.max(0, i - 1)];
  const b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b.x - a.x, dy = b.y - a.y;
  const m = Math.hypot(dx, dy) || 1;
  return { x: dx / m, y: dy / m };
}

// Index bodu polyliny pro danou ujitou délku (volá se jen při buildu).
function idxAtLen(cum, s) {
  let i = 0;
  while (i < cum.length - 1 && cum[i + 1] < s) i++;
  return i;
}

// Z vodící linky postaví stonek (oscilace po normále) a rozmístí listy.
// center = střed citátu (listy mířící dovnitř se zmenšují, ať nelezou do
// textu), leafScale = globální zmenšení listů na úzkém displeji.
function makeVine(cps, center, leafScale = 1) {
  const I = CONFIG.ivy;
  const guide = buildIvyPath(cps);
  const phase = random(TWO_PI);
  const nseed = random(1000);

  // stonek: vodící linka + (sinus + noise) offset po normále; báze sedí
  // na lince (env 0→1), dál se stonek volně ovíjí
  const stemPts = guide.pts.map((p, i) => {
    const s = i * guide.step;
    const tg = pathTangent(guide.pts, i);
    const env = Math.min(1, s / 50);
    const off = (Math.sin(s * I.waveFrequency * TWO_PI + phase) * 0.7
      + (noise(nseed, s * 0.013) - 0.5) * 1.5) * I.waveAmplitude * env;
    return { x: p.x - tg.y * off, y: p.y + tg.x * off };
  });
  const cum = [0];
  for (let i = 1; i < stemPts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(stemPts[i].x - stemPts[i - 1].x,
      stemPts[i].y - stemPts[i - 1].y));
  }
  const total = cum[cum.length - 1];

  // zrnité tečkování stonku (tmavé i světlé tečky)
  const speckles = [];
  for (let s = 8; s < total; s += I.speckleEvery * random(0.6, 1.5)) {
    const i = idxAtLen(cum, s);
    speckles.push({
      at: s,
      x: stemPts[i].x + random(-1.2, 1.2),
      y: stemPts[i].y + random(-1.2, 1.2),
      r: random(0.5, 1.2),
      light: random() < 0.45,
    });
  }

  // listy: střídavě vlevo/vpravo, řapík ke stonku, náhodná rotace
  // a velikost, u špičky úponku menší
  const leaves = [];
  let side = random() < 0.5 ? 1 : -1;
  for (let s = I.leafSpacing * random(0.5, 0.9); s < total - 14;
       s += I.leafSpacing * random(0.75, 1.3)) {
    const i = idxAtLen(cum, s);
    const tg = pathTangent(stemPts, i);
    const t = s / total;
    let size = I.leafSize * leafScale
      * random(1 - I.leafSizeVar, 1 + I.leafSizeVar)
      * lerp(1, I.leafTipShrink, t);
    const nx = -tg.y * side, ny = tg.x * side; // normála na stranu listu
    // list mířící DOVNITŘ věnce (k textu) je menší, ať se citátu nedotkne
    if (center) {
      const tcx = center.x - stemPts[i].x, tcy = center.y - stemPts[i].y;
      const tm = Math.hypot(tcx, tcy) || 1;
      if ((nx * tcx + ny * tcy) / tm > 0.3) size *= 0.75;
    }
    const pet = size * random(0.35, 0.55);     // délka řapíku
    leaves.push({
      at: s, t,
      sx: stemPts[i].x, sy: stemPts[i].y,      // úchyt řapíku na stonku
      x: stemPts[i].x + nx * pet,              // báze listu
      y: stemPts[i].y + ny * pet,
      ang: Math.atan2(ny, nx)
        + radians(random(-I.rotJitterDeg, I.rotJitterDeg)),
      size,
      seed: random(1000),                      // variegace (deterministická)
      spawnedAt: 0,                            // kdy list vyklíčil (0 = ještě ne)
    });
    side *= -1;
  }

  return { stemPts, cum, total, speckles, leaves };
}

// --- Tvar břečťanového listu -------------------------------------------
// 5-laločný obrys (velký středový lalok, dva boční, dva menší spodní,
// srdcovitá báze) v jednotkové velikosti, hlavní lalok míří +x, báze
// (úchyt řapíku) u počátku. Radius = součet gaussovských „hrbů" laloků;
// uzavření přes zářez u báze vytvoří srdcovitý tvar. Cachuje se.
const IVY_LEAF_BASE_R = 0.35;      // základní poloměr (plnost listu)
const IVY_LOBES = [
  { a: 0, A: 0.75, s: 0.50 },      // velký středový lalok
  { a: 1.0, A: 0.50, s: 0.42 },    // boční laloky
  { a: -1.0, A: 0.50, s: 0.42 },
  { a: 1.9, A: 0.30, s: 0.38 },    // menší spodní laloky
  { a: -1.9, A: 0.30, s: 0.38 },
];
let ivyLeafCache = null;

function ivyLeafOutline() {
  if (ivyLeafCache) return ivyLeafCache;
  const pts = [];
  for (let th = -2.35; th <= 2.351; th += 0.07) {
    let r = IVY_LEAF_BASE_R;
    for (const L of IVY_LOBES) {
      r += L.A * Math.exp(-Math.pow((th - L.a) / L.s, 2));
    }
    pts.push({ x: Math.cos(th) * r, y: Math.sin(th) * r });
  }
  pts.push({ x: -0.08, y: 0 }); // zářez srdcovité báze
  ivyLeafCache = pts;
  return pts;
}

// css barva s alfou 0..1 z hex stringu (pro kreslení přes drawingContext)
function colStr(hex, a) {
  const c = color(hex);
  return "rgba(" + Math.round(red(c)) + "," + Math.round(green(c)) + ","
    + Math.round(blue(c)) + "," + Math.max(0, Math.min(1, a)) + ")";
}

// Jeden břečťanový list: variegovaná výplň (skvrny ořezané do tvaru přes
// canvas clip), světlé žilky do špiček laloků + vedlejší žilky, tmavý
// obrys. seed dělá variegaci deterministickou (žádné blikání mezi snímky).
function drawIvyLeafAt(x, y, ang, size, scl, alpha, seed) {
  if (scl <= 0.02 || alpha <= 0) return;
  const I = CONFIG.ivy;
  const ctx = drawingContext;
  const pts = ivyLeafOutline();

  push();
  translate(x, y);
  rotate(ang);
  scale(size * scl);

  // výplň + variegace (ořez do tvaru listu)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = colStr(I.leafFillLight, alpha);
  ctx.fill();
  ctx.clip();
  for (let k = 0; k < 7; k++) {
    const bx = 0.05 + 0.95 * noise(seed, k * 3);
    const by = (noise(seed, k * 3 + 1) - 0.5) * 1.1;
    const br = 0.12 + 0.22 * noise(seed, k * 3 + 2);
    const dark = noise(seed, k * 3 + 7) > 0.35; // tmavé skvrny + pár světlých
    ctx.beginPath();
    ctx.ellipse(bx, by, br, br * 0.75, noise(seed, k) * 3, 0, TWO_PI);
    ctx.fillStyle = dark ? colStr(I.leafFillDark, alpha * 0.85)
                         : colStr(I.veinColor, alpha * 0.5);
    ctx.fill();
  }
  ctx.restore();

  // žilky: z báze do špičky každého laloku, lehce prohnuté + vedlejší
  ctx.strokeStyle = colStr(I.veinColor, alpha * 0.9);
  ctx.lineWidth = 0.05;
  ctx.lineCap = "round";
  for (const L of IVY_LOBES) {
    const tipR = IVY_LEAF_BASE_R + L.A - 0.1;
    const tx = Math.cos(L.a) * tipR, ty = Math.sin(L.a) * tipR;
    ctx.beginPath();
    ctx.moveTo(-0.02, 0);
    ctx.quadraticCurveTo(tx * 0.45, ty * 0.25, tx, ty);
    ctx.stroke();
  }
  ctx.lineWidth = 0.028;
  for (const m of [0.32, 0.58]) {
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(m, 0);
      ctx.quadraticCurveTo(m + 0.1, sgn * 0.09, m + 0.17, sgn * 0.15);
      ctx.stroke();
    }
  }

  // tmavý obrys (konstantní ~1.4 px na obrazovce bez ohledu na scale)
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.strokeStyle = colStr(I.outlineColor, alpha);
  ctx.lineWidth = 1.4 / (size * scl);
  ctx.stroke();

  pop();
}

// Stonek do dorostlé délky: tmavý podklad (obrys) + hnědé tělo, plynulé
// zužování od báze ke špičce, zrnité tečkování.
function drawIvyStem(v, drawnLen, alpha) {
  const I = CONFIG.ivy;
  const dark = color(I.stemDark), main = color(I.stemColor);
  for (const pass of [0, 1]) {
    const c = pass === 0 ? dark : main;
    stroke(red(c), green(c), blue(c), 255 * alpha);
    for (let i = 1; i < v.stemPts.length; i++) {
      if (v.cum[i - 1] >= drawnLen) break;
      const w = lerp(I.stemThickness, 0.9, v.cum[i] / v.total);
      strokeWeight(pass === 0 ? w + 1.6 : w);
      let x2 = v.stemPts[i].x, y2 = v.stemPts[i].y;
      if (v.cum[i] > drawnLen) {
        const f01 = (drawnLen - v.cum[i - 1]) / (v.cum[i] - v.cum[i - 1]);
        x2 = lerp(v.stemPts[i - 1].x, x2, f01);
        y2 = lerp(v.stemPts[i - 1].y, y2, f01);
      }
      line(v.stemPts[i - 1].x, v.stemPts[i - 1].y, x2, y2);
    }
  }
  noStroke();
  for (const sp of v.speckles) {
    if (sp.at > drawnLen) break;
    const c = sp.light ? color(I.stemLight) : color(I.stemDark);
    fill(red(c), green(c), blue(c), 220 * alpha);
    circle(sp.x, sp.y, sp.r);
  }
}

// klíčení listu s lehkým přestřelem („vyklíčí a dopruží")
function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function drawIvy() {
  if (!ivy) return;
  const I = CONFIG.ivy;
  const now = millis();

  // rozplynutí při odchodu scény
  let alpha = 1;
  if (ivy.dying) {
    alpha = 1 - (now - ivy.dying) / I.fadeMs;
    if (alpha <= 0) { ivy = null; return; }
  }

  // růst: celá větvička se namaluje za growMs (bez ohledu na délku linky)
  const growT = (now - ivy.t0) / I.growMs;

  for (const v of ivy.vines) {
    const drawnLen = Math.min(1, growT) * v.total;
    drawIvyStem(v, drawnLen, alpha);

    // listy odzadu dopředu (od A k B) kvůli přirozeným překryvům;
    // spawn ve chvíli, kdy list stonek míjí, pak klíčení 0 → 1
    for (const lf of v.leaves) {
      if (!lf.spawnedAt && lf.at <= drawnLen) lf.spawnedAt = now;
      if (!lf.spawnedAt) continue;
      const scl = easeOutBack(Math.min(1, (now - lf.spawnedAt) / I.leafGrowMs));
      // řapík od stonku k bázi listu
      const sc = color(I.stemDark);
      stroke(red(sc), green(sc), blue(sc), 230 * alpha);
      strokeWeight(1.1);
      line(lf.sx, lf.sy, lf.x, lf.y);
      noStroke();
      drawIvyLeafAt(lf.x, lf.y, lf.ang, lf.size, scl, alpha, lf.seed);
    }
  }
}

// =====================================================================
// Tranzice odchodu starého citátu (reset „Další citát")
// =====================================================================
// Položená písmena opustí scénu náhodně vybraným způsobem:
//   "fade"    — rozplynou se na místě (s nepatrným stoupáním),
//   "gravity" — spadnou dolů mimo obraz, zrychlují jako při pádu,
//   "scatter" — rozletí se od středu citátu do všech stran a zrychlují,
//   "rise"    — vyplavou nahoru jako balónky, s jemným vlněním.
// Každé písmeno startuje s malým náhodným zpožděním (stagger) — působí to
// organicky, ne jako mechanický povel. Autor odchází spolu s písmeny.
const TRANSITIONS = ["fade", "gravity", "scatter", "rise", "balloons"];

let outgoing = null; // {type, t0, endMs, items: [{ch, x, y, size, vx, vy, delay, …}]}
let lastTransitionType = null; // ochrana proti stejné tranzici dvakrát po sobě

function captureOutgoing() {
  const placed = letters.filter(l => l.placed);
  if (!placed.length) { outgoing = null; return; }
  // náhodný výběr, ale nikdy stejný typ jako při minulém odchodu;
  // balónky (nejefektnější finále) mají v losování dvojnásobnou váhu
  const options = TRANSITIONS.filter(t => t !== lastTransitionType);
  if (options.includes("balloons")) options.push("balloons");
  const type = random(options);
  lastTransitionType = type;
  const T = CONFIG.transition;
  const cx = width / 2, cy = height / 2;

  // u balónků odlétají řádky odshora — zjisti pořadí řádku každého znaku
  const rowYs = [...new Set(placed.map(l => l.y))].sort((a, b) => a - b);
  const rowOf = new Map(rowYs.map((y, i) => [y, i]));

  const items = placed.map(l =>
    makeOutItem(l.ch, l.x, l.y, letters.quoteFontSize, type, cx, cy, rowOf.get(l.y)));
  if (quoteDoneAt > 0) {
    // autor odlétá jako úplně poslední řádek
    const a = makeOutItem("— " + quote.author, authorPos.x, authorPos.y,
      CONFIG.quote.authorFontSize, type, cx, cy, rowYs.length);
    a.isAuthor = true; // autora ptáček nikdy nepropíchne
    items.push(a);
  }

  // konec tranzice: balónky potřebují čas podle počtu řádků, ostatní fixní
  const endMs = type === "balloons"
    ? rowYs.length * T.balloons.rowDelayMs + T.balloons.withinRowMs + T.balloons.tailMs
    : T.durationMs + T.staggerMs;
  outgoing = { type, t0: millis(), endMs, items };
}

function makeOutItem(ch, x, y, size, type, cx, cy, row) {
  const T = CONFIG.transition;
  const it = { ch, x, y, size, vx: 0, vy: 0,
    delay: random(T.staggerMs), sway: random(TWO_PI) };
  if (type === "scatter") {
    // směr od středu citátu ven, s náhodným rozptylem úhlu
    const a = Math.atan2(y - cy, x - cx) + random(-0.6, 0.6);
    const sp = T.scatterSpeed * random(0.7, 1.5);
    it.vx = Math.cos(a) * sp;
    it.vy = Math.sin(a) * sp;
  }
  if (type === "gravity") it.vx = random(-0.4, 0.4);
  if (type === "balloons") {
    const B = T.balloons;
    // řádky startují odshora; uvnitř řádku dostávají písmena balónky
    // cik-cak (náhodně) během withinRowMs — a hned jak balónek mají, letí
    it.delay = row * B.rowDelayMs + random(B.withinRowMs);
    // balónek: světlejší odstín náhodné barvy z palety ptáčků
    it.bCol = lerpColor(color(random(CONFIG.palette)), color(255), B.lighten);
    it.windF = random(0.75, 1.3);  // jak moc tenhle balónek poslouchá vítr
    it.seed = random(1000);        // vlastní příměs k větru (ne řasy ve vodě)
  }
  return it;
}

function drawOutgoing(f) {
  if (!outgoing) return;
  const T = CONFIG.transition;
  const now = millis();
  if (now > outgoing.t0 + outgoing.endMs) { outgoing = null; return; }
  const col = themeLerp("text");
  textFont(quoteFont());
  textAlign(CENTER, CENTER);
  noStroke();

  // společný vítr pro balónky: pomalý Perlin noise, každý balónek si k němu
  // přidává vlastní příměs — hýbou se PODOBNĚ, ale ne stejně (žádné řasy)
  const wind = (noise(9000, now * 0.00045) - 0.5) * 2.2;

  for (const it of outgoing.items) {
    const t = constrain((now - outgoing.t0 - it.delay) / T.durationMs, 0, 1);
    const started = now >= outgoing.t0 + it.delay;
    if (started) {
      switch (outgoing.type) {
        case "fade":
          it.y -= 0.25 * f;
          break;
        case "gravity":
          it.vy += T.gravity * f;
          it.x += it.vx * f;
          it.y += it.vy * f;
          break;
        case "scatter": {
          const grow = Math.pow(1.055, f); // plynulé zrychlování rozletu
          it.vx *= grow; it.vy *= grow;
          it.x += it.vx * f;
          it.y += it.vy * f;
          break;
        }
        case "rise":
          it.vy -= T.riseAccel * f;
          it.y += it.vy * f;
          it.x += Math.sin(now * 0.004 + it.sway) * 0.6 * f;
          break;
        case "balloons": {
          const B = T.balloons;
          if (it.popped) {
            // prásklý balónek: písmeno padá, zrychluje gravitací
            it.vy += T.gravity * f;
            it.x += it.vx * f;
            it.y += it.vy * f;
            break;
          }
          // stoupání: postupná akcelerace se stropem
          it.vy = Math.max(it.vy - B.riseAccel * f, -B.riseMax);
          // vodorovně balónek měkce dojíždí k větru + vlastní příměsi
          const wt = wind * it.windF + (noise(it.seed, now * 0.0009) - 0.5) * 0.9;
          it.vx += (wt - it.vx) * 0.06 * f;
          it.x += it.vx * f;
          it.y += it.vy * f;
          break;
        }
      }
    }

    if (it.y < -it.size * 3) continue;        // už mimo obraz nahoře
    if (it.y > height + it.size * 3) continue; // prásklé spadlo dolů

    // balónek se kreslí POD písmenem v pořadí, ale NAD ním v prostoru
    if (outgoing.type === "balloons" && started && !it.popped) {
      drawBalloon(it, now);
    }

    // alpha: fade/rise mizí postupně, balónky letí plné až mimo obraz,
    // gravity/scatter mizí těsně před koncem
    let alpha = 255;
    if (outgoing.type === "fade" || outgoing.type === "rise") alpha = 255 * (1 - t);
    else if (outgoing.type !== "balloons") alpha = 255 * (1 - Math.max(0, t - 0.75) * 4);
    if (alpha <= 0) continue;
    fill(red(col), green(col), blue(col), alpha);
    textSize(it.size);
    text(it.ch, it.x, it.y);
  }
}

// Balónek nesoucí písmeno: stínovaná koule s odleskem, uzlíkem („balónková
// prdelka") a prohnutým provázkem k písmenu. Ve větru se mírně naklání.
function drawBalloon(it, now) {
  const B = CONFIG.transition.balloons;
  // pozn.: NEpojmenovávat „pop" — zastínilo by p5 funkci pop() níže!
  const inflate = constrain((now - outgoing.t0 - it.delay) / B.popMs, 0, 1);
  const s = inflate * inflate * (3 - 2 * inflate); // smoothstep nafouknutí
  const br = (it.size * 0.38 + 6) * s;          // poloměr dle velikosti písma
  if (br <= 0.5) return;

  const lean = constrain(it.vx * 0.14, -0.45, 0.45); // náklon po větru
  const ax = it.x, ay = it.y - it.size * 0.55;       // úchyt provázku u písmene
  const bx = ax + lean * 38;                          // střed balónku (ve výšce)
  const by = ay - 16 - br * 1.05;

  // provázek: jemně prohnutá křivka od písmene k uzlíku
  const c = it.bCol;
  stroke(red(c), green(c), blue(c), 220 * s);
  strokeWeight(1.2);
  noFill();
  bezier(ax, ay, ax + lean * 10, ay - 8, bx - lean * 8, by + br + 9, bx, by + br + 4);
  noStroke();

  push();
  translate(bx, by);
  rotate(lean);
  // tělo balónku (lehce protáhlé) + tmavší spodek = stínování
  fill(red(c), green(c), blue(c), 245);
  ellipse(0, 0, br * 1.72, br * 2);
  fill(lerpColor(c, color(0, 0, 40), 0.25));
  ellipse(0, br * 0.45, br * 1.3, br * 0.9);
  fill(red(c), green(c), blue(c), 245);
  ellipse(0, br * 0.18, br * 1.6, br * 1.5);
  // odlesk vlevo nahoře
  fill(255, 255, 255, 150);
  ellipse(-br * 0.42, -br * 0.45, br * 0.5, br * 0.72);
  // uzlík — balónková prdelka
  fill(lerpColor(c, color(0, 0, 40), 0.2));
  triangle(-br * 0.18, br * 0.98, br * 0.18, br * 0.98, 0, br * 0.78);
  pop();
}

// Vybere balónek vhodný k prásknutí: ne autora, ne u kraje; přednost mají
// nejpozději startující řádky (zůstávají na scéně nejdéle) a z nich ty
// blízko lovcova hradu — ať souboj s rychle stoupajícím balónkem vyhraje.
function pickPopTarget(hunter) {
  if (!outgoing || outgoing.type !== "balloons") return null;
  const cand = outgoing.items.filter(it => !it.isAuthor
    && it.x > width * 0.12 && it.x < width * 0.88);
  if (!cand.length) return null;
  const maxDelay = Math.max(...cand.map(it => it.delay));
  const late = cand.filter(it => it.delay > maxDelay - 900);
  const pool = (late.length ? late : cand)
    .sort((a, b) => Math.abs(a.x - hunter.pos.x) - Math.abs(b.x - hunter.pos.x));
  return random(pool.slice(0, Math.min(4, pool.length)));
}

// PRÁSK! Balónek praskne (cáry letí), písmeno začne padat gravitací
// a všichni ostatní ptáčci na scéně se leknou a splašeně se rozprchnou
// (i přes horní hranu). Žádný další balónek už nepraskne.
function popBalloon(it, hunter) {
  const P = CONFIG.transition.balloons.pop;
  const now = millis();
  it.popped = true;
  it.vy = 0; // pád začíná z klidu
  sfxPop();
  // cáry balónku — pár „peříček" v jeho barvě
  const br = it.size * 0.38 + 6;
  spawnFeathers(it.x, it.y - it.size * 0.55 - 16 - br, it.bCol, 3);

  for (const b of birds) {
    if (b === hunter || b.state === S.WAITING) continue;
    b.panicUntil = now + P.panicMs;
    // kdo nese písmeno NOVÉHO citátu, upustí ho zpět do zásobníku
    // (vrátí se pro něj, až se uklidní — scéna se vždy dokončí)
    if (b.letter) {
      taskQueue.push(letters.indexOf(b.letter));
      b.letter = null;
    }
    if (b.state !== S.DEPARTING && b.state !== S.TURNING) {
      b.beginDeparting();
    }
    // splašený útěk: někdo doleva, někdo nahoru
    b.exit = random() < 0.5
      ? createVector(-80, random(height * 0.1, height * 0.6))
      : createVector(random(width * 0.2, width * 0.9), -80);
  }
}

// =====================================================================
// Téma den/noc + dekorace pozadí
// =====================================================================

// Interpolovaná barva tématu podle dayness (0 = noc, 1 = den).
function themeLerp(key) {
  return lerpColor(color(CONFIG.theme.night[key]), color(CONFIG.theme.day[key]), dayness);
}

function buildStars() {
  stars = [];
  for (let i = 0; i < CONFIG.scene.starCount; i++) {
    stars.push({
      x: random(width), y: random(height * 0.85),
      r: random(0.6, 2.2), phase: random(TWO_PI),
    });
  }
}

function drawBackdrop() {
  background(themeLerp("bg"));
  const nightA = 1 - dayness;

  // hvězdy (jen v noci, jemné blikání)
  if (nightA > 0.02) {
    const ac = color(CONFIG.theme.night.accent);
    noStroke();
    for (const s of stars) {
      const tw = 0.6 + 0.4 * Math.sin(millis() * 0.0012 + s.phase);
      fill(red(ac), green(ac), blue(ac), 200 * nightA * tw);
      circle(s.x, s.y, s.r);
    }
  }

  // měsíc / slunce vlevo nahoře — crossfade při přechodu režimů
  const cx = CONFIG.scene.celestialX, cy = CONFIG.scene.celestialY, R = 34;
  const moonA = constrain(1 - dayness * 2, 0, 1);
  const sunA = constrain(dayness * 2 - 1, 0, 1);
  noStroke();
  if (moonA > 0) {
    const mc = color(CONFIG.theme.night.accent);
    fill(red(mc), green(mc), blue(mc), 230 * moonA);
    circle(cx, cy, R * 2);
    // srpek: překrytí kruhem v barvě pozadí
    const bg = themeLerp("bg");
    fill(red(bg), green(bg), blue(bg), 255 * moonA);
    circle(cx + R * 0.45, cy - R * 0.2, R * 1.8);
  }
  if (sunA > 0) {
    const sc = color(CONFIG.theme.day.accent);
    stroke(red(sc), green(sc), blue(sc), 200 * sunA);
    strokeWeight(2.5);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TWO_PI + millis() * 0.0001;
      line(cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8),
           cx + Math.cos(a) * (R + 17), cy + Math.sin(a) * (R + 17));
    }
    noStroke();
    fill(red(sc), green(sc), blue(sc), 240 * sunA);
    circle(cx, cy, R * 2);
  }
}

// =====================================================================
// Nebe — vzácné odměny za dlouhé koukání
// Noc: jednou za čas tiše přeletí padající hvězda (meteor).
// Den: pomalu plující obláčky + jednou za čas v dálce přeletí hejno
//      ptáků — jen tlumenou barvou, jako siluety na obzoru.
// =====================================================================
let meteor = null, nextMeteorAt = 0;
let clouds = [];
let distantFlock = null, nextFlockAt = 0;

function buildClouds() {
  clouds = [];
  for (let i = 0; i < CONFIG.sky.cloudCount; i++) {
    clouds.push({
      x: random(width), y: random(height * 0.05, height * 0.3),
      s: random(0.7, 1.4), v: random(0.06, 0.18),
    });
  }
}

function drawSky(f) {
  const now = millis();
  const SK = CONFIG.sky;
  const nightA = 1 - dayness;

  // --- meteor (jen v noci) ---
  if (!meteor && now >= nextMeteorAt && nightA > 0.5) {
    // různě dlouhé a různě rychlé přelety, vždy šikmo dolů
    meteor = {
      x: random(width * 0.25, width * 0.95),
      y: random(height * 0.04, height * 0.35),
      vx: -random(4, 7), vy: random(1.2, 2.2),
      g: random(0.035, 0.06), // gravitace: dráha se stáčí k zemi obloukem
      tail: random(40, 110), t0: now,
    };
  }
  if (meteor) {
    const p = (now - meteor.t0) / SK.meteorDurMs;
    if (p >= 1) {
      meteor = null;
      nextMeteorAt = now + random(SK.meteorMsMin, SK.meteorMsMax);
    } else {
      // mírný gravitační oblouk (velký rádius — žádná komická parabola);
      // ohon sleduje aktuální směr letu, takže se zakřivuje s dráhou
      meteor.vy += meteor.g * f;
      meteor.x += meteor.vx * f;
      meteor.y += meteor.vy * f;
      const a = Math.sin(p * PI) * nightA; // plynule se rozsvítí a zhasne
      const ac = color(CONFIG.theme.night.accent);
      const dirX = -meteor.vx, dirY = -meteor.vy;
      const len = Math.hypot(dirX, dirY);
      // ohon z pár segmentů s klesající alfou
      for (let i = 0; i < 6; i++) {
        const t0 = i / 6, t1 = (i + 1) / 6;
        stroke(red(ac), green(ac), blue(ac), 200 * a * (1 - t0));
        strokeWeight(1.8 * (1 - t0) + 0.3);
        line(meteor.x + dirX / len * meteor.tail * t0,
             meteor.y + dirY / len * meteor.tail * t0,
             meteor.x + dirX / len * meteor.tail * t1,
             meteor.y + dirY / len * meteor.tail * t1);
      }
      noStroke();
      fill(255, 255, 240, 230 * a);
      circle(meteor.x, meteor.y, 3);
    }
  }

  // --- obláčky (jen ve dne, jemné) ---
  if (dayness > 0.02) {
    noStroke();
    for (const c of clouds) {
      c.x += c.v * f;
      if (c.x > width + 120) { c.x = -120; c.y = random(height * 0.05, height * 0.3); }
      fill(255, SK.cloudAlpha * dayness);
      ellipse(c.x, c.y, 95 * c.s, 26 * c.s);
      ellipse(c.x - 32 * c.s, c.y + 6 * c.s, 60 * c.s, 18 * c.s);
      ellipse(c.x + 36 * c.s, c.y + 4 * c.s, 70 * c.s, 20 * c.s);
      ellipse(c.x + 6 * c.s, c.y - 11 * c.s, 55 * c.s, 20 * c.s);
    }
  }

  // --- vzdálené hejno (jen ve dne) ---
  if (!distantFlock && now >= nextFlockAt && dayness > 0.5) {
    const dir = random() < 0.5 ? 1 : -1;
    const n = Math.floor(random(SK.flockSizeMin, SK.flockSizeMax + 1));
    const members = [];
    // volná V formace: střídavě nahoru/dolů od vedoucího, s rozptylem
    for (let i = 0; i < n; i++) {
      const rank = Math.ceil(i / 2);
      const side = i % 2 === 0 ? 1 : -1;
      members.push({
        dx: -rank * 13 * dir + random(-4, 4),
        dy: rank * side * 5 + random(-3, 3),
        phase: random(TWO_PI),
      });
    }
    distantFlock = {
      x: dir > 0 ? -80 - n * 7 : width + 80 + n * 7,
      y: random(height * 0.08, height * 0.32),
      dir, v: random(0.55, 0.85), members,
    };
  }
  if (distantFlock) {
    const fl = distantFlock;
    fl.x += fl.v * fl.dir * f;
    if ((fl.dir > 0 && fl.x > width + 120) || (fl.dir < 0 && fl.x < -120)) {
      distantFlock = null;
      nextFlockAt = now + random(SK.flockMsMin, SK.flockMsMax);
    } else {
      // tlumená barva — jako siluety ptáků v dálce
      const tc = themeLerp("text");
      const bg = themeLerp("bg");
      const mc = lerpColor(tc, bg, 0.45);
      stroke(red(mc), green(mc), blue(mc), 150 * dayness);
      strokeWeight(1.4);
      noFill();
      for (const m of fl.members) {
        const bx = fl.x + m.dx;
        const by = fl.y + m.dy + Math.sin(now * 0.0018 + m.phase) * 2;
        // mávání v dálce: rozevírání/zavírání "V" siluety
        const flap = Math.sin(now * 0.012 + m.phase) * 3;
        line(bx - 4 * fl.dir, by - flap, bx, by);
        line(bx, by, bx + 4 * fl.dir, by - flap);
      }
      noStroke();
    }
  }
}

// =====================================================================
// Peříčka — vzácně se snesou při položení písmene / dosednutí na hrad
// =====================================================================
let feathers = [];

function spawnFeathers(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    feathers.push({
      x: x + random(-4, 4), y: y + random(-2, 2),
      vx: random(-0.3, 0.3), vy: random(0.15, 0.4),
      swayAmp: random(7, 15), phase: random(TWO_PI),
      rot: random(-0.5, 0.5),
      t0: millis(), durMs: random(CONFIG.feathers.durMsMin, CONFIG.feathers.durMsMax),
      col: lerpColor(col, color(255), 0.35),
    });
  }
}

function drawFeathers(f) {
  const now = millis();
  for (let i = feathers.length - 1; i >= 0; i--) {
    const fe = feathers[i];
    const p = (now - fe.t0) / fe.durMs;
    if (p >= 1) { feathers.splice(i, 1); continue; }
    fe.x += fe.vx * f;
    fe.y += fe.vy * f;
    const rx = fe.x + Math.sin(now * 0.004 + fe.phase) * fe.swayAmp * p;
    const rot = fe.rot + Math.sin(now * 0.003 + fe.phase) * 0.7;
    push();
    translate(rx, fe.y);
    rotate(rot);
    noStroke();
    fill(red(fe.col), green(fe.col), blue(fe.col), 220 * (1 - p));
    ellipse(0, 0, 7, 3);                       // pírko
    stroke(red(fe.col), green(fe.col), blue(fe.col), 160 * (1 - p));
    strokeWeight(0.8);
    line(-4, 0, 4, 0);                          // brk
    pop();
    noStroke();
  }
}

// =====================================================================
// Zvuk — procedurální WebAudio (žádné soubory, jen oscilátory + obálky)
// =====================================================================
let soundOn = CONFIG.audio.defaultOn;  // přepínač uživatele (UI / klávesa Z)
let audioCtx = null;                   // líně vytvořený AudioContext
let audioMaster = null;                // hlavní gain (CONFIG.audio.masterGain)

// Líná inicializace — AudioContext smí vzniknout/odmlčet se až po gestu
// uživatele (klik, klávesa); do té doby se tóny prostě neplánují.
function audioEnsure() {
  if (!soundOn) return false;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    audioCtx = new AC();
    audioMaster = audioCtx.createGain();
    audioMaster.gain.value = CONFIG.audio.masterGain;
    audioMaster.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return true;
}

// Jeden měkký tón: oscilátor s klouzavou frekvencí a rychlou obálkou.
// Všechny zvuky aplikace jsou poskládané jen z těchhle tónů.
function tone(freqFrom, freqTo, durMs, gain, delayMs = 0, type = "sine") {
  if (!audioEnsure()) return;
  const t0 = audioCtx.currentTime + delayMs / 1000;
  const dur = durMs / 1000;
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(freqFrom, 1), t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 1), t0 + dur);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + dur * 0.18);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env);
  env.connect(audioMaster);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// „Naložení" písmene za kamerou — tlumený stoupavý dvojtón (à la Bounty Bob,
// ale měkce: děje se mimo obraz, tak je i zvuk decentní).
function sfxPickup() {
  const g = CONFIG.audio.pickupGain;
  tone(520, 780, 70, g * 0.6);
  tone(780, 1060, 90, g, 75);
}

// Položení písmene — krátké měkké „ťuk" směrem dolů + tichý spodní doťuk.
function sfxDrop() {
  const g = CONFIG.audio.dropGain;
  tone(980, 620, 110, g);
  tone(320, 290, 60, g * 0.35, 10, "triangle");
}

// Prásknutí balónku — krátký šumový výbuch + tlumený spodní dozvuk.
function sfxPop() {
  if (!audioEnsure()) return;
  const t0 = audioCtx.currentTime;
  const dur = 0.09;
  const buf = audioCtx.createBuffer(1,
    Math.ceil(audioCtx.sampleRate * dur), audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.6);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const env = audioCtx.createGain();
  env.gain.setValueAtTime(CONFIG.audio.popGain, t0);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(env);
  env.connect(audioMaster);
  src.start(t0);
  tone(150, 55, 120, CONFIG.audio.popGain * 0.5); // spodní „puch"
}

// Cvrlik sedícího ptáčka — 2–4 rychlé tóny kolem jeho vlastní výšky hlasu.
function sfxChirp(basePitch) {
  const g = CONFIG.audio.chirpGain;
  const n = Math.floor(random(2, 5));
  let t = 0;
  for (let i = 0; i < n; i++) {
    const f = basePitch * random(0.85, 1.25);
    tone(f, f * random(0.8, 1.3), random(45, 90), g * random(0.5, 1), t);
    t += random(70, 140);
  }
}

// =====================================================================
// Ovládací prvky (kreslené přímo na plátno, vpravo nahoře)
// =====================================================================

function drawUI() {
  const U = CONFIG.ui;
  const tc = themeLerp("text");

  // --- rozložení: jedna vodorovná řada zprava doleva, na úzkém displeji
  // (mobil) se přebývající prvky zalomí na další řádek — nic nepřekrývá
  // ptáčky na hradě
  textFont("sans-serif");
  const nextLabel = STRINGS[lang].next;
  // segmentový přepínač jazyka: [vlajka CZ | vlajka EN], aktivní podsvícený —
  // je vidět stav i to, kam jde kliknout (žádná nejasnost „stav vs. akce")
  const flagW = 18, flagH = 12;
  textSize(12);
  const segW = flagW + 5 + Math.max(textWidth("CZ"), textWidth("EN")) + 14;
  textSize(U.fontSize);
  const items = [
    { k: "toggle", w: U.toggleW },
    { k: "sound", w: 46 },
    { k: "next", w: textWidth(nextLabel) + 26 },
    { k: "lang", w: segW * 2 + 6 },
  ];
  let px = width - U.marginRight, py = U.marginTop;
  for (const it of items) {
    if (px - it.w < 12) { px = width - U.marginRight; py += U.buttonH + U.gap; }
    px -= it.w;
    it.x = px;
    it.y = py;
    px -= U.gap;
    uiRects[it.k] = { x: it.x, y: it.y, w: it.w, h: U.buttonH };
  }
  const get = k => items.find(i => i.k === k);

  // --- přepínač den/noc (pill s posuvným kolečkem) ---
  {
    const it = get("toggle");
    const tx = it.x, ty = it.y + (U.buttonH - U.toggleH) / 2;
    noStroke();
    fill(red(tc), green(tc), blue(tc), 50);
    rect(tx, ty, U.toggleW, U.toggleH, U.toggleH / 2);
    // ikonky na koncích dráhy: měsíc vlevo, slunce vpravo
    fill(red(tc), green(tc), blue(tc), 160);
    circle(tx + U.toggleH / 2, ty + U.toggleH / 2, 10);            // měsíc
    fill(themeLerp("bg"));
    circle(tx + U.toggleH / 2 + 3, ty + U.toggleH / 2 - 2, 9);     // srpek
    stroke(red(tc), green(tc), blue(tc), 160); strokeWeight(1.5);
    const sx = tx + U.toggleW - U.toggleH / 2, sy = ty + U.toggleH / 2;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TWO_PI;
      line(sx + Math.cos(a) * 5.5, sy + Math.sin(a) * 5.5,
           sx + Math.cos(a) * 7.5, sy + Math.sin(a) * 7.5);
    }
    noStroke();
    fill(red(tc), green(tc), blue(tc), 160);
    circle(sx, sy, 7);                                              // slunce
    // posuvné kolečko (pozice sleduje plynulý přechod dayness)
    const knobX = lerp(tx + U.toggleH / 2, tx + U.toggleW - U.toggleH / 2, dayness);
    fill(themeLerp("accent"));
    circle(knobX, ty + U.toggleH / 2, U.toggleH - 8);
  }

  // --- přepínač zvuku (pilulka s reproduktorem) ---
  {
    const it = get("sound");
    const sy0 = it.y + (U.buttonH - U.toggleH) / 2;
    noStroke();
    fill(red(tc), green(tc), blue(tc), 50);
    rect(it.x, sy0, it.w, U.toggleH, U.toggleH / 2);
    // reproduktor: tělo (obdélníček) + membrána rozšiřující se DOPRAVA
    const scx = it.x + it.w / 2 - 5, scy = sy0 + U.toggleH / 2;
    fill(red(tc), green(tc), blue(tc), 235);
    rect(scx - 8, scy - 3.5, 5, 7, 1);
    quad(scx - 3, scy - 3.5, scx + 3, scy - 8.5,
         scx + 3, scy + 8.5, scx - 3, scy + 3.5);
    if (soundOn) {
      noFill();
      stroke(red(tc), green(tc), blue(tc), 235);
      strokeWeight(2);
      arc(scx + 6, scy, 11, 13, -QUARTER_PI, QUARTER_PI);
      arc(scx + 6, scy, 19, 22, -QUARTER_PI, QUARTER_PI);
      noStroke();
    } else {
      stroke(red(tc), green(tc), blue(tc), 235);
      strokeWeight(2.5);
      line(scx - 8, scy + 8, scx + 14, scy - 8);
      noStroke();
    }
  }

  // --- tlačítko „Další citát" / "Next quote" ---
  // Záměrně viditelné pořád (ne jen po složení): slouží i k přeskočení citátu.
  {
    const it = get("next");
    fill(red(tc), green(tc), blue(tc), 50);
    rect(it.x, it.y, it.w, U.buttonH, U.buttonH / 2);
    fill(tc);
    textAlign(CENTER, CENTER);
    text(nextLabel, it.x + it.w / 2, it.y + U.buttonH / 2 - 1);
  }

  // --- přepínač jazyka: segmenty [CZ | EN], aktivní podsvícený ---
  {
    const it = get("lang");
    fill(red(tc), green(tc), blue(tc), 50);
    rect(it.x, it.y, it.w, U.buttonH, U.buttonH / 2);
    const activeIdx = lang === "cs" ? 0 : 1;
    // podsvícení aktivního segmentu
    fill(red(tc), green(tc), blue(tc), 70);
    rect(it.x + 3 + activeIdx * segW, it.y + 3, segW, U.buttonH - 6,
      (U.buttonH - 6) / 2);
    textSize(12);
    textAlign(LEFT, CENTER);
    const segLangs = ["cs", "en"], segCodes = ["CZ", "EN"];
    for (let i = 0; i < 2; i++) {
      const sx = it.x + 3 + i * segW;
      drawFlag(segLangs[i], sx + 8, it.y + (U.buttonH - flagH) / 2, flagW, flagH);
      if (i !== activeIdx) {
        // neaktivní segment ztlumit závojem v barvě pozadí
        const bg = themeLerp("bg");
        fill(red(bg), green(bg), blue(bg), 110);
        rect(sx, it.y + 2, segW, U.buttonH - 4, (U.buttonH - 4) / 2);
      }
      fill(red(tc), green(tc), blue(tc), i === activeIdx ? 255 : 150);
      text(segCodes[i], sx + 8 + flagW + 5, it.y + U.buttonH / 2 - 1);
    }
    textSize(U.fontSize);
  }

  // kurzor ruky nad klikacími prvky
  const over = Object.values(uiRects).some(r =>
    mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h);
  cursor(over ? HAND : ARROW);

  // toast — krátké potvrzení (např. zkopírovaný odkaz), dole uprostřed
  if (millis() < toastUntil) {
    const ta = constrain((toastUntil - millis()) / 400, 0, 1); // dozní fade-outem
    textFont("sans-serif");
    textSize(13);
    const tw = textWidth(toastText) + 28;
    fill(red(tc), green(tc), blue(tc), 60 * ta);
    rect(width / 2 - tw / 2, height - 64, tw, 30, 15);
    fill(red(tc), green(tc), blue(tc), 230 * ta);
    textAlign(CENTER, CENTER);
    text(toastText, width / 2, height - 64 + 14);
  }
}

// Vlajka kreslená z primitiv (žádné obrázky): česká, zjednodušený Union Jack.
function drawFlag(l, x, y, w, h) {
  noStroke();
  if (l === "cs") {
    fill(255);
    rect(x, y, w, h / 2);
    fill(215, 20, 26);
    rect(x, y + h / 2, w, h / 2);
    fill(17, 69, 126);
    triangle(x, y, x, y + h, x + w * 0.45, y + h / 2);
  } else {
    fill(1, 33, 105);
    rect(x, y, w, h);
    stroke(255); strokeWeight(2.4);
    line(x, y, x + w, y + h);
    line(x + w, y, x, y + h);
    stroke(200, 16, 46); strokeWeight(1.1);
    line(x, y, x + w, y + h);
    line(x + w, y, x, y + h);
    stroke(255); strokeWeight(3.6);
    line(x + w / 2, y, x + w / 2, y + h);
    line(x, y + h / 2, x + w, y + h / 2);
    stroke(200, 16, 46); strokeWeight(2);
    line(x + w / 2, y, x + w / 2, y + h);
    line(x, y + h / 2, x + w, y + h / 2);
    noStroke();
  }
}

function mousePressed() {
  // jakékoli gesto smí rozjet audio (autoplay policy) — když je zvuk zapnutý
  audioEnsure();
  lastInteractionMs = millis(); // odklad režimu spořiče
  for (const [k, r] of Object.entries(uiRects)) {
    if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
      if (k === "toggle") dayTarget = 1 - dayTarget;
      if (k === "next") startScene(false);
      if (k === "sound") { soundOn = !soundOn; audioEnsure(); }
      if (k === "lang") {
        // klik na konkrétní segment (levá půlka = CZ, pravá = EN)
        const target = mouseX < r.x + r.w / 2 ? "cs" : "en";
        if (target !== lang) { setLang(target); startScene(false); }
      }
      if (k === "copy") {
        copyText(location.href);
        toastText = STRINGS[lang].copied;
        toastUntil = millis() + 2000;
      }
      return;
    }
  }
}

function keyPressed() {
  audioEnsure(); // gesto uživatele — případné rozjetí audia
  lastInteractionMs = millis(); // odklad režimu spořiče
  if (key === "m" || key === "M") dayTarget = 1 - dayTarget;          // den/noc
  if (key === "n" || key === "N") startScene(false);                  // další citát
  if (key === "z" || key === "Z") { soundOn = !soundOn; audioEnsure(); } // zvuk
  if (key === "l" || key === "L") {                                   // jazyk
    setLang(lang === "cs" ? "en" : "cs");
    startScene(false);
  }
}

// =====================================================================
// Hlavní smyčka
// =====================================================================

function draw() {
  // f = násobek „normovaného" snímku 60 fps (fyzika nezávislá na fps)
  const f = constrain(deltaTime / (1000 / 60), 0, 3);

  // plynulý (tranzientní) přechod den/noc
  const step = deltaTime / CONFIG.scene.modeTransitionMs;
  dayness = constrain(dayness + Math.sign(dayTarget - dayness) *
    Math.min(step, Math.abs(dayTarget - dayness)), 0, 1);

  drawBackdrop();
  drawSky(f);      // meteor (noc), obláčky a vzdálené hejno (den)
  drawOutgoing(f); // odcházející starý citát (pod tím novým)
  updateIvy();     // břečťan roste po složení citátu (feature flag)
  drawIvy(f);
  drawQuote();
  updatePerchSpring(f);
  drawPerchBar();

  for (const b of birds) b.update(f);
  for (const b of birds) b.draw();

  drawFeathers(f);
  updatePerchSwap();
  updateAutoNext();
  drawUI();
}

// Občas si dva sedící ptáčci prohodí místa — oba vzlétnou, křižnou se
// a dosednou opačně. Plánuje se až po složení citátu, ať to neruší práci.
function updatePerchSwap() {
  const now = millis();
  const perched = birds.filter(b => b.state === S.PERCHED);
  if (quoteDoneAt === 0 || perched.length < 2) return;
  if (nextSwapAt === 0) {
    nextSwapAt = now + random(CONFIG.perch.swapMsMin, CONFIG.perch.swapMsMax);
    return;
  }
  if (now < nextSwapAt) return;
  nextSwapAt = now + random(CONFIG.perch.swapMsMin, CONFIG.perch.swapMsMax);
  const a = random(perched);
  let b;
  do { b = random(perched); } while (b === a);
  [a.slot, b.slot] = [b.slot, a.slot];
  for (const bird of [a, b]) {
    perchSpringKick(CONFIG.perchSpring.takeoffKick, bird.slot);
    const t = bird.perchTarget();
    // vzlet šikmo vzhůru směrem k novému místu — vznikne hezký oblouček
    bird.vel.set(Math.sign(t.x - bird.pos.x) * 1.4, -2.4);
    bird.setState(S.FLY_TO_PERCH);
  }
}

// Režim spořiče: po složení citátu a době klidu se sám spustí další.
function updateAutoNext() {
  const ms = CONFIG.scene.autoNextMs;
  if (ms <= 0 || quoteDoneAt === 0) return;
  if (millis() - Math.max(quoteDoneAt, lastInteractionMs) > ms) {
    startScene(false);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildStars();
  buildClouds();
  ivy = null; // břečťan se po resize vygeneruje znovu k novému layoutu
  computeLayout();
  // sedící ptáčci se přesadí na přepočítané sloty hradu
  for (const b of birds) {
    if (b.state === S.PERCHED || b.state === S.STRETCHING) {
      const t = b.perchTarget();
      b.pos.set(t.x, t.y);
    }
  }
}
