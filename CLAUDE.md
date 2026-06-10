# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Co to je

QuoteBoids — klidná p5.js scéna, kde hejno procedurálně kreslených ptáčků po
jednom přináší písmena náhodně vybraného citátu a pokládá je na předpočítané
pozice (mechanika ze hry Bounty Bob, Atari 800 XL). Po složení citátu se
objeví autor a ptáčci dosednou na větvičku (hrad) vpravo nahoře. Žádný build,
žádné obrázky — čistý JS + p5.js z CDN (`p5@1.9.4`, připnuto v `index.html`).

## Spuštění / testy

- **Spustit:** otevřít `index.html` (CDN chce internet), nebo
  `python -m http.server 8000`.
- **Syntaxe:** `node --check sketch.js`.
- **Smoke test:** `node test/shoot.js` — Playwright se **systémovým Chrome**
  (`channel: "chrome"`; playwright se bere ze sesterského projektu
  `CPU-MOS-6502C-Sally-Visual-Simulator/node_modules`, fallback v hlavičce
  testu). Načte stránku, hlídá konzoli, počká na složení citátu (loguje
  průběh), prověří den/noc, resize, reset a uloží `test/*.png`. Verdikt
  (`SMOKE-OK`/`FAIL`) se tiskne před `browser.close()` — close se systémovým
  Chrome občas visí, proto je závoděný s timeoutem a končí `process.exit`.

## Struktura

- `index.html` — jen načte p5.js z CDN + `sketch.js`.
- `sketch.js` — **veškerá logika v jednom souboru** (konvence autora).
  Pořadí: `CONFIG` → `QUOTES` → stavy `S` → globály → scéna/start →
  layout citátu → hrad → `class Bird` (update + kreslení) → citát/téma/
  pozadí → UI → `draw`/`windowResized`.
- `test/shoot.js` — headless smoke test (viz výše).

## Architektura (sketch.js)

- **`CONFIG`** — všechny laditelné hodnoty, strukturované po celcích
  (scene, birds, flight, wings, anim, birdShape, timing, perch, perchBar,
  audio, personality, avoid, transition, palette, quote, layout, theme, ui).
  Magická čísla nepatří do kódu.
- **`QUOTES`** — offline pole `{ text, author }`, vybírá se náhodně; při
  resetu vždy jiný než aktuální.
- **Layout** (`computeLayout`): zalomení po slovech přes `textWidth()`,
  max šířka řádku = `layout.maxLineWidthRatio × width`, font se zmenšuje,
  dokud se nejširší slovo nevejde. Cílová pozice znaku = střed glyfu,
  měřený prefixem řádku (kvůli kerningu). Mezery se nenosí. Při resize se
  jen přesunou pozice existujících znaků (zachová `placed`).
- **`Bird`** — stavový automat (jeden `switch` v `update`):
  `waiting → spawning → carrying → landing → dropping → turning → departing
  → waiting`; když dojdou písmena: `flyingToPerch → landingPerch → perched
  ⇄ stretching`. Ptáčci operují **zleva** (spawn i odlet mimo levou hranu).
  Steering = arrive (desired − vel, limit accel/decel); v landing posledních
  ~14 px doklouže lerpem, aby nekroužil kolem cíle. `arriveRadius` je záměrně
  ~110 (brzdná dráha z maxSpeed 6 při decel 0.22 je ~82 px).
- **Kreslení ptáčka** — čistě p5 primitiva, samostatně transformované části
  (tělo, hlava+zobák, 2 křídla s rotací kolem ramene, nohy, ocásek). Barva =
  1 parametr z `CONFIG.palette` (+ odvozeniny `shade`/`belly`). Boční pohled
  v letu (zrcadlení přes `scale(facing,1)`, náklon podle rychlosti a stavu),
  čelní pohled na hradě (otáčení hlavy, přešlapování, protažení). Nesené
  písmeno se kreslí ve **světových** souřadnicích pod ptáčkem (s „závěsem"
  proti pohybu) + packy jako čárky.
- **Autor citátu** — zvolená varianta: fade-in až po složení celého citátu
  (během skládání by překážel) — komentováno u `computeLayout`.
- **Plynulé animační tranzice** — stav určuje jen CÍLE pózy (náklon `tilt`,
  úhel letu `heading`, frekvence/rozsah mávání, otočení `facingSmooth`);
  k nim se dojíždí exponenciálním easingem (`CONFIG.anim`, fps-nezávislé
  přes `ke()`), takže změna stavu neudělá skok pózy. Otočka = squash přes
  `scale(facingSmooth,1)` s minimem ±0.08. Mimo obraz se parametry srovnají
  skokem (nikdo to nevidí).
- **Povahy** — `speedFactor` (loudal 0.8 ↔ horlivec 1.2) škáluje rychlost,
  steering, frekvenci mávání; `waitFactor` (odvozený inverzně) délku pauz.
  `CONFIG.personality`.
- **Vyhýbání v letu** — `avoidOthers()`: malá odpudivá síla (`CONFIG.avoid`),
  jen v letových stavech (NE při přistávání, aby nerušila dosednutí).
- **Zvuk** — čistě procedurální WebAudio (žádné soubory): vše složeno z
  `tone()` (oscilátor + klouzavá frekvence + obálka). `sfxPickup` (naložení
  za kamerou), `sfxDrop` (položení), `sfxChirp` (cvrlik na hradě; každý
  ptáček má vlastní `chirpPitch`). Líná inicializace `audioEnsure()` až po
  gestu uživatele (autoplay policy); přepínač v UI + klávesa `Z`;
  hlasitosti v `CONFIG.audio` — záměr: jemné podbarvení, ne efekty.
- **Tranzice odchodu citátu** — při „Další citát" se položené znaky zachytí
  do `outgoing` (PŘED výběrem nového citátu!) a odejdou náhodnou variantou:
  `fade`/`gravity`/`scatter`/`rise` (`TRANSITIONS`, `CONFIG.transition`),
  s náhodným staggerem per písmeno; autor odchází s nimi. Kreslí
  `drawOutgoing(f)` pod novým citátem.
- **Po posledním písmenu letí ptáček rovnou na hrad** (z `dropping` přímo
  `flyingToPerch` když je `taskQueue` prázdná) — odlet ze scény a návrat
  působil rušivě (feedback autora).
- **Den/noc** — `dayness` 0..1 plynule dojíždí k `dayTarget` za
  `modeTransitionMs`; všechny barvy přes `themeLerp(key)`. Noc = hvězdy +
  srpek měsíce, den = slunce s paprsky (crossfade). Výchozí je noc.
- **UI** — kreslené přímo na plátno (žádný DOM): přepínač zvuku + pill
  přepínač den/noc + tlačítko „Další citát" vpravo nahoře; hitboxy
  v `uiRects`. Klávesy: `M` den/noc, `N` další citát, `Z` zvuk.

## Konvence / preference autora

- Komentáře v kódu **česky**, čitelný vanilla JS, žádný TypeScript ani
  frameworky, vše v jednom `sketch.js`, laditelné hodnoty jen v `CONFIG`.
- Estetika: klidná, mírumilovná podívaná; organický pohyb (akcelerace,
  brzdné oblouky), žádné skoky/teleporty. Fyzika je normovaná na 60 fps
  (`f = deltaTime/16.67`), nezávislá na frameratu.
- Sesterské repo s know-how: `../PaintingBoids` (plynulý pohyb, p5 vzory),
  `../PredatorPrayBoids` (steering), `../CPU-MOS-6502C-Sally-Visual-Simulator`
  (Playwright testy).
