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

- `index.html` — načte p5.js z CDN + `sketch.js?v=N` (cache-bust, zvyš N
  při změně sketche), manifest a ikonu.
- `manifest.webmanifest` + `icon.svg` — PWA („Přidat na plochu", standalone
  režim); žádný service worker (schválně — cache invalidace by zlobila).
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
- **`QUOTES`** — offline zásoba `{ text, author }` po jazycích
  (`QUOTES.cs` / `QUOTES.en`, ~20 citátů každý); vybírá se náhodně z aktuální
  sady, při resetu vždy jiný než aktuální.
- **Jazyk (i18n)** — `lang` ∈ cs/en: `detectLang()` čte `localStorage`
  (klíč `quoteboids-lang`), jinak `navigator.language` (sk → cs). Texty UI
  ve `STRINGS`. Přepínač = SEGMENTOVÝ `[CZ | EN]` s procedurálními
  vlajkami (`drawFlag`): aktivní segment podsvícený, neaktivní ztlumený
  závojem — je vidět stav i cíl kliknutí (feedback autora: dřívější
  „vlajka + název" nešlo poznat, jestli ukazuje stav nebo akci). Klik
  na polovinu hitboxu vybírá konkrétní jazyk; klávesa `L` přepíná.
  Přepnutí volá `startScene(false)` (starý citát odejde tranzicí).
- **Meteor** má gravitaci (`meteor.g`) — dráha se stáčí k zemi mírným
  obloukem, ohon sleduje aktuální rychlost, takže se zakřivuje s ní.
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
  ~14 px doklouže lerpem, aby nekroužil kolem cíle. Landing začíná podle
  **brzdné dráhy z aktuální rychlosti** (`brakeDistance()` = v²/2a ×
  `brakeSafety` + minimum; `arriveRadius` je jen spodní mez) — rychlý ptáček
  brzdí dřív a déle, žádné zaseknutí na bydýlku (feedback autora).
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
  **Výchozí stav je MUTE** (`defaultOn: false`) — zapíná si ho uživatel
  (vyžádáno autorem).
- **Tranzice odchodu citátu** — při „Další citát" se položené znaky zachytí
  do `outgoing` (PŘED výběrem nového citátu!) a odejdou náhodnou variantou:
  `fade`/`gravity`/`scatter`/`rise`/`balloons` (`TRANSITIONS`,
  `CONFIG.transition`), ale **nikdy stejnou dvakrát po sobě**
  (`lastTransitionType`); s náhodným staggerem per písmeno; autor odchází
  s nimi. Kreslí `drawOutgoing(f)` pod novým citátem; konec řídí
  `outgoing.endMs` (balónky potřebují čas dle počtu řádků).
- **Balónky (`balloons`)** — písmena odlétají na balóncích **řádek po
  řádku odshora** (row z y-souřadnice, autor poslední); uvnitř řádku
  dostávají balónky cik-cak během `withinRowMs` a hned stoupají
  (akcelerace se stropem). Vítr = sdílený Perlin noise + vlastní příměs
  per balónek (`windF`, `seed`) — hýbou se podobně, ne stejně. Balónek
  kreslí `drawBalloon`: stínovaná koule s odleskem, uzlík, prohnutý
  provázek (bezier), náklon po větru; barvy = paleta ptáčků zesvětlená
  o `lighten`. V losování tranzic mají balónky 2× váhu. POZOR:
  nepojmenovávat lokální proměnnou `pop` — zastíní p5 funkci `pop()`
  (stalo se, padalo to).
- **Prásk balónku (gag, `transition.balloons.pop.enabled`)** — když běží
  balónková tranzice a na hradě sedí ptáčci, jeden (lovec) dostane
  `huntPlan` (v `startScene` se vynechá z odletové smyčky), v náhodný čas
  `atMs*` vzlétne (stav `S.HUNTING`), letí na střed balónku (cíl se hýbe;
  `pickPopTarget` preferuje nejpozději startující řádky, autora nikdy)
  a v `radius` px ho prásknutím propíchne: `popBalloon` → `sfxPop`
  (šumový buffer + spodní tón, `audio.popGain`), cáry přes
  `spawnFeathers` v barvě balónku, písmeno padá gravitací (`it.popped`).
  Ostatní ptáčci na scéně dostanou `panicUntil` (vMax × `panicBoost`),
  nosiči vrátí písmeno do `taskQueue` (scéna se vždy dokončí!) a
  rozprchnou se doleva i NAHORU (`DEPARTING` končí i při y < −70).
  Žádný další balónek už nepraskne. Lovcův abort: balónek pryč/praskl →
  `beginDeparting`.
- **Po posledním písmenu letí ptáček rovnou na hrad** (z `dropping` přímo
  `flyingToPerch` když je `taskQueue` prázdná) — odlet ze scény a návrat
  působil rušivě (feedback autora). Stejně tak: ptáček v `departing` se při
  vyprázdnění zásobníku otočí na hrad ještě na scéně (poslední písmena mu
  mezitím rozebrali ostatní — guard `!extraWait` kvůli odletům při resetu),
  a ptáčkům ve `waiting` se při prázdném zásobníku pauza zkrátí na ≤500 ms,
  ať na hrad nedolétají s mnohasekundovým zpožděním.
- **Den/noc** — `dayness` 0..1 plynule dojíždí k `dayTarget` za
  `modeTransitionMs`; všechny barvy přes `themeLerp(key)`. Noc = hvězdy +
  srpek měsíce, den = slunce s paprsky (crossfade). Výchozí je noc.
- **Pérující větvička** — jeden tlumený oscilátor `perchSpring` (CONFIG
  `perchSpring`); výchylka po délce násobená parabolou 4t(1−t) (konce visí
  na háčcích). Dosednutí kopne dolů (`landKick`), vzlet nahoru
  (`takeoffKick`), síla dle blízkosti středu. Sedící ptáčci se vezou
  automaticky (čtou `perchSlotPos` každý snímek).
- **Nebe (`drawSky`)** — noc: jednou za `sky.meteorMs*` přeletí meteor
  (různá délka ohonu/rychlost, fade přes sin); den: pomalé obláčky +
  jednou za čas **vzdálené hejno** ve volné V formaci, tlumenou barvou
  (lerp text→bg), mávání = rozevírání „V" siluet.
- **Peříčka** — `spawnFeathers`/`drawFeathers`; uvolní se NÁHODNĚ
  (`feathers.dropChance` při položení, `perchChance` při dosednutí) —
  záměrně ne vždy, ať se na ně divák těší. Snáší se se sin výkyvem.
- **Život na hradě** — mrkání (`blinkAt`/`blinkUntil`, oko jako čárka)
  a `updatePerchSwap()`: po složení citátu si jednou za `perch.swapMs*`
  dva sedící ptáčci prohodí sloty (vzlet šikmo vzhůru → oblouček).
- **Režim spořiče** — `updateAutoNext()`: po složení citátu a
  `scene.autoNextMs` klidu (interakce odkládají přes `lastInteractionMs`)
  sám spustí další citát. 0 = vypnuto.
- **Břečťan (FEATURE FLAG `CONFIG.ivy.enabled`)** — procedurální větvička
  podle (neviditelné) vodící linky, předloha `brectan.png` (v repu není,
  jen lokálně). **Layout náhodně, nikdy stejný dvakrát po sobě**
  (`IVY_LAYOUTS`/`lastIvyLayout`): `single` (jedna větvička pod/vedle),
  `multi` (2–3 větvičky), `wreath` (klikatý věnec kolem dokola — body
  paprskem na obvod obdélníku, jitter jen VEN, A↔B mezera `gapRad*`,
  listy dovnitř menší ×0.75, na úzkém displeji globální `leafScale`),
  `behind` (elipsa ZA písmeny — text dostane v `drawQuote` obrys v barvě
  pozadí ~4px, kontury zůstanou ostré). Celá větvička se namaluje za
  `growMs` (default 1 s). Pipeline: `quoteBounds()` (zakázaný obdélník:
  citát + autor + tlačítko odkazu) → kontrolní body dle layoutu
  (`lineControlPoints`/`wreathControlPoints`/`behindControlPoints`)
  → `buildIvyPath` (Catmull-Rom přes `curvePoint`,
  resampling na 4px krok délky) → `makeVine`: stonek = linka + oscilace
  po normále (sin+noise, `waveAmplitude/Frequency`, báze drží na lince),
  zužuje se (`stemThickness`→0.9), zrnité tečkování (`speckleEvery`),
  listy střídavě po stranách s řapíkem (`leafSpacing/Size/SizeVar`,
  `leafTipShrink` u špičky, `rotJitterDeg`). List = 5-laločný obrys
  (`IVY_LOBES` — gaussovské hrby na poloměru, srdcovitá báze; cache
  `ivyLeafOutline`), variegovaná výplň přes **canvas clip**
  (`drawingContext`, skvrny deterministicky z `noise(seed,…)` — žádné
  blikání), skoro bílé žilky do špiček laloků, tmavý obrys s konstantní
  px tloušťkou (`lineWidth = 1.4/(size*scl)`). Růst: `growT = s ×
  growthSpeed`; list se spawne, když ho stonek míjí, klíčí
  `easeOutBack` přes `leafGrowMs`. `seed` v CONFIGu = reprodukovatelná
  větvička. Při `startScene` fade (`ivy.dying`), resize ⇒ `ivy = null`.
  `perchDecor` = pár listů na koncích bydýlka (pevné seedy).
- **Deep-link** — `?lang=cs&q=N` (1-based) vybere konkrétní citát
  (`applyUrlParams` v setup, `forcedQuoteIndex` jen pro první scénu);
  `updateUrl()` drží adresní řádek aktuální (replaceState, na file://
  ticho selže). Tlačítko „Zkopírovat odkaz" pod autorem (`uiRects.copy`,
  existuje jen po složení) → `copyText` (clipboard API + execCommand
  fallback pro file://) + toast.
- **UI** — kreslené přímo na plátno (žádný DOM): jedna VODOROVNÁ řada
  vpravo nahoře skládaná zprava (toggle den/noc, zvuk, další citát, jazyk);
  na úzkém displeji se přebývající prvky zalomí na další řádek — nesmí
  překrývat ptáčky na hradě (feedback autora). Repráček: membrána se
  rozšiřuje DOPRAVA (špička vypadala jako šipka). Měsíc/slunce je kvůli
  tomu níž (`scene.celestialX/Y`). Hitboxy v `uiRects`. Klávesy: `M`
  den/noc, `N` další citát, `Z` zvuk, `L` jazyk.

## Konvence / preference autora

- Komentáře v kódu **česky**, čitelný vanilla JS, žádný TypeScript ani
  frameworky, vše v jednom `sketch.js`, laditelné hodnoty jen v `CONFIG`.
- Estetika: klidná, mírumilovná podívaná; organický pohyb (akcelerace,
  brzdné oblouky), žádné skoky/teleporty. Fyzika je normovaná na 60 fps
  (`f = deltaTime/16.67`), nezávislá na frameratu.
- Sesterské repo s know-how: `../PaintingBoids` (plynulý pohyb, p5 vzory),
  `../PredatorPrayBoids` (steering), `../CPU-MOS-6502C-Sally-Visual-Simulator`
  (Playwright testy).
