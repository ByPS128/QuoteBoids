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
    arriveRadius: 110,             // vzdálenost od cíle, kdy začíná landing
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

  // --- steering: plynulé dolétání k cíli (arrive) ---
  steerTo(target, f, maxForce, brake) {
    const toT = p5.Vector.sub(target, this.pos);
    const d = toT.mag();
    let desiredSpeed = CONFIG.flight.maxSpeed;
    if (brake) desiredSpeed = constrain(
      CONFIG.flight.maxSpeed * d / CONFIG.flight.arriveRadius, 0.4, CONFIG.flight.maxSpeed);
    const desired = toT.copy().setMag(desiredSpeed);
    const steer = p5.Vector.sub(desired, this.vel).limit(maxForce * f);
    this.vel.add(steer);
    this.vel.limit(CONFIG.flight.maxSpeed);
    return d;
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
        // a když už žádné nezbývá, letí rovnou na své místo na hradě
        if (now >= this.waitUntil) {
          if (taskQueue.length > 0) {
            this.letter = letters[taskQueue.pop()];
            this.pos.set(-60, random(height * 0.12, height * 0.88));
            this.vel = p5.Vector.sub(this.letterTarget(), this.pos).setMag(FL.spawnSpeed);
            this.setState(S.SPAWNING);
          } else {
            this.pos.set(-60, random(height * 0.1, height * 0.4));
            this.vel = p5.Vector.sub(this.perchTarget(), this.pos).setMag(FL.spawnSpeed);
            this.setState(S.FLY_TO_PERCH);
          }
        }
        break;

      case S.SPAWNING:
        // krátké nasazení do letu — rozjezd, pak plynule do carrying
        this.steerTo(this.letterTarget(), f, FL.acceleration, false);
        this.integrate(f);
        if (now - this.stateSince > 400) this.setState(S.CARRYING);
        break;

      case S.CARRYING: {
        const d = this.steerTo(this.letterTarget(), f, FL.acceleration, false);
        this.integrate(f);
        if (d < FL.arriveRadius) this.setState(S.LANDING);
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
          this.setState(S.DROPPING);
          checkQuoteDone();
        }
        break;
      }

      case S.DROPPING:
        // krátká pauza na místě — ptáček „pustil" a srovnává se
        if (now - this.stateSince > CONFIG.timing.dropMs) this.beginDeparting();
        break;

      case S.TURNING:
        // otočka proti směru odletu (mimo obrazovku vlevo, náhodná výška)
        this.facing = -1;
        if (now - this.stateSince > CONFIG.timing.turnMs) this.setState(S.DEPARTING);
        break;

      case S.DEPARTING: {
        // zrychluje pryč; po nabrání rychlosti už jen klidně plachtí
        this.steerTo(this.exit, f, CONFIG.flight.acceleration * 1.4, false);
        this.integrate(f);
        if (this.pos.x < -70) {
          this.setState(S.WAITING);
          this.waitUntil = now + (this.extraWait || 0)
            + random(CONFIG.birds.waitMsMin, CONFIG.birds.waitMsMax);
          this.extraWait = 0;
        }
        break;
      }

      case S.FLY_TO_PERCH: {
        const d = this.steerTo(this.perchTarget(), f, FL.acceleration, false);
        this.integrate(f);
        if (d < FL.arriveRadius * 0.7) this.setState(S.LANDING_PERCH);
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

    // posun fáze mávání podle stavu (na hradě křídla nemávají)
    const flying = [S.SPAWNING, S.CARRYING, S.DEPARTING, S.FLY_TO_PERCH].includes(this.state);
    const braking = [S.LANDING, S.LANDING_PERCH, S.DROPPING, S.TURNING].includes(this.state);
    if (flying) this.flapPhase += CONFIG.wings.flapFreqCruise * f * TWO_PI;
    else if (braking) this.flapPhase += CONFIG.wings.flapFreqLanding * f * TWO_PI;
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
    const braking = this.state === S.LANDING || this.state === S.LANDING_PERCH;
    const pausing = this.state === S.DROPPING || this.state === S.TURNING;

    // úhel letu: tělo sleduje směr rychlosti, při brzdění se zvedá hlava
    const speed = this.vel.mag();
    let heading = speed > 0.3 ? Math.atan2(this.vel.y, Math.abs(this.vel.x)) : 0;
    heading = constrain(heading, -0.9, 0.9);
    const tilt = braking || pausing ? W.bodyTiltLanding : W.bodyTiltCruise;
    const flap = Math.sin(this.flapPhase) * W.flapAmplitude * (pausing ? 0.55 : 1);

    push();
    translate(this.pos.x, this.pos.y);
    scale(this.facing, 1);          // otočení celého ptáčka podle směru letu
    rotate(heading + tilt);

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
  const over = ["toggle", "next"].some(k => {
    const r = uiRects[k];
    return mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h;
  });
  cursor(over ? HAND : ARROW);
}

function mousePressed() {
  for (const [k, r] of Object.entries(uiRects)) {
    if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
      if (k === "toggle") dayTarget = 1 - dayTarget;
      if (k === "next") startScene(false);
      return;
    }
  }
}

function keyPressed() {
  if (key === "m" || key === "M") dayTarget = 1 - dayTarget;   // den/noc
  if (key === "n" || key === "N") startScene(false);           // další citát
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
