/**
 * =============================================================================
 *  DEMO-HOSTEN – das Claude-Design-Projekt als schickbaren Link veröffentlichen
 * =============================================================================
 *  Für den Verkaufs-Trichter VOR dem Port: Der Claude-Design-Link selbst ist
 *  nicht teilbar (braucht Login). Dieses Skript macht aus dem Design eine
 *  hostbare Demo – mit Kanbuk-Leiste, Google-Sperre und Handy-Hinweis.
 *
 *  ZWEI QUELLEN (Standardweg zuerst):
 *
 *  A) PROJEKT-ARCHIV (Zip) – in Claude Design: Export → „Project archive".
 *     Gratis, sofort, enthält ALLES (alle Seiten, Bilder, PDFs). Die Demo wird
 *     als echte Mehrseiten-Site gehostet – jede Unterseite mit eigener URL.
 *       npm run demo -- --datei "C:/…/Projekt.zip" --kunde "Cafe Sonne"
 *
 *  B) STANDALONE-HTML – die eine selbständige Datei („… (Standalone).html").
 *     Verbraucht beim Export Claude-Kontingent; enthält nur die EINE Datei.
 *       npm run demo -- --datei "C:/…/X (Standalone).html" --kunde "Cafe Sonne"
 *
 *  Danach zeigt das Skript den Vercel-Befehl (mit --deploy führt es ihn aus)
 *  und setzt die Marken-Adresse demo-<kunde>.kanbuk.com (s. MARKEN_DOMAIN).
 *  Es ist eine DESIGN-Demo (1280-px-Bühne, Prototyp-Klicks) – kein Produkt.
 *  Die echte, responsive Website entsteht erst beim Port.
 * =============================================================================
 */
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync,
  cpSync, rmSync, mkdtempSync,
} from 'node:fs';
import { join, resolve, isAbsolute, dirname, extname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SKRIPT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Marken-Domain für Demo-Links: demo-<kunde>.kanbuk.com statt …vercel.app.
   Voraussetzung (EINMALIG, bei der Domain-Verwaltung des Anbieters):
   ein Wildcard-Eintrag  CNAME  *  →  cname.vercel-dns.com
   Solange der fehlt, fällt das Skript automatisch auf …vercel.app zurück. */
const MARKEN_DOMAIN = 'kanbuk.com';

const args = process.argv.slice(2);
const wert = (name, standard) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : standard;
};

const datei = wert('datei');
const kunde = wert('kunde');
const deployen = args.includes('--deploy');

if (!datei || !kunde) {
  console.error(`
So wird eine Design-Demo hostbar:

  npm run demo -- --datei "<Projekt-Archiv.zip ODER (Standalone).html>" --kunde "<Betriebsname>"
  npm run demo -- --datei "…" --kunde "…" --deploy     (lädt direkt zu Vercel hoch)

Empfohlen: in Claude Design „Export → Project archive" (gratis, sofort, alle
Seiten) und das Zip übergeben. Optional: --ziel <ordner>.`);
  process.exit(1);
}

const quelle = isAbsolute(datei) ? datei : resolve(process.cwd(), datei);
if (!existsSync(quelle)) {
  console.error(`✗ Datei nicht gefunden: ${quelle}`);
  process.exit(1);
}

const slug = kunde
  .toLowerCase()
  .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] ?? c))
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
/* Der Ordnername wird bei Vercel zum Projektnamen – deshalb kanbuk-demo-…,
   damit die Demo nie mit dem späteren echten Kundenprojekt kollidiert. */
const ziel = resolve(process.cwd(), wert('ziel', join('..', 'kanbuk-demos', `kanbuk-demo-${slug}`)));

/* Das echte Kanbuk-Logo als Daten-URI einbetten – die Demo braucht keine
   Nebenressourcen. (Base64 hier ist unbedenklich: das Skript kodiert direkt
   von der Platte, nichts läuft durch einen Chat.) */
const logoPfad = join(SKRIPT_ROOT, 'src', 'assets', 'kanbuk-logo.png');
const logoDataUri = existsSync(logoPfad)
  ? `data:image/png;base64,${readFileSync(logoPfad).toString('base64')}`
  : '';

// ---------------------------------------------------------------------------
//  Injektionen. WICHTIG: Design-Exporte bauen den <body> per JS um – ein
//  einfach eingefügtes <div> würde überschrieben. Deshalb: Styles in den
//  <head> (überlebt immer) und ein Skript am Datei-ENDE, das die Leiste erst
//  NACH dem Entpacken anhängt und per Beobachter dranbleibt.
// ---------------------------------------------------------------------------

const kopfInjektion = `
<meta name="robots" content="noindex, nofollow">
<style id="kanbuk-demo-stil">
  /* Kanbuk-Vorschau-Leiste – UNTEN, damit sie klebenden Design-Headern nicht
     in die Quere kommt. Weißer „Cloud"-Look, feste Markenwerte. */
  #kanbuk-demo-leiste {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483000;
    display: flex; align-items: center; justify-content: center; gap: .6rem;
    background: #ffffff; color: #18141f;
    border-top: 1px solid rgba(24,20,31,.08);
    box-shadow: 0 -1px 10px rgba(24,20,31,.08);
    font: 600 13px/1.4 system-ui, sans-serif; padding: 8px 14px;
  }
  #kanbuk-demo-leiste .kanbuk-logo { height: 16px; width: auto; display: block; flex: none; }
  #kanbuk-demo-leiste .kanbuk-text { color: #6d28d9; }
  #kanbuk-demo-leiste .kanbuk-puls {
    width: 8px; height: 8px; border-radius: 50%; background: #22c55e; flex: none;
    animation: kanbuk-puls 1.8s ease-out infinite;
  }
  @keyframes kanbuk-puls {
    0% { box-shadow: 0 0 0 0 rgba(34,197,94,.45); }
    70% { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
  @media (prefers-reduced-motion: reduce) {
    #kanbuk-demo-leiste .kanbuk-puls { animation: none; }
  }
  /* Bildfelder des Design-Editors stilllegen: Doppelklick auf leere
     Platzhalter öffnete sonst einen Datei-Auswahldialog (harmlos – nichts
     wird gespeichert –, aber verwirrend). pointer-events lässt Klicks an
     umschließende Links durchfallen, es geht also nichts kaputt. */
  image-slot { pointer-events: none !important; }
  /* Handy-Hinweis: der Prototyp ist eine Desktop-Bühne. */
  #kanbuk-handy-hinweis { display: none; }
  @media (max-width: 760px) {
    #kanbuk-handy-hinweis {
      display: flex; flex-direction: column; gap: 14px; align-items: center;
      justify-content: center; text-align: center;
      position: fixed; inset: 0; z-index: 2147483001;
      background: #18141f; color: #fff; padding: 32px;
      font: 400 16px/1.6 system-ui, sans-serif;
    }
    #kanbuk-handy-hinweis strong { font-size: 19px; }
    #kanbuk-handy-hinweis button {
      font: 600 15px system-ui, sans-serif; color: #18141f; background: #fff;
      border: 0; border-radius: 8px; padding: 10px 18px; cursor: pointer;
    }
  }
</style>
`;

const fussInjektion = `
<script id="kanbuk-demo-skript">
(function () {
  function einbauen() {
    if (document.getElementById('kanbuk-demo-leiste')) return;
    var leiste = document.createElement('div');
    leiste.id = 'kanbuk-demo-leiste';
    leiste.innerHTML = '<img class="kanbuk-logo" src="${logoDataUri}" alt="Kanbuk">'
      + '<span class="kanbuk-puls" aria-hidden="true"></span>'
      + '<span class="kanbuk-text">Vorschau für ${kunde.replace(/[<>&"']/g, '')} – die fertige Website wird für alle Geräte gebaut</span>';
    document.body.appendChild(leiste);

    var hinweis = document.createElement('div');
    hinweis.id = 'kanbuk-handy-hinweis';
    hinweis.innerHTML = '<strong>Diese Design-Vorschau ist für große Bildschirme gestaltet.</strong>'
      + '<span>Die fertige Website passt sich selbstverständlich jedem Handy an – '
      + 'diese Vorschau zeigt nur den Design-Entwurf.</span>';
    var knopf = document.createElement('button');
    knopf.textContent = 'Entwurf trotzdem ansehen';
    knopf.onclick = function () { hinweis.remove(); };
    hinweis.appendChild(knopf);
    document.body.appendChild(hinweis);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', einbauen);
  else einbauen();
  new MutationObserver(einbauen).observe(document.documentElement, { childList: true, subtree: true });
})();
</script>
`;

function injizieren(html) {
  let raus = html;
  raus = /<head[^>]*>/i.test(raus)
    ? raus.replace(/<head[^>]*>/i, (m) => m + kopfInjektion)
    : kopfInjektion + raus;
  raus = /<\/html>\s*$/i.test(raus)
    ? raus.replace(/<\/html>\s*$/i, `${fussInjektion}\n</html>\n`)
    : raus + fussInjektion;
  return raus;
}

// ---------------------------------------------------------------------------
//  Quelle vorbereiten: Zip entpacken bzw. Einzeldatei übernehmen
// ---------------------------------------------------------------------------
mkdirSync(ziel, { recursive: true });
let routen = [];

const endung = extname(quelle).toLowerCase();
let tmpEntpackt = null;

if (endung === '.zip' || statSync(quelle).isDirectory()) {
  // --- A) Projekt-Archiv / Ordner: als echte Mehrseiten-Site hosten ---------
  let quellOrdner = quelle;
  if (endung === '.zip') {
    tmpEntpackt = mkdtempSync(join(tmpdir(), 'kanbuk-demo-'));
    // Windows bringt bsdtar mit (kann Zip); das GNU-tar der Git-Bash kann es nicht.
    const tarExe = process.platform === 'win32' ? 'C:\\Windows\\System32\\tar.exe' : 'tar';
    const r = spawnSync(tarExe, ['-xf', quelle, '-C', tmpEntpackt], { stdio: 'inherit' });
    if (r.status !== 0) {
      console.error('✗ Zip ließ sich nicht entpacken.');
      process.exit(1);
    }
    quellOrdner = tmpEntpackt;
  }

  // Seiten = die dc.html-Dateien der obersten Ebene. Bundles („…-bundle") sind
  // Zwischenprodukte für den Standalone-Export, fertige Standalones („*.html"
  // ohne .dc.) sind Duplikate – beides wird übersprungen.
  const eintraege = readdirSync(quellOrdner);
  const seiten = eintraege.filter((f) => f.endsWith('.dc.html') && !f.endsWith('-bundle.dc.html'));
  if (seiten.length === 0) {
    console.error('✗ Keine Seiten (*.dc.html) im Archiv gefunden – ist das ein Claude-Design-Projekt-Archiv?');
    process.exit(1);
  }

  // uploads/ ist Rohmaterial des Kunden (oft mit Müll wie .crdownload) und
  // wird nur mitgenommen, wenn eine Seite wirklich darauf verweist.
  const seitenInhalte = new Map(seiten.map((s) => [s, readFileSync(join(quellOrdner, s), 'utf-8')]));
  const brauchtUploads = [...seitenInhalte.values()].some((t) => t.includes('uploads/'));

  const UEBERSPRINGEN = new Set(['.thumbnail']);
  cpSync(quellOrdner, ziel, {
    recursive: true,
    filter: (src) => {
      const name = basename(src);
      const rel = src.slice(quellOrdner.length).replace(/\\/g, '/');
      if (UEBERSPRINGEN.has(name)) return false;
      if (!brauchtUploads && /^\/?uploads(\/|$)/.test(rel)) return false;
      if (name.endsWith('-bundle.dc.html')) return false;
      if (name.endsWith('.html') && !name.endsWith('.dc.html')) return false; // fertige Standalones
      if (name.endsWith('.zip')) return false;
      return true;
    },
  });

  // Kanbuk-Leiste + Sperren in JEDE Seite injizieren
  for (const s of seiten) {
    writeFileSync(join(ziel, s), injizieren(seitenInhalte.get(s)), 'utf-8');
  }

  // Startseite unter "/": Kopie von index.dc.html (bzw. der ersten Seite).
  const start = seiten.includes('index.dc.html') ? 'index.dc.html' : seiten.sort()[0];
  writeFileSync(join(ziel, 'index.html'), readFileSync(join(ziel, start), 'utf-8'), 'utf-8');

  // Editor-Zustandsdatei: image-slot.js fragt sie an – ohne sie gäbe es auf
  // jeder Galerie-Seite eine (harmlose) 404, die den Sicht-Check verunreinigt.
  if (existsSync(join(ziel, 'image-slot.js')) && !existsSync(join(ziel, '.image-slots.state.json'))) {
    writeFileSync(join(ziel, '.image-slots.state.json'), '{}\n', 'utf-8');
  }

  routen = seiten.map((s) => '/' + s);
  console.log(`✓ Projekt-Archiv übernommen: ${seiten.length} Seite(n) → ${seiten.join(', ')}`);
} else {
  // --- B) Einzelne Standalone-Datei -----------------------------------------
  let html = readFileSync(quelle, 'utf-8');
  const groesseMb = (statSync(quelle).size / 1024 / 1024).toFixed(1);
  if (statSync(quelle).size < 100 * 1024) {
    console.warn(`⚠ Die Datei ist nur ${groesseMb} MB klein – sicher der komplette Standalone-Export?`);
  }
  writeFileSync(join(ziel, 'index.html'), injizieren(html), 'utf-8');
  routen = ['/'];
  console.log(`✓ Standalone übernommen (${groesseMb} MB)`);
}

if (tmpEntpackt) rmSync(tmpEntpackt, { recursive: true, force: true });

// ---------------------------------------------------------------------------
//  Google-Sperre + Header
// ---------------------------------------------------------------------------
writeFileSync(join(ziel, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf-8');
writeFileSync(
  join(ziel, 'vercel.json'),
  JSON.stringify(
    {
      $schema: 'https://openapi.vercel.sh/vercel.json',
      headers: [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
          ],
        },
      ],
    },
    null,
    2,
  ) + '\n',
  'utf-8',
);

console.log(`✓ Demo gebaut: ${ziel}
  Drin: Kanbuk-Leiste (unten), Handy-Hinweis, noindex + robots + X-Robots-Tag
`);

// ---------------------------------------------------------------------------
//  Sicht-Check der VERPACKTEN Demo – bevor der Link zu einem Lead geht.
//  Misst je Seite: Überlauf über die 1280er-Bühne, JS-Fehler, kaputte
//  Ressourcen, leere Bilder – und macht Screenshots für die Augen-Prüfung
//  (Kontrast, dunkel-auf-dunkel, Layout beurteilt kein Skript).
// ---------------------------------------------------------------------------
try {
  const { chromium } = await import('playwright');
  const { starteDistServer } = await import('./lib/dist-server.mjs');
  const { basis, stop } = await starteDistServer(ziel);
  const browser = await chromium.launch();

  const warnungen = [];
  const shots = [];

  for (const route of routen) {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    const jsFehler = [];
    const kaputt = [];
    page.on('pageerror', (e) => jsFehler.push(e.message.split('\n')[0]));
    page.on('console', (m) => m.type() === 'error' && jsFehler.push(m.text().split('\n')[0]));
    page.on('requestfailed', (r) => kaputt.push(`${r.url()} (${r.failure()?.errorText})`));
    page.on('response', (r) => r.status() >= 400 && kaputt.push(`${r.url()} (HTTP ${r.status()})`));

    await page.goto(basis + route, { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const messung = await page.evaluate(() => {
      const doc = document.documentElement;
      const kaputteBilder = [...document.images]
        .filter((i) => i.complete && i.naturalWidth === 0 && !i.src.startsWith('data:'))
        .slice(0, 5)
        .map((i) => i.src);
      let ueberlauf = null;
      if (doc.scrollWidth > doc.clientWidth + 1) {
        const schuldige = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.right > doc.clientWidth + 1 || r.left < -1) {
            schuldige.push(`<${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}> bis ${Math.round(r.right)}px`);
            if (schuldige.length >= 3) break;
          }
        }
        ueberlauf = { breite: doc.scrollWidth, schuldige };
      }
      return { kaputteBilder, ueberlauf };
    });

    const shotName = `pruefung-demo${route === '/' ? '' : '-' + route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.png`;
    await page.screenshot({ path: join(ziel, shotName), fullPage: true });
    shots.push(shotName);

    const wo = routen.length > 1 ? `${route}: ` : '';
    if (messung.ueberlauf) {
      warnungen.push(
        `${wo}ÜBERLAUF über die 1280er-Bühne (${messung.ueberlauf.breite}px):\n      ${messung.ueberlauf.schuldige.join('\n      ')}`,
      );
    }
    for (const f of [...new Set(jsFehler)].slice(0, 3)) warnungen.push(`${wo}JS-Fehler -> ${f.slice(0, 110)}`);
    for (const k of [...new Set(kaputt)].slice(0, 3)) warnungen.push(`${wo}lädt nicht -> ${k.slice(0, 110)}`);
    for (const b of messung.kaputteBilder) warnungen.push(`${wo}leeres Bild -> ${b.slice(0, 110)}`);
    await page.context().close();
  }

  await browser.close();
  stop();

  if (warnungen.length > 0) {
    console.log('⚠ SICHT-CHECK: Das Design bringt Probleme mit – VOR dem Verschicken klären');
    console.log('  (am besten in Claude Design beheben lassen und neu exportieren):');
    for (const w of warnungen) console.log(`  • ${w}`);
    console.log('');
  } else {
    console.log(`✓ Sicht-Check über ${routen.length} Seite(n): kein Überlauf, keine JS-Fehler, alle Bilder laden.`);
  }
  console.log(`  PFLICHT vor dem Verschicken: die Screenshots im Demo-Ordner ANSEHEN
  (${shots.join(', ')}) –
  Kontrast, Layout und Vollständigkeit beurteilen nur Augen, kein Skript.
`);
} catch (e) {
  console.log(`↷ Sicht-Check übersprungen (${e.message.split('\n')[0].slice(0, 60)}…)
  Für die automatische Prüfung: einmal "npm install" im Projektordner ausführen.
  Bis dahin: den Link vor dem Verschicken selbst im privaten Fenster + am Handy prüfen.
`);
}

// ---------------------------------------------------------------------------
//  Hochladen
// ---------------------------------------------------------------------------
if (deployen) {
  console.log(`→ Lade zu Vercel hoch (Projekt: ${basename(ziel)}) …`);
  const r = spawnSync('npx vercel --prod --yes', { cwd: ziel, stdio: 'inherit', shell: true });
  if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);

  // Marken-Adresse als PROJEKT-Domain anbinden – nicht per "alias set": ein
  // Alias zählt beim aktiven Vercel-Zugriffsschutz als geschützte Adresse
  // (Besucher sähen einen Login!). Eine Projekt-Domain ist öffentlich und
  // hängt auch bei künftigen Uploads automatisch am neuesten Stand.
  const markenAdresse = `demo-${slug}.${MARKEN_DOMAIN}`;
  const kurzAdresse = `${basename(ziel)}.vercel.app`;
  spawnSync(`npx vercel domains add ${markenAdresse} ${basename(ziel)}`, {
    cwd: ziel, shell: true, encoding: 'utf-8',
  });
  // Ehrlicher Beweis statt Befehls-Status: erst wenn die Adresse öffentlich
  // mit 200 antwortet (kein Login-Umweg, kein Zertifikatsfehler), gilt es.
  let geklappt = false;
  for (let versuch = 1; versuch <= 3 && !geklappt; versuch++) {
    await new Promise((r) => setTimeout(r, versuch === 1 ? 5000 : 10000));
    try {
      geklappt = (await fetch(`https://${markenAdresse}`, { redirect: 'manual' })).status === 200;
    } catch { /* DNS/Zertifikat noch nicht so weit – nächster Versuch */ }
  }
  if (geklappt) {
    console.log(`
✓ Demo-Link (DIESEN verschicken): https://${markenAdresse}
  (Ersatz-Adresse: https://${kurzAdresse})`);
  } else {
    console.log(`
⚠ Marken-Adresse https://${markenAdresse} noch nicht aktiv.
  Vermutlich fehlt der einmalige DNS-Eintrag beim Domain-Anbieter:
  CNAME  *  →  cname.vercel-dns.com   (gilt danach für ALLE Demos)
  Bis dahin diesen Link verschicken: https://${kurzAdresse}`);
  }
  process.exit(0);
} else {
  console.log(`Hochladen (im Demo-Ordner, erster Lauf fragt ggf. nach dem Vercel-Team):
    cd "${ziel}"
    npx vercel --prod
    npx vercel domains add demo-${slug}.${MARKEN_DOMAIN} ${basename(ziel)}

  Dem Lead den Marken-Link schicken (https://demo-${slug}.${MARKEN_DOMAIN}) und
  vorher einmal selbst im privaten Fenster öffnen.`);
}
