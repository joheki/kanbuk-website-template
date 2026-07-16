/**
 * =============================================================================
 *  SICHT – die automatische Sichtprüfung vor jedem Launch
 * =============================================================================
 *  Öffnet JEDE gebaute Seite in einem echten Browser bei 350 / 768 / 1440 px,
 *  macht Screenshots und prüft dabei automatisch:
 *
 *   1. HORIZONTALER ÜBERLAUF – die Seite darf auf keiner Breite seitlich
 *      scrollen (nennt die schuldigen Elemente beim Namen)
 *   2. JS-FEHLER – jeder Konsolen-Fehler ist ein Bug
 *   3. KAPUTTE RESSOURCEN – Bild/Skript/Style, das nicht lädt (404)
 *
 *  Die Screenshots landen in pruefung/ – danach MUSS Claude sie ANSEHEN
 *  (Read rendert Bilder) und visuell beurteilen: Layout-Brüche, Überlappungen,
 *  Design-Fehler, Rechtschreibung der sichtbaren Texte. Das Skript findet die
 *  messbaren Fehler, die Augen finden den Rest – beides zusammen ist die
 *  Launch-Prüfung (siehe /port Etappe 5 und /deploy).
 *
 *      npm run sicht            (nutzt dist/ – vorher npm run check laufen lassen)
 *      npm run sicht -- --breiten 350,768,1024,1440
 *
 *  Rot = die Seite darf so nicht raus.
 * =============================================================================
 */
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { chromium } from 'playwright';

const WURZEL = process.cwd();
const DIST = join(WURZEL, 'dist');
const ZIEL = join(WURZEL, 'pruefung');

const args = process.argv.slice(2);
const wert = (name, standard) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : standard;
};
const BREITEN = wert('breiten', '350,768,1440').split(',').map((b) => Number(b.trim()));

if (!existsSync(DIST)) {
  console.error('✗ dist/ fehlt. Zuerst "npm run check" (baut und prüft), dann "npm run sicht".');
  process.exit(1);
}

// --- Seiten einsammeln -------------------------------------------------------
function alleDateien(dir, treffer = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) alleDateien(p, treffer);
    else treffer.push(p);
  }
  return treffer;
}
const seiten = alleDateien(DIST)
  .filter((f) => extname(f) === '.html')
  .map((f) => '/' + relative(DIST, f).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, ''));

// --- Mini-Webserver für dist/ (kein Zusatzpaket, zufälliger freier Port) -----
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml',
};
const server = createServer((req, res) => {
  let pfad = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let datei = join(DIST, pfad);
  if (existsSync(datei) && statSync(datei).isDirectory()) datei = join(datei, 'index.html');
  if (!existsSync(datei)) datei = `${join(DIST, pfad)}.html`;
  if (!existsSync(datei)) {
    res.writeHead(404).end('nicht gefunden');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(datei).toLowerCase()] ?? 'application/octet-stream' });
  res.end(readFileSync(datei));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const BASIS = `http://127.0.0.1:${server.address().port}`;

// --- Prüfung ------------------------------------------------------------------
rmSync(ZIEL, { recursive: true, force: true });
mkdirSync(ZIEL, { recursive: true });

const probleme = [];
const browser = await chromium.launch();
console.log(`Sichtprüfung: ${seiten.length} Seite(n) × ${BREITEN.length} Breiten (${BREITEN.join(', ')} px)\n`);

for (const seite of seiten) {
  for (const breite of BREITEN) {
    const kontext = await browser.newContext({ viewport: { width: breite, height: 900 } });
    const page = await kontext.newPage();

    const jsFehler = [];
    const kaputt = [];
    page.on('pageerror', (e) => jsFehler.push(e.message.split('\n')[0]));
    page.on('console', (m) => m.type() === 'error' && jsFehler.push(m.text().split('\n')[0]));
    page.on('requestfailed', (r) => kaputt.push(`${r.url()} (${r.failure()?.errorText})`));
    page.on('response', (r) => r.status() >= 400 && kaputt.push(`${r.url()} (HTTP ${r.status()})`));

    await page.goto(BASIS + seite, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    // Einblende-Animationen sofort in den Endzustand bringen – sonst zeigen
    // Ganzseiten-Screenshots halbtransparente Sektionen und jede visuelle
    // Beurteilung würde Geister-Fehler sehen.
    await page.evaluate(() => {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('ist-sichtbar'));
    });
    await page.waitForTimeout(400); // Übergänge zur Ruhe kommen lassen

    // 1) Horizontaler Überlauf – DER Responsive-Killer.
    const ueberlauf = await page.evaluate(() => {
      const doc = document.documentElement;
      if (doc.scrollWidth <= doc.clientWidth + 1) return null;
      const schuldige = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > doc.clientWidth + 1 || r.left < -1) {
          const id = el.id ? `#${el.id}` : '';
          const klasse = el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : '';
          schuldige.push(`<${el.tagName.toLowerCase()}${id}${klasse}> ragt bis ${Math.round(r.right)}px`);
          if (schuldige.length >= 3) break;
        }
      }
      return { breite: doc.scrollWidth, sichtbar: doc.clientWidth, schuldige };
    });

    const name = `${(seite === '/' ? 'start' : seite.replace(/^\//, '').replace(/\//g, '-'))}-${breite}px.png`;
    await page.screenshot({ path: join(ZIEL, name), fullPage: true });

    const kennung = `${seite} @ ${breite}px`;
    if (ueberlauf) {
      probleme.push(
        `${kennung}: HORIZONTALER ÜBERLAUF (${ueberlauf.breite}px Inhalt auf ${ueberlauf.sichtbar}px)\n      ${ueberlauf.schuldige.join('\n      ') || '(Verursacher nicht eingrenzbar)'}`,
      );
    }
    for (const f of [...new Set(jsFehler)]) probleme.push(`${kennung}: JS-Fehler -> ${f.slice(0, 140)}`);
    for (const k of [...new Set(kaputt)]) probleme.push(`${kennung}: lädt nicht -> ${k.slice(0, 140)}`);

    console.log(`  ${ueberlauf || jsFehler.length || kaputt.length ? '✗' : '✓'} ${kennung}  → pruefung/${name}`);
    await kontext.close();
  }
}

await browser.close();
server.close();

console.log('');
if (probleme.length > 0) {
  console.log('✗ Sichtprüfung NICHT bestanden:\n');
  for (const p of probleme) console.log(`  • ${p}`);
  console.log(`\n${probleme.length} Problem(e). Screenshots zum Nachsehen: pruefung/`);
  process.exit(1);
}
console.log(`✓ Messbare Prüfung bestanden (kein Überlauf, keine JS-Fehler, nichts kaputt).

  JETZT PFLICHT: die Screenshots in pruefung/ ANSEHEN und visuell beurteilen –
  Layout-Brüche, Überlappungen, Design-Fehler, Rechtschreibung der sichtbaren
  Texte. Das Skript misst, die Augen urteilen.`);
