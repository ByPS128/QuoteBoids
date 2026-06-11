# TODO / nápady do příště

## Přistávání — varianta B: tvarování finálního náletu (výzkum + návrh)

Kontext: na výškovém displeji (mobil) ptáčci přilétají k cílům strmě
zespodu. Varianta A (IMPLEMENTOVÁNO) řeší pózu: při brzdění se cíl
`heading` přepne na 0, takže ptáček udělá „flare" vůči zemi — vztyčí se
do brzdné pózy bez ohledu na směr příletu, jako skutečný pták.

Varianta B by navíc tvarovala samotnou **dráhu** finálního náletu:

- **Jak to dělá skutečný pták přilétající k hnízdu zespodu:** stoupá
  strmě, těsně před cílem převede rychlost do krátkého „vyhoupnutí" —
  ztratí rychlost přesně v úrovni cíle (stall), tělo už vzpřímené,
  křídla brzdí, a poslední kousek DOSEDÁ shora dolů. Tedy mírný
  overshoot nahoru a dosednutí, ne přímý náraz po trajektorii.

- **Návrh implementace:** když je cíl strmě nad/pod ptáčkem (úhel
  příletu > ~50° od horizontály), nelet přímo na cíl, ale nejdřív na
  **přibližovací bod** posunutý ~60–80 px stranou a mírně POD cíl
  (na straně, odkud ptáček letí). Po jeho dosažení (radius ~25 px)
  přepnout cíl na skutečné místo — finále se letí vodorovněji
  a dosednutí „vyhoupnutím". Stav navíc není nutný: stačí per-bird
  `approachVia` bod, který se po dosažení vynuluje.

- **Rizika / na co pozor:** zásah do steering + brzdné dráhy
  (`brakeDistance` se musí počítat až od přibližovacího bodu, jinak
  ptáček brzdí moc brzy); možnost kroužení kolem přibližovacího bodu
  (řešit větším radiusem přepnutí); otestovat spolehlivost dosednutí
  (smoke test čeká na složení citátu — regrese se projeví timeoutem);
  ladit jen na výškovém viewportu 390×844, kde je efekt nejviditelnější.

- **Návrat ke stabilnímu stavu:** tag `v1.0-stabilni`.

## Drobnosti zvažované dříve (zatím nerealizované)

- Den/noc automaticky podle místního času při startu (přepínač zůstává
  jako ruční override).
- Volitelný hezčí font přes `CONFIG.quote.fontFile` (autor může dodat
  .ttf/.otf — mechanismus už existuje, jen dodat soubor).
