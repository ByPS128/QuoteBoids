// Headless smoke test (Playwright + Chrome) — načte aplikaci, posbírá chyby
// z konzole, nechá scénu chvíli běžet, prověří stav a uloží screenshoty.
// Spuštění: node test/shoot.js  (vyžaduje playwright ze sesterského projektu,
// viz PW_PATH níže, nebo `npm install playwright`).
const path = require("path");

let playwright;
try {
  playwright = require("playwright");
} catch {
  const PW_PATH = path.join(__dirname, "..", "..",
    "CPU-MOS-6502C-Sally-Visual-Simulator", "node_modules", "playwright");
  playwright = require(PW_PATH);
}

(async () => {
  // používá nainstalovaný systémový Chrome (žádné stahování browseru)
  const browser = await playwright.chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));

  const url = "file:///" + path.join(__dirname, "..", "index.html").replace(/\\/g, "/");
  await page.goto(url);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, "early.png") });

  // stav po pár sekundách: ptáčci existují, někteří už nesou písmena
  const state1 = await page.evaluate(() => ({
    birds: birds.length,
    states: birds.map(b => b.state),
    letters: letters.length,
    placed: letters.filter(l => l.placed).length,
    queue: taskQueue.length,
    quote: quote.text,
  }));
  console.log("po 2.5 s:", JSON.stringify(state1, null, 1));

  // doběh: počkej, až bude citát složený (max ~3 min), s průběžným logem
  const t0 = Date.now();
  for (;;) {
    const placed = await page.evaluate(() => letters.filter(l => l.placed).length);
    const total = await page.evaluate(() => letters.length);
    console.log(`  položeno ${placed}/${total} (${Math.round((Date.now() - t0) / 1000)} s)`);
    if (placed === total) break;
    if (Date.now() - t0 > 180000) throw new Error("TIMEOUT: citát se nesložil do 3 minut");
    await page.waitForTimeout(5000);
  }
  await page.waitForTimeout(4000); // ať ptáčci dosednou na hrad
  const state2 = await page.evaluate(() => ({
    states: birds.map(b => b.state),
    done: quoteDoneAt > 0,
  }));
  console.log("po složení:", JSON.stringify(state2));
  await page.screenshot({ path: path.join(__dirname, "done-night.png") });

  // přepnutí den/noc klávesou + screenshot
  await page.keyboard.press("m");
  await page.waitForTimeout(1600);
  const day = await page.evaluate(() => dayness);
  await page.screenshot({ path: path.join(__dirname, "done-day.png") });

  // resize okna — layout se musí přepočítat bez chyb
  await page.setViewportSize({ width: 800, height: 600 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, "resized.png") });

  // reset „Další citát" klávesou — starý citát musí odejít tranzicí
  await page.keyboard.press("n");
  await page.waitForTimeout(300);
  const trans = await page.evaluate(() => outgoing ? outgoing.type : null);
  console.log("tranzice odchodu:", trans);
  await page.waitForTimeout(2700);
  const state3 = await page.evaluate(() => ({
    quote: quote.text, placed: letters.filter(l => l.placed).length,
    states: birds.map(b => b.state),
  }));
  console.log("po resetu:", JSON.stringify(state3, null, 1));
  await page.screenshot({ path: path.join(__dirname, "reset.png") });

  // přepnutí jazyka klávesou L — citát se vybere z druhé sady
  const langBefore = await page.evaluate(() => lang);
  await page.keyboard.press("l");
  await page.waitForTimeout(300);
  const langState = await page.evaluate(() => ({ lang, quote: quote.text }));
  console.log("jazyk:", langBefore, "->", langState.lang, "|", langState.quote);
  const langOk = langState.lang !== langBefore;

  // verdikt se tiskne PŘED zavřením browseru — close() se systémovým
  // Chrome občas visí, proto je závoděný s timeoutem a pak tvrdý exit
  let fail = "";
  if (day < 0.95) fail = "přechod na den neproběhl, dayness=" + day;
  else if (!state2.done) fail = "quoteDoneAt nenastaveno";
  else if (!langOk) fail = "přepnutí jazyka neproběhlo";
  else if (errors.length) fail = "chyby v konzoli:\n" + errors.join("\n");
  console.log(fail ? "FAIL: " + fail : "SMOKE-OK");

  await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
