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
    riseAccel: 0.06,             // zrychlení stoupání (varianta „rise" — balónky)
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
// QUOTES — offline zásoba citátů (snadno ručně doplnitelná)
// =====================================================================
const QUOTES = [
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
let uiRects = {};        // hitboxy ovládacích prvků {toggle, next}

function preload() {
  // Volitelný vlastní font — když není dodán soubor, zůstane web-safe z CONFIG.
  if (CONFIG.quote.fontFile) loadedFont = loadFont(CONFIG.quote.fontFile);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  dayTarget = CONFIG.scene.defaultMode === "day" ? 1 : 0;
  dayness = dayTarget;
  buildStars();
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

  // vyber nový citát (při resetu jiný než aktuální)
  let q;
  do { q = random(QUOTES); } while (QUOTES.length > 1 && quote && q === quote);
  quote = q;
  quoteDoneAt = 0;

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
    // reset: ptáčci na scéně (typicky na hradě) odletí doleva a vrátí se
    // s písmeny nového citátu; kdo je mimo obrazovku, jen dostane novou pauzu
    let delay = 0;
    for (const b of birds) {
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

// Pozice sedátka pro ptáčka s daným slotem (sloty rozmístěné rovnoměrně).
function perchSlotPos(slot) {
  const g = perchGeom();
  const n = CONFIG.birds.count;
  const t = (slot + 0.5) / n;
  const x = lerp(g.x0, g.x1, t);
  // prohnutí větvičky — parabola s maximem uprostřed
  const y = g.y + CONFIG.perchBar.sag * 4 * t * (1 - t);
  return { x, y };
}

function drawPerchBar() {
  const g = perchGeom();
  const c = themeLerp("text");
  stroke(red(c), green(c), blue(c), 170);
  strokeWeight(3);
  noFill();
  // prohnutá větvička + dva háčky na koncích (drátek zavěšený do scény)
  beginShape();
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    vertex(lerp(g.x0, g.x1, t), g.y + CONFIG.perchBar.sag * 4 * t * (1 - t));
  }
  endShape();
  line(g.x0, g.y, g.x0 - 8, g.y - 14);
  line(g.x1, g.y, g.x1 + 8, g.y - 14);
  strokeWeight(1);
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
    this.exit = createVector(-80, random(height * 0.15, height * 0.85));
    this.extraWait = extraWaitMs;
    this.setState(S.TURNING);
  }

  // max rychlost konkrétního ptáčka (horlivec létá rychleji než loudal)
  vMax() { return CONFIG.flight.maxSpeed * this.speedFactor; }

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
        if (this.pos.x < -70) {
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
        break;

      case S.STRETCHING:
        // protažení: napne nohy, roztáhne a zamává křídly, vrátí se do idle
        this.pos.x = this.perchTarget().x + this.shuffleX;
        if (now - this.stateSince > CONFIG.timing.stretchMs) {
          this.setState(S.PERCHED);
          this.headTurnAt = now + random(CONFIG.perch.headTurnMsMin, CONFIG.perch.headTurnMsMax);
        }
        break;
    }

    // --- plynulé tranzice animačních parametrů mezi stavy ---
    // Stav určuje jen CÍLE (náklon, frekvence/rozsah mávání, úhel letu,
    // otočení); k nim se dojíždí exponenciálním easingem, takže změna stavu
    // nikdy neudělá skok pózy během jednoho frame.
    const W = CONFIG.wings;
    const flying = [S.SPAWNING, S.CARRYING, S.DEPARTING, S.FLY_TO_PERCH].includes(this.state);
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
    fill(20);
    circle(hx + this.headDir * 2.5, headY - 1.5, 3);

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
  }
}

// Po položení posledního písmene spustí fade-in autora.
function checkQuoteDone() {
  if (letters.every(l => l.placed)) quoteDoneAt = millis();
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
const TRANSITIONS = ["fade", "gravity", "scatter", "rise"];

let outgoing = null; // {type, t0, items: [{ch, x, y, size, vx, vy, delay, sway}]}

function captureOutgoing() {
  const placed = letters.filter(l => l.placed);
  if (!placed.length) { outgoing = null; return; }
  const type = random(TRANSITIONS);
  const cx = width / 2, cy = height / 2;
  const items = placed.map(l =>
    makeOutItem(l.ch, l.x, l.y, letters.quoteFontSize, type, cx, cy));
  if (quoteDoneAt > 0) {
    items.push(makeOutItem("— " + quote.author, authorPos.x, authorPos.y,
      CONFIG.quote.authorFontSize, type, cx, cy));
  }
  outgoing = { type, t0: millis(), items };
}

function makeOutItem(ch, x, y, size, type, cx, cy) {
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
  return it;
}

function drawOutgoing(f) {
  if (!outgoing) return;
  const T = CONFIG.transition;
  const now = millis();
  if (now > outgoing.t0 + T.durationMs + T.staggerMs) { outgoing = null; return; }
  const col = themeLerp("text");
  textFont(quoteFont());
  textAlign(CENTER, CENTER);
  noStroke();
  for (const it of outgoing.items) {
    const t = constrain((now - outgoing.t0 - it.delay) / T.durationMs, 0, 1);
    if (t > 0) {
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
      }
    }
    // pohybové varianty mizí až ke konci (do té doby letí plně viditelné)
    const alpha = (outgoing.type === "fade" || outgoing.type === "rise")
      ? 255 * (1 - t)
      : 255 * (1 - Math.max(0, t - 0.75) * 4);
    if (alpha <= 0) continue;
    fill(red(col), green(col), blue(col), alpha);
    textSize(it.size);
    text(it.ch, it.x, it.y);
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
  const cx = 90, cy = 95, R = 34;
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
  const x1 = width - U.marginRight;

  // --- přepínač den/noc (pill s posuvným kolečkem) ---
  const tx = x1 - U.toggleW, ty = U.marginTop;
  uiRects.toggle = { x: tx, y: ty, w: U.toggleW, h: U.toggleH };
  const tc = themeLerp("text");
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

  // --- přepínač zvuku (pilulka s reproduktorem, vlevo od den/noc) ---
  // širší tvar a kontrastnější ikona, ať je stav čitelný na první pohled
  const sw = 46, sh = U.toggleH;
  const sx0 = tx - sw - U.gap, sy0 = ty;
  uiRects.sound = { x: sx0, y: sy0, w: sw, h: sh };
  noStroke();
  fill(red(tc), green(tc), blue(tc), 50);
  rect(sx0, sy0, sw, sh, sh / 2);
  // reproduktor: tělo + trychtýř (větší, plný kontrast)
  const scx = sx0 + sw / 2 - 5, scy = sy0 + sh / 2;
  fill(red(tc), green(tc), blue(tc), 235);
  rect(scx - 7, scy - 3.5, 5, 7, 1);
  triangle(scx - 2.5, scy - 7.5, scx - 2.5, scy + 7.5, scx + 5, scy);
  if (soundOn) {
    // dvě zvukové vlnky
    noFill();
    stroke(red(tc), green(tc), blue(tc), 235);
    strokeWeight(2);
    arc(scx + 6, scy, 11, 13, -QUARTER_PI, QUARTER_PI);
    arc(scx + 6, scy, 19, 22, -QUARTER_PI, QUARTER_PI);
    noStroke();
  } else {
    // výrazné přeškrtnutí přes celou ikonu
    stroke(red(tc), green(tc), blue(tc), 235);
    strokeWeight(2.5);
    line(scx - 8, scy + 8, scx + 14, scy - 8);
    noStroke();
  }

  // --- tlačítko „Další citát" ---
  // Záměrně viditelné pořád (ne jen po složení): slouží i k přeskočení
  // citátu; zadání ho vyžaduje jako reset po dokončení.
  textFont("sans-serif");
  textSize(U.fontSize);
  const label = "Další citát";
  const bw = textWidth(label) + 26;
  const bx = x1 - bw, by = ty + U.toggleH + U.gap;
  uiRects.next = { x: bx, y: by, w: bw, h: U.buttonH };
  fill(red(tc), green(tc), blue(tc), 50);
  rect(bx, by, bw, U.buttonH, U.buttonH / 2);
  fill(tc);
  textAlign(CENTER, CENTER);
  text(label, bx + bw / 2, by + U.buttonH / 2 - 1);

  // kurzor ruky nad klikacími prvky
  const over = ["toggle", "next", "sound"].some(k => {
    const r = uiRects[k];
    return mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h;
  });
  cursor(over ? HAND : ARROW);
}

function mousePressed() {
  // jakékoli gesto smí rozjet audio (autoplay policy) — když je zvuk zapnutý
  audioEnsure();
  for (const [k, r] of Object.entries(uiRects)) {
    if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
      if (k === "toggle") dayTarget = 1 - dayTarget;
      if (k === "next") startScene(false);
      if (k === "sound") { soundOn = !soundOn; audioEnsure(); }
      return;
    }
  }
}

function keyPressed() {
  audioEnsure(); // gesto uživatele — případné rozjetí audia
  if (key === "m" || key === "M") dayTarget = 1 - dayTarget;          // den/noc
  if (key === "n" || key === "N") startScene(false);                  // další citát
  if (key === "z" || key === "Z") { soundOn = !soundOn; audioEnsure(); } // zvuk
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
  drawOutgoing(f); // odcházející starý citát (pod tím novým)
  drawQuote();
  drawPerchBar();

  for (const b of birds) b.update(f);
  for (const b of birds) b.draw();

  drawUI();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildStars();
  computeLayout();
  // sedící ptáčci se přesadí na přepočítané sloty hradu
  for (const b of birds) {
    if (b.state === S.PERCHED || b.state === S.STRETCHING) {
      const t = b.perchTarget();
      b.pos.set(t.x, t.y);
    }
  }
}
