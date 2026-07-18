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
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { starteDistServer } from './lib/dist-server.mjs';

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

// --- Server + Seitenliste aus der geteilten Bibliothek (nutzt auch interaktion.mjs)
const { basis: BASIS, seiten, stop } = await starteDistServer(DIST);

// --- Prüfung ------------------------------------------------------------------
rmSync(ZIEL, { recursive: true, force: true });
mkdirSync(ZIEL, { recursive: true });

const probleme = [];
const hinweise = [];
const texte = [];
const groessteBreite = Math.max(...BREITEN);
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

    // Lazy-Bilder erzwingen. Ein Ganzseiten-Screenshot fotografiert die ganze
    // Seite, SCROLLT aber nicht – Bilder mit loading="lazy" weit unterhalb des
    // Sichtfensters laden deshalb nie und wären im Screenshot leere Flächen.
    // Wer den Screenshot beurteilt, sähe dort einen Fehler, den es gar nicht
    // gibt (bzw. übersähe einen echten). Deshalb: alles laden und abwarten.
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
        img.loading = 'eager';
      });
      await Promise.all(
        [...document.images]
          .filter((img) => !img.complete)
          .map((img) => new Promise((fertig) => {
            img.addEventListener('load', fertig, { once: true });
            img.addEventListener('error', fertig, { once: true });
          })),
      );
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

    // 1b) Matsch-Bilder: ein Bild, das breiter angezeigt wird, als seine
    // Datei Pixel hat, wird vom Browser hochgerechnet und sieht verpixelt
    // aus. Klassische Ursache: <Image widths={[…1000]}> unter einem
    // Vollbreiten-Band. Fällt sonst erst dem Kunden am großen Monitor auf.
    const matschig = await page.evaluate(() => {
      return [...document.images]
        .filter((b) => b.complete && b.naturalWidth > 0 && !b.currentSrc.startsWith('data:'))
        .filter((b) => !/\.svg(\?|$)/i.test(b.currentSrc)) // Vektor skaliert verlustfrei
        .filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width > 60 && r.width > b.naturalWidth * 1.34;
        })
        .slice(0, 4)
        .map((b) => {
          const r = b.getBoundingClientRect();
          const datei = (b.currentSrc.split('/').pop() || '').split('?')[0].slice(0, 44);
          return `${datei}: nur ${b.naturalWidth}px Datei auf ${Math.round(r.width)}px Anzeige`;
        });
    });

    const name = `${(seite === '/' ? 'start' : seite.replace(/^\//, '').replace(/\//g, '-'))}-${breite}px.png`;
    await page.screenshot({ path: join(ZIEL, name), fullPage: true });

    // 2b) Text-Dump – NACH dem Screenshot (der zeigt den echten Zustand) und
    // nur bei der größten Breite: bei 350 px steckt die Navigation im Burger
    // und fehlt im innerText. Zugeklappte Tabs/Akkordeons werden aufgedeckt –
    // der Dump prüft damit auch Text, den Screenshots nie zeigen. Die Prüfung
    // von Rechtschreibung/ß/Ansprache läuft über pruefung/texte.md (Text statt
    // Pixel); Text IN Bildern (Logos) bleibt Screenshot-Sache.
    if (breite === groessteBreite) {
      const dump = await page.evaluate(() => {
        document.querySelectorAll('[data-tabpanel]').forEach((p) => { p.hidden = false; });
        document.querySelectorAll('details').forEach((d) => { d.open = true; });
        return {
          titel: document.title,
          beschreibung: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
          text: document.body.innerText,
        };
      });
      texte.push({ seite, ...dump });
      const laenge = dump.text.trim().length;
      if (laenge < 80) hinweise.push(`${seite}: verdächtig wenig sichtbarer Text (${laenge} Zeichen) – leere Seite?`);
    }

    const kennung = `${seite} @ ${breite}px`;
    if (ueberlauf) {
      probleme.push(
        `${kennung}: HORIZONTALER ÜBERLAUF (${ueberlauf.breite}px Inhalt auf ${ueberlauf.sichtbar}px)\n      ${ueberlauf.schuldige.join('\n      ') || '(Verursacher nicht eingrenzbar)'}`,
      );
    }
    for (const f of [...new Set(jsFehler)]) probleme.push(`${kennung}: JS-Fehler -> ${f.slice(0, 140)}`);
    for (const k of [...new Set(kaputt)]) probleme.push(`${kennung}: lädt nicht -> ${k.slice(0, 140)}`);
    for (const m of matschig) probleme.push(`${kennung}: VERPIXELT (hochskaliert) -> ${m}\n      Abhilfe: widths der <Image> bis zur echten Anzeigebreite erweitern.`);

    console.log(`  ${ueberlauf || jsFehler.length || kaputt.length || matschig.length ? '✗' : '✓'} ${kennung}  → pruefung/${name}`);
    await kontext.close();
  }
}

await browser.close();
stop();

// --- pruefung/texte.md schreiben: aller sichtbarer Text als lesbarer Dump ---
const md = texte
  .map(
    (t) =>
      `## ${t.seite}\n\n**Titel:** ${t.titel}\n**Description:** ${t.beschreibung}\n\n\`\`\`\n${t.text.trim()}\n\`\`\`\n`,
  )
  .join('\n');
writeFileSync(
  join(ZIEL, 'texte.md'),
  `# Sichtbarer Text aller Seiten (bei ${groessteBreite} px, inkl. aufgedeckter Tabs/Akkordeons)\n\n` +
    `> Hierüber läuft die Text-Prüfung: Rechtschreibung, ß-Schreibung, österreichisches\n` +
    `> Standarddeutsch, konsistente Ansprache. Text in Bildern zeigt nur der Screenshot.\n\n${md}`,
  'utf-8',
);

// --- Screen-Bögen für die Layout-Triage – bewusst non-fatal: ein Bogen-Fehler
//     darf eine grüne Sichtprüfung nicht kippen (Einzel-Screenshots reichen dann).
if (existsSync(join(WURZEL, 'scripts', 'bogen.mjs'))) {
  const bogen = spawnSync(process.execPath, ['scripts/bogen.mjs', '--screens'], { stdio: 'inherit' });
  if (bogen.status !== 0) console.warn('⚠ Screen-Bögen fehlgeschlagen – bitte die Einzel-Screenshots ansehen.');
}

console.log('');
if (hinweise.length > 0) {
  console.log('⚠ Hinweise:');
  for (const h of hinweise) console.log(`  • ${h}`);
  console.log('');
}
if (probleme.length > 0) {
  console.log('✗ Sichtprüfung NICHT bestanden:\n');
  for (const p of probleme) console.log(`  • ${p}`);
  console.log(`\n${probleme.length} Problem(e). Screenshots zum Nachsehen: pruefung/`);
  process.exit(1);
}
console.log(`✓ Messbare Prüfung bestanden (kein Überlauf, keine JS-Fehler, nichts kaputt).

  JETZT PFLICHT (das Skript misst, die Augen urteilen):
  1. pruefung/texte.md LESEN  → Rechtschreibung, ß, Ansprache, Ö-Deutsch
  2. pruefung/bogen-screens-* ANSEHEN → Layout über alle Breiten (Triage)
  3. Verdachtsfälle + Text-in-Bildern → Einzel-Screenshot in voller Größe`);
