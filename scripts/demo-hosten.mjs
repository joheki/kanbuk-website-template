/**
 * =============================================================================
 *  DEMO-HOSTEN – den Claude-Design-Export als schickbaren Link veröffentlichen
 * =============================================================================
 *  Für den Verkaufs-Trichter VOR dem Port: Der Claude-Design-Link selbst ist
 *  nicht teilbar (braucht Login). Claude Design erzeugt aber im Projekt eine
 *  Standalone-Datei („<Name> (Standalone).html") – eine einzige Datei mit dem
 *  kompletten Design. Dieses Skript macht daraus eine hostbare Demo:
 *
 *   1. Kanbuk-Vorschau-Leiste (unten, damit sie keinem klebenden Design-Header
 *      in die Quere kommt)
 *   2. noindex + robots.txt + X-Robots-Tag – die Demo darf NIE in Google landen
 *   3. Handy-Hinweis: der Prototyp ist eine 1280-px-Bühne; statt kaputtem
 *      Layout sieht ein Handy-Besucher eine freundliche Erklärung (wegklickbar)
 *
 *  Verwendung (aus dem Template-Ordner):
 *   1. In Claude Design: die Standalone-Datei des Projekts herunterladen
 *   2. npm run demo -- --datei "C:/Users/…/Downloads/X (Standalone).html" --kunde "Cafe Sonne"
 *   3. Das Skript baut ../kanbuk-demos/<kunde>/ und zeigt den Deploy-Befehl
 *      (mit --deploy führt es ihn direkt aus: npx vercel --prod)
 *
 *  Das ist eine DESIGN-Demo (Desktop-Bühne, Prototyp-Klicks) – kein Produkt.
 *  Die echte, responsive Website entsteht erst beim Port.
 * =============================================================================
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';

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

  npm run demo -- --datei "<Pfad zur (Standalone).html>" --kunde "<Betriebsname>"
  npm run demo -- --datei "…" --kunde "…" --deploy     (lädt direkt zu Vercel hoch)

Die Standalone-Datei erzeugt Claude Design im Projekt ("<Name> (Standalone).html") –
im Projekt öffnen und herunterladen. Optional: --ziel <ordner> (Standard:
../kanbuk-demos/<kunde>).`);
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
const ziel = resolve(process.cwd(), wert('ziel', join('..', 'kanbuk-demos', slug)));

let html = readFileSync(quelle, 'utf-8');
const groesseMb = (statSync(quelle).size / 1024 / 1024).toFixed(1);

// Plausibilitäts-Warnung: eine echte Standalone-Datei trägt das Design IN sich
// und ist entsprechend groß. Eine winzige Datei ist meist ein Fehlexport.
if (statSync(quelle).size < 100 * 1024) {
  console.warn(`⚠ Die Datei ist nur ${groesseMb} MB klein – sicher der komplette Standalone-Export?`);
}

// ---------------------------------------------------------------------------
//  Injektionen. WICHTIG: Der Standalone-Export entpackt sich selbst per JS und
//  baut dabei den <body> um – ein einfach eingefügtes <div> würde überschrieben.
//  Deshalb: Styles in den <head> (überlebt immer) und ein Skript am Datei-ENDE,
//  das die Leiste erst NACH dem Entpacken anhängt (beobachtet den <body>).
// ---------------------------------------------------------------------------

const kopfInjektion = `
<meta name="robots" content="noindex, nofollow">
<title>Design-Vorschau – ${kunde.replace(/[<>&"]/g, '')}</title>
<style id="kanbuk-demo-stil">
  /* Kanbuk-Vorschau-Leiste – UNTEN, damit sie klebenden Design-Headern nicht
     in die Quere kommt. Weißer „Cloud"-Look mit schwarzem Zeichen, violettem
     Vorschau-Text und pulsierendem grünem Live-Punkt – feste Markenwerte,
     unabhängig vom Kundendesign. */
  #kanbuk-demo-leiste {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483000;
    display: flex; align-items: center; justify-content: center; gap: .6rem;
    background: #ffffff; color: #18141f;
    border-top: 1px solid rgba(24,20,31,.08);
    box-shadow: 0 -1px 10px rgba(24,20,31,.08);
    font: 600 13px/1.4 system-ui, sans-serif; padding: 8px 14px;
  }
  #kanbuk-demo-leiste svg { width: 16px; height: 16px; flex: none; }
  #kanbuk-demo-leiste .kanbuk-wort { font-weight: 800; color: #18141f; }
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
    leiste.innerHTML = '<svg viewBox="0 0 36 36" aria-hidden="true"><g transform="translate(3,4) scale(1.32)" fill="none" stroke="#18141f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 11 Q15 6.5 21.5 10"></path><path d="M19.4 9 L22 10.2 L21 12.8"></path><path d="M22 19 Q15 23.5 8.5 20"></path><path d="M10.6 21 L8 19.8 L9 17.2"></path></g></svg>'
      + '<span class="kanbuk-wort">Kanbuk</span>'
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
  // Nach dem Entpacken einbauen – und dranbleiben, falls der Export den
  // <body> später nochmals umbaut (Beobachter hängt die Leiste wieder an).
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', einbauen);
  else einbauen();
  new MutationObserver(einbauen).observe(document.documentElement, { childList: true, subtree: true });
})();
</script>
`;

// In den <head> (bzw. an den Anfang, falls keiner existiert) …
if (/<head[^>]*>/i.test(html)) {
  html = html.replace(/<head[^>]*>/i, (m) => m + kopfInjektion);
} else {
  html = kopfInjektion + html;
}
// … und ans Datei-Ende.
html = /<\/html>\s*$/i.test(html) ? html.replace(/<\/html>\s*$/i, `${fussInjektion}\n</html>\n`) : html + fussInjektion;

// ---------------------------------------------------------------------------
//  Demo-Ordner schreiben
// ---------------------------------------------------------------------------
mkdirSync(ziel, { recursive: true });
writeFileSync(join(ziel, 'index.html'), html, 'utf-8');
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
  Quelle: ${quelle} (${groesseMb} MB)
  Drin: Kanbuk-Leiste (unten), Handy-Hinweis, noindex + robots + X-Robots-Tag
`);

// ---------------------------------------------------------------------------
//  Sicht-Check der VERPACKTEN Demo – bevor der Link zu einem Lead geht.
//  Misst, was messbar ist (Überlauf über die 1280er-Bühne, JS-Fehler, kaputte
//  Bilder/Ressourcen) und macht einen Ganzseiten-Screenshot für das, was nur
//  Augen beurteilen können (Kontrast, dunkle Schrift auf dunklem Grund,
//  Layout-Brüche). Der Screenshot MUSS danach angesehen werden.
//
//  Läuft nur, wenn playwright installiert ist (Template-Ordner bzw. Klon nach
//  `npm install`) – ohne wird die Prüfung übersprungen, das Verpacken selbst
//  braucht weiterhin kein npm install.
// ---------------------------------------------------------------------------
try {
  const { chromium } = await import('playwright');
  const { starteDistServer } = await import('./lib/dist-server.mjs');
  const { basis, stop } = await starteDistServer(ziel);

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

  const jsFehler = [];
  const kaputt = [];
  page.on('pageerror', (e) => jsFehler.push(e.message.split('\n')[0]));
  page.on('console', (m) => m.type() === 'error' && jsFehler.push(m.text().split('\n')[0]));
  page.on('requestfailed', (r) => kaputt.push(`${r.url()} (${r.failure()?.errorText})`));
  page.on('response', (r) => r.status() >= 400 && kaputt.push(`${r.url()} (HTTP ${r.status()})`));

  await page.goto(basis + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1500); // Selbst-Entpacken + Bilder abwarten

  // Leere Bild-Kacheln (Export unvollständig?) und Überlauf über die Bühne
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

  const shot = join(ziel, 'pruefung-demo.png');
  await page.screenshot({ path: shot, fullPage: true });
  await browser.close();
  stop();

  const warnungen = [];
  if (messung.ueberlauf) {
    warnungen.push(
      `ÜBERLAUF über die 1280er-Bühne (${messung.ueberlauf.breite}px breit):\n      ${messung.ueberlauf.schuldige.join('\n      ')}`,
    );
  }
  for (const f of [...new Set(jsFehler)].slice(0, 5)) warnungen.push(`JS-Fehler -> ${f.slice(0, 120)}`);
  for (const k of [...new Set(kaputt)].slice(0, 5)) warnungen.push(`lädt nicht -> ${k.slice(0, 120)}`);
  for (const b of messung.kaputteBilder) warnungen.push(`leeres Bild (Export unvollständig?) -> ${b.slice(0, 120)}`);

  if (warnungen.length > 0) {
    console.log('⚠ SICHT-CHECK: Das Design bringt Probleme mit – VOR dem Verschicken klären');
    console.log('  (am besten in Claude Design beheben lassen und neu exportieren):');
    for (const w of warnungen) console.log(`  • ${w}`);
    console.log('');
  } else {
    console.log('✓ Sicht-Check: kein Überlauf, keine JS-Fehler, alle Bilder laden.');
  }
  console.log(`  PFLICHT vor dem Verschicken: ${shot.split(/[\\/]/).pop()} im Demo-Ordner ANSEHEN –
  Kontrast (dunkle Schrift auf dunklem Grund!), Layout, Vollständigkeit
  beurteilen nur Augen, kein Skript.
`);
} catch (e) {
  console.log(`↷ Sicht-Check übersprungen (${e.message.split('\n')[0].slice(0, 60)}…)
  Für die automatische Prüfung: einmal "npm install" im Projektordner ausführen.
  Bis dahin: den Link vor dem Verschicken selbst im privaten Fenster + am Handy prüfen.
`);
}

if (deployen) {
  console.log('→ Lade zu Vercel hoch (Projekt: kanbuk-demo-' + slug + ') …');
  const r = spawnSync(`npx vercel --prod --name kanbuk-demo-${slug}`, {
    cwd: ziel,
    stdio: 'inherit',
    shell: true,
  });
  process.exit(r.status ?? 0);
} else {
  console.log(`Hochladen (im Demo-Ordner, erster Lauf fragt nach dem Vercel-Team):
    cd "${ziel}"
    npx vercel --prod

  Dem Lead NUR den kurzen Alias schicken (https://….vercel.app) und vorher
  einmal selbst im privaten Fenster öffnen.`);
}
