# QuoteBoids — ptáčci nosí citát

Klidná p5.js podívaná: hejno barevných, procedurálně kreslených ptáčků po
jednom přináší písmena náhodně vybraného citátu a pokládá je na jejich místo
v nápisu. Inspirováno mechanikou ze hry **Bounty Bob (Atari 800 XL)** —
ptáček odletí mimo obrazovku, „naloží" písmeno, donese ho v packách na cíl
a upustí. Když je citát složený, objeví se autor a ptáčci dosednou na
větvičku (hrad) vpravo nahoře, kde přešlapují, otáčejí hlavou a občas se
protáhnou.

Žádný build, žádné obrázky — čistý JavaScript + p5.js z CDN, veškerá grafika
kreslená z p5 primitiv.

## Spuštění

Otevřít `index.html` v prohlížeči (p5.js se načítá z CDN, první načtení chce
internet). Spolehlivější přes lokální server:

```
python -m http.server 8000   # pak http://localhost:8000
```

## Ovládání

- **Přepínač den/noc** (pill vpravo nahoře) — plynulý přechod mezi nočním
  (výchozí: tmavé nebe, hvězdy, měsíc) a denním režimem (světlé nebe, slunce).
  Klávesa: `M`.
- **Další citát** (tlačítko vpravo nahoře) — reset: ptáčci odletí a začnou
  skládat nový náhodný citát. Klávesa: `N`.
- Okno jde libovolně měnit — layout citátu i hrad se přepočítají.

## Ladění

Všechny laditelné hodnoty jsou v objektu `CONFIG` na začátku `sketch.js`
(počet ptáčků, fyzika letu, mávání křídel, rozměry ptáčka, časování stavů,
paleta, typografie, barevná schémata den/noc…). Citáty jsou v poli `QUOTES`
tamtéž — položka `{ text, author }`, snadno doplnitelné.

Vlastní font: nastavit `CONFIG.quote.fontFile` na cestu k `.ttf`/`.otf`
souboru (načte se přes `loadFont()`); jinak se použije web-safe font
z `CONFIG.quote.font`.

## Testy

- `node --check sketch.js` — kontrola syntaxe.
- `node test/shoot.js` — headless smoke test (Playwright + systémový Chrome):
  načte stránku, hlídá chyby konzole, počká na složení citátu, prověří
  přechod den/noc, resize a reset, a uloží screenshoty do `test/*.png`.
