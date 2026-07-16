/**
 * =============================================================================
 *  DAS PRÜF-TOR
 * =============================================================================
 *  Macht aus dem Regelwerk einen Motor: Ein Vorsatz kann gebrochen werden,
 *  ein rotes Skript nicht.
 *
 *  Prüft die FERTIG GEBAUTE Seite (dist/) – nicht den Quelltext. Damit fällt
 *  auf, was wirklich beim Besucher ankommt.
 *
 *      npm run check          (baut immer zuerst, dann prüft)
 *      npm run check -- --live   zusätzlich die Live-Pflichten
 *
 *  Rot = die Seite darf nicht raus.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const WURZEL = process.cwd();
const DIST = join(WURZEL, 'dist');
const CONFIG = join(WURZEL, 'content.config.ts');
const nurLive = process.argv.includes('--live');

/** Läuft der Check im Template selbst? Dann sind die Referenzdaten Absicht.
    Der /port-Skill trägt beim Kunden einen eigenen Namen ein -> ab dann streng. */
const pkg = existsSync(join(WURZEL, 'package.json'))
  ? JSON.parse(readFileSync(join(WURZEL, 'package.json'), 'utf-8'))
  : {};
const istTemplate = pkg.name === 'kanbuk-website-template';

const probleme = [];
const warnungen = [];
const fehler = (t) => probleme.push(t);
const warnung = (t) => warnungen.push(t);

// ---------------------------------------------------------------------------
//  Dateien einsammeln
// ---------------------------------------------------------------------------
function alleDateien(dir, treffer = []) {
  if (!existsSync(dir)) return treffer;
  for (const eintrag of readdirSync(dir)) {
    const p = join(dir, eintrag);
    if (statSync(p).isDirectory()) alleDateien(p, treffer);
    else treffer.push(p);
  }
  return treffer;
}

if (!existsSync(DIST)) {
  console.error('✗ dist/ fehlt. Bitte zuerst "npm run build" ausführen.');
  process.exit(1);
}

const dateien = alleDateien(DIST);
const htmlDateien = dateien.filter((f) => extname(f) === '.html');
const kurz = (f) => relative(DIST, f).replace(/\\/g, '/');

if (htmlDateien.length === 0) {
  console.error('✗ Keine HTML-Seiten in dist/ gefunden.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
//  1. KEINE EXTERNEN REQUESTS
//     Externe Schriften/Skripte/Bilder = fremde Server, Cookies, DSGVO-Problem
//     und langsamer. Alles muss lokal liegen.
// ---------------------------------------------------------------------------
const configTextFrueh = existsSync(CONFIG) ? readFileSync(CONFIG, 'utf-8') : '';
/** Die eigene Domain ist kein „fremder Server“ – canonical/hreflang zeigen absichtlich dorthin. */
const eigeneDomain = configTextFrueh.match(/domain:\s*['"]https?:\/\/([^'"/]+)/)?.[1];

const ERLAUBTE_HOSTS = [
  'schema.org', // JSON-LD-Kontext, wird nie geladen
  'www.w3.org', // SVG-Namensraum
  ...(eigeneDomain ? [eigeneDomain] : []),
];

/** rel-Werte, die nur VERWEISEN statt zu laden – die dürfen absolut sein. */
const NUR_VERWEIS = /\brel=["'](?:canonical|alternate|me|author|license|prev|next)["']/i;

for (const f of htmlDateien) {
  const html = readFileSync(f, 'utf-8');

  // Ladende Attribute mit externer URL (src/href in link/script/img/iframe)
  const ladend = html.matchAll(
    /<(?:link|script|img|iframe|source|video|audio)\b[^>]*?\b(?:src|href)=["'](https?:\/\/[^"']+)["'][^>]*>/gi,
  );
  for (const m of ladend) {
    if (NUR_VERWEIS.test(m[0])) continue; // canonical/hreflang laden nichts
    const host = new URL(m[1]).host;
    if (!ERLAUBTE_HOSTS.includes(host)) {
      fehler(`${kurz(f)}: lädt von einem fremden Server -> ${host}\n    ${m[1].slice(0, 90)}`);
    }
  }

  // @import und url() in eingebettetem CSS
  for (const m of html.matchAll(/@import\s+(?:url\()?["']?(https?:\/\/[^"')]+)/gi)) {
    fehler(`${kurz(f)}: CSS @import von extern -> ${m[1].slice(0, 90)}`);
  }
  for (const m of html.matchAll(/url\((["']?)(https?:\/\/[^"')]+)\1\)/gi)) {
    const host = new URL(m[2]).host;
    if (!ERLAUBTE_HOSTS.includes(host)) {
      fehler(`${kurz(f)}: CSS lädt von extern -> ${host}`);
    }
  }
}

// CSS-Dateien ebenfalls prüfen
for (const f of dateien.filter((f) => extname(f) === '.css')) {
  const css = readFileSync(f, 'utf-8');
  for (const m of css.matchAll(/(?:@import\s+(?:url\()?|url\()\s*["']?(https?:\/\/[^"')]+)/gi)) {
    fehler(`${kurz(f)}: lädt von extern -> ${m[1].slice(0, 90)}`);
  }
}

// ---------------------------------------------------------------------------
//  2. KEINE COOKIES, KEIN TRACKING, KEINE LIVE-MAPS
// ---------------------------------------------------------------------------
/**
 * Sind zustimmungspflichtige Dienste aktiv?
 *
 * Bewusst aus dem FERTIGEN BUILD abgeleitet, nicht aus dem Quelltext: Ein
 * Muster auf content.config.ts würde auch in Kommentaren und Typdefinitionen
 * anschlagen (Beispiel-Code!) und Fehlalarme erzeugen. Was gebaut wurde, lügt nicht.
 */
const hatDienste = htmlDateien.some((f) =>
  /<script[^>]+data-einwilligung=/i.test(readFileSync(f, 'utf-8')),
);

for (const f of htmlDateien) {
  const html = readFileSync(f, 'utf-8');
  const name = kurz(f);

  // <iframe> darf NIE fest im HTML stehen: er lädt sofort und setzt Cookies.
  // Erlaubt ist nur die 2-Klick-Einbettung – dort entsteht er erst beim Klick.
  if (/<iframe\b/i.test(html)) {
    fehler(
      `${name}: fest eingebauter <iframe> – lädt sofort und setzt Cookies.\n` +
        `    Anfahrt: "npm run karte" (statisches Bild). Muss es ein Rahmen sein: <Einbettung> (2-Klick).`,
    );
  }

  if (/document\.cookie\s*=/i.test(html)) {
    fehler(`${name}: setzt ein Cookie – die Seite muss cookiefrei bleiben (sonst Banner-Pflicht)`);
  }

  // Tracking-Code: nur erlaubt, wenn er als type="text/plain" geparkt ist
  // (dann führt der Browser ihn NICHT aus – erst nach der Einwilligung).
  const trackingMuster = /google-analytics|googletagmanager|gtag\(|fbq\(|_paq\.push|hotjar|clarity\.ms/i;
  if (trackingMuster.test(html)) {
    const skripte = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    for (const [, attrs, inhalt] of skripte) {
      if (!trackingMuster.test(attrs + inhalt)) continue;
      const geparkt = /type=["']text\/plain["']/i.test(attrs) && /data-einwilligung=/i.test(attrs);
      if (!geparkt) {
        fehler(
          `${name}: Tracking-Code läuft OHNE Einwilligung.\n` +
            `    Muss als <script type="text/plain" data-einwilligung="marketing"> geparkt werden` +
            ` (content.config.ts -> dienste).`,
        );
        break;
      }
    }
  }

  // Wenn Dienste konfiguriert sind, MUSS der Banner da sein.
  if (hatDienste && !/data-einwilligung-banner/.test(html)) {
    fehler(`${name}: Dienste sind konfiguriert, aber der Einwilligungs-Banner fehlt`);
  }
}

// Dienste ohne Datenschutz-Angaben = rechtlich unvollständig.
if (hatDienste) {
  const ds = htmlDateien.find((f) => kurz(f).startsWith('datenschutz'));
  if (!ds) {
    fehler('Dienste sind konfiguriert, aber es gibt keine Datenschutzseite');
  } else {
    const html = readFileSync(ds, 'utf-8');
    if (!/data-einwilligung-widerruf/.test(html)) {
      fehler('datenschutz: Widerruf-Knopf fehlt – der Widerruf muss so einfach sein wie die Zustimmung (DSGVO)');
    }
    // Nur die PAUSCHALE Behauptung ist falsch. Sätze wie „ohne Ihre Einwilligung
    // werden keine Cookies gesetzt" sind korrekt und rechtlich sogar wichtig –
    // deshalb hier gezielt auf die Aussage prüfen, nicht auf zwei Wörter.
    const pauschal = [
      /Keine Cookies,\s*kein Tracking/i,
      /verwendet\s*(?:<strong>)?\s*keine Cookies/i,
      /(?:benötigt|braucht)[^.]{0,40}keinen Cookie-Banner/i,
    ];
    if (pauschal.some((m) => m.test(html))) {
      fehler(
        'datenschutz: behauptet pauschal „keine Cookies / kein Banner nötig", obwohl Dienste aktiv sind – falsche Angabe',
      );
    }
  }
}

// ---------------------------------------------------------------------------
//  3. META JE SEITE – der ganze Grund für echte Unterseiten
// ---------------------------------------------------------------------------
const titelGesehen = new Map();
const descGesehen = new Map();

for (const f of htmlDateien) {
  const html = readFileSync(f, 'utf-8');
  const name = kurz(f);

  const titel = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  const desc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim();
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1];
  const ogBild = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i)?.[1];

  if (!titel) fehler(`${name}: <title> fehlt`);
  else if (titel.length > 65) warnung(`${name}: <title> ist ${titel.length} Zeichen lang (Google zeigt ~60)`);

  if (!desc) fehler(`${name}: <meta name="description"> fehlt`);
  else if (desc.length < 70) warnung(`${name}: Description ist kurz (${desc.length} Zeichen, gut sind 120–160)`);
  else if (desc.length > 170) warnung(`${name}: Description ist ${desc.length} Zeichen lang (Google kürzt ab ~160)`);

  if (!canonical) fehler(`${name}: <link rel="canonical"> fehlt`);
  if (!ogBild) fehler(`${name}: og:image fehlt (sonst zeigt WhatsApp keine Vorschau)`);
  else {
    // Das Tag allein reicht nicht – die DATEI muss auch existieren.
    const ogPfad = ogBild.replace(/^https?:\/\/[^/]+/, '');
    if (ogPfad.startsWith('/') && !existsSync(join(DIST, ogPfad.slice(1)))) {
      fehler(`${name}: og:image zeigt auf ${ogPfad}, aber die Datei fehlt im Build`);
    }
  }

  // Favicon/Apple-Icon: verlinkte Dateien müssen existieren.
  for (const m of html.matchAll(/<link\s+rel=["'](?:icon|apple-touch-icon)["']\s+href=["'](\/[^"']+)["']/gi)) {
    if (!existsSync(join(DIST, m[1].slice(1)))) {
      fehler(`${name}: verlinkt ${m[1]}, aber die Datei fehlt im Build`);
    }
  }

  // hreflang-Ziele müssen als Seiten existieren – sonst zeigt die
  // Mehrsprachigkeits-Auszeichnung ins Leere (SEO-Schaden statt Nutzen).
  for (const m of html.matchAll(/<link\s+rel=["']alternate["']\s+hreflang=["'][^"']+["']\s+href=["']([^"']+)["']/gi)) {
    const pfadTeil = m[1].replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '') || '/';
    const kandidaten =
      pfadTeil === '/'
        ? [join(DIST, 'index.html')]
        : [join(DIST, pfadTeil.slice(1), 'index.html'), join(DIST, `${pfadTeil.slice(1)}.html`)];
    if (!kandidaten.some((k) => existsSync(k))) {
      fehler(
        `${name}: hreflang verweist auf ${pfadTeil}, aber diese Seite existiert nicht im Build.\n` +
          `    Entweder die Sprach-Seiten wirklich bauen (src/pages/en/…) oder sprachen auf ['de'] lassen.`,
      );
    }
  }

  // Doppelte Titel/Descriptions = Duplicate-Content-Signal (die 404 zählt nicht mit)
  if (!name.startsWith('404')) {
    if (titel) titelGesehen.set(titel, [...(titelGesehen.get(titel) ?? []), name]);
    if (desc) descGesehen.set(desc, [...(descGesehen.get(desc) ?? []), name]);
  }

  // Genau eine <h1> je Seite
  const h1 = (html.match(/<h1\b/gi) ?? []).length;
  if (h1 === 0) fehler(`${name}: keine <h1>`);
  else if (h1 > 1) fehler(`${name}: ${h1} <h1>-Überschriften (genau eine gehört auf jede Seite)`);

  // Sprache gesetzt
  if (!/<html[^>]+lang=/i.test(html)) fehler(`${name}: <html lang="…"> fehlt`);

  // Viewport – ohne den ist keine Responsiveness möglich
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) fehler(`${name}: <meta name="viewport"> fehlt`);

  // Alt-Texte
  for (const m of html.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/gi)) {
    fehler(`${name}: <img> ohne alt-Attribut -> ${m[0].slice(0, 70)}`);
  }
}

for (const [titel, seiten] of titelGesehen) {
  if (seiten.length > 1) fehler(`Gleicher <title> auf mehreren Seiten (${seiten.join(', ')}): "${titel}"`);
}
for (const [, seiten] of descGesehen) {
  if (seiten.length > 1) fehler(`Gleiche Description auf mehreren Seiten: ${seiten.join(', ')}`);
}

// ---------------------------------------------------------------------------
//  4. RESPONSIVENESS – feste Breiten sind der häufigste Fehler beim Portieren
// ---------------------------------------------------------------------------
for (const f of htmlDateien) {
  const html = readFileSync(f, 'utf-8');
  const name = kurz(f);

  // width/min-width mit festem px-Wert über 400px sprengt schmale Screens.
  // max-width ist erlaubt (begrenzt nur nach oben).
  for (const m of html.matchAll(/(?<!max-)\b(?:min-)?width:\s*(\d{3,})px/gi)) {
    if (Number(m[1]) > 400) {
      fehler(`${name}: feste Breite ${m[1]}px – am Handy bricht das. Token verwenden (siehe CLAUDE.md)`);
    }
  }
  // Inline-Styles mit festem padding sind ein Zeichen für ungetokenisierten Design-Code
  const inlinePadding = [...html.matchAll(/style=["'][^"']*padding:\s*(\d{2,})px/gi)];
  if (inlinePadding.length > 3) {
    warnung(
      `${name}: ${inlinePadding.length}× festes padding in style="…" – vermutlich ungetokenisierter Design-Code. Auf var(--raum-*) umstellen.`,
    );
  }
}

// ---------------------------------------------------------------------------
//  5. JSON-LD
// ---------------------------------------------------------------------------
for (const f of htmlDateien.filter((f) => !kurz(f).startsWith('404'))) {
  const html = readFileSync(f, 'utf-8');
  const block = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!block) {
    fehler(`${kurz(f)}: JSON-LD fehlt`);
    continue;
  }
  try {
    JSON.parse(block);
  } catch {
    fehler(`${kurz(f)}: JSON-LD ist kaputt (kein gültiges JSON)`);
  }
}

// ---------------------------------------------------------------------------
//  5a. LESBARKEIT – Kontrast der Design-Farben (WCAG)
//      Jedes Design ist einzigartig – niemand sonst prüft, ob die Textfarbe
//      auf dem Hintergrund lesbar ist. Unter 3:1 ist Text praktisch unlesbar,
//      unter 4,5:1 fällt er durch die Zugänglichkeits-Norm für Fließtext.
// ---------------------------------------------------------------------------
function relLuminanz(hex) {
  const h = hex.replace('#', '');
  const voll = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(voll.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function kontrast(hexA, hexB) {
  const [l1, l2] = [relLuminanz(hexA), relLuminanz(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}
{
  const startHtml = readFileSync(htmlDateien.find((f) => kurz(f) === 'index.html') ?? htmlDateien[0], 'utf-8');
  const farbe = (name) => startHtml.match(new RegExp(`--farbe-${name}:\\s*(#[0-9a-fA-F]{3,6})`))?.[1];
  const text = farbe('text');
  const hintergrund = farbe('hintergrund');
  if (text && hintergrund) {
    const v = kontrast(text, hintergrund);
    if (v < 3) {
      fehler(
        `Lesbarkeit: Textfarbe ${text} auf Hintergrund ${hintergrund} hat nur ${v.toFixed(1)}:1 Kontrast – praktisch unlesbar. Farben in content.config.ts -> design.farben anpassen.`,
      );
    } else if (v < 4.5) {
      warnung(
        `Lesbarkeit: Textfarbe ${text} auf Hintergrund ${hintergrund} hat ${v.toFixed(1)}:1 Kontrast (Norm für Fließtext: 4,5:1). Besser eine dunklere/hellere Textfarbe wählen.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
//  5b. BILD-PIPELINE – läuft sie überhaupt?
//      Liegen Fotos in fotos/, aber im Build taucht kein optimiertes Bild auf,
//      dann greift die Auflösung ins Leere (z. B. falscher Pfad in bilder.ts).
//      Ohne diese Prüfung bleibt so ein Fehler still, bis er beim Kunden auffällt.
// ---------------------------------------------------------------------------
const fotoOrdner = join(WURZEL, 'fotos');
if (existsSync(fotoOrdner)) {
  const eingang = alleDateien(fotoOrdner).filter((f) =>
    ['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(extname(f).toLowerCase()),
  );
  // Nur BILDER in _astro/ zählen – dort liegen auch JS/CSS-Bündel.
  const optimiert = dateien.filter(
    (f) =>
      kurz(f).startsWith('_astro/') &&
      ['.webp', '.avif', '.jpg', '.jpeg', '.png'].includes(extname(f).toLowerCase()),
  );
  if (eingang.length > 0 && optimiert.length === 0) {
    fehler(
      `In fotos/ liegen ${eingang.length} Bild(er), aber der Build hat keines optimiert.\n` +
        `    Die Bild-Auflösung greift ins Leere – siehe src/lib/bilder.ts (Ordner-Pfad).`,
    );
  }

  // ALLES in fotos/ wird mitveröffentlicht – auch Bilder, die auf keiner Seite
  // vorkommen. Beim Kunden kann so ein nur „geparktes" Foto ungewollt öffentlich
  // auf dem Server landen. WICHTIG: „liegt in dist/" reicht als Kriterium nicht,
  // weil die Bild-Pipeline alle Fotos emittiert – zählt nur, was eine Seite
  // wirklich REFERENZIERT. Deshalb (nur beim Kunden, nicht im Referenz-Template):
  if (!istTemplate) {
    const referenziert = new Set();
    for (const f of dateien.filter((f) => ['.html', '.css', '.js'].includes(extname(f)))) {
      const inhalt = readFileSync(f, 'utf-8');
      for (const m of inhalt.matchAll(/_astro\/([A-Za-z0-9._-]+?)\.[A-Za-z0-9_-]+\.\w+/g)) {
        referenziert.add(m[1].toLowerCase());
      }
    }
    for (const b of eingang) {
      const basis = b.split(/[\\/]/).pop().replace(/\.[^.]+$/, '').toLowerCase();
      if (!referenziert.has(basis)) {
        warnung(
          `fotos/${b.split(/[\\/]/).pop()}: wird auf keiner Seite verwendet, landet aber öffentlich am Server. Entfernen oder einbauen.`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
//  6. BILDER – Gewicht und Format
// ---------------------------------------------------------------------------
const bilder = dateien.filter((f) => ['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(extname(f).toLowerCase()));
for (const b of bilder) {
  const kb = statSync(b).size / 1024;
  const name = kurz(b);
  if (name === 'og.jpg') continue; // OG-Bild darf größer sein
  if (kb > 300) fehler(`${name}: ${Math.round(kb)} KB – zu schwer (Richtwert: max. 200 KB, Hero ~200 KB)`);
  else if (kb > 200) warnung(`${name}: ${Math.round(kb)} KB – grenzwertig`);
}

// ---------------------------------------------------------------------------
//  7. MODE-KONSISTENZ (demo vs. live)
// ---------------------------------------------------------------------------
const configText = existsSync(CONFIG) ? readFileSync(CONFIG, 'utf-8') : '';
const istLive = /mode:\s*'live'/.test(configText);
const robots = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf-8') : '';

for (const f of htmlDateien) {
  const html = readFileSync(f, 'utf-8');
  const noindex = /content=["']noindex/i.test(html);
  if (istLive && noindex && !kurz(f).startsWith('404')) {
    fehler(`${kurz(f)}: mode ist 'live', aber die Seite steht auf noindex`);
  }
  if (!istLive && !noindex) {
    fehler(`${kurz(f)}: mode ist 'demo', aber es fehlt noindex – die Vorschau darf NICHT in Google landen`);
  }
}
if (!istLive && !/Disallow:\s*\//.test(robots)) {
  fehler('robots.txt erlaubt Zugriff, obwohl mode auf "demo" steht');
}
if (istLive && /Disallow:\s*\/\s*$/m.test(robots)) {
  fehler('robots.txt sperrt alles, obwohl mode auf "live" steht');
}

// ---------------------------------------------------------------------------
//  8. REFERENZ-RESTE & PLATZHALTER (Lücken-Inventar)
// ---------------------------------------------------------------------------
const REFERENZ_MARKER = [
  'Muster Betrieb',
  'muster-betrieb.example',
  'Musterstraße 1',
  'ATU00000000',
  'FN 000000a',
  '+43 1 000 00 00',
  'Referenz-Seite des Kanbuk-Motors',
];
const referenzReste = REFERENZ_MARKER.filter((m) => configText.includes(m));
if (referenzReste.length > 0) {
  if (istTemplate) {
    // Im Template selbst ist die Referenz Absicht – sie hält den Standard vorführbar.
    console.log('ℹ Referenz-Template (noch keine Kundendaten) – beim Kunden wird dieser Block ersetzt.\n');
  } else {
    for (const m of referenzReste) {
      fehler(`content.config.ts enthält noch den Referenz-Wert „${m}" – durch echte Kundendaten ersetzen`);
    }
  }
}

// Leere Pflichtfelder
for (const feld of ['name', 'claim', 'kurzbeschreibung', 'telefon', 'email', 'domain']) {
  const re = new RegExp(`${feld}:\\s*['"]\\s*['"]`);
  if (re.test(configText)) fehler(`content.config.ts: Feld "${feld}" ist leer`);
}

// ---------------------------------------------------------------------------
//  8b. NUR IM TEMPLATE: bleibt es kundenfrei?
//      Das Template ist die Vorlage für ALLE Kunden. Steht dort die Adresse von
//      Kunde A als Beispiel, schleppt Kunde B sie in seinem Ordner mit sich herum.
//      Deshalb: im Template sind nur Musterdaten erlaubt.
// ---------------------------------------------------------------------------
if (istTemplate) {
  const motorDateien = [
    ...alleDateien(join(WURZEL, 'src')),
    ...alleDateien(join(WURZEL, 'scripts')),
    ...alleDateien(join(WURZEL, '.claude')),
    ...alleDateien(join(WURZEL, 'vorlagen')),
    join(WURZEL, 'content.config.ts'),
    join(WURZEL, 'CLAUDE.md'),
    join(WURZEL, 'README.md'),
  ].filter((f) => existsSync(f) && ['.ts', '.astro', '.mjs', '.md', '.css'].includes(extname(f)));

  // Verräterische Muster echter Kundendaten in Beispielen/Kommentaren.
  const kundenspuren = [
    { muster: /\+43[\s\d/-]{7,}/g, was: 'eine echte österreichische Telefonnummer' },
    { muster: /[\w.-]+@(?!.*\.example)[\w-]+\.(?:at|com|net|org)\b/g, was: 'eine echte E-Mail-Adresse' },
    { muster: /claude\.ai\/design\/p\/[0-9a-f-]{8,}/g, was: 'ein echter Design-Projekt-Link' },
  ];
  // Erlaubt: alles rund um die Musterdaten und offensichtliche Doku-Beispiele.
  const harmlos = /muster-betrieb|@example|ihr-betrieb|\+43 1 000 00 00|noreply@anthropic/i;

  for (const f of motorDateien) {
    const text = readFileSync(f, 'utf-8');
    for (const { muster, was } of kundenspuren) {
      for (const treffer of text.match(muster) ?? []) {
        if (harmlos.test(treffer)) continue;
        warnung(
          `${relative(WURZEL, f).replace(/\\/g, '/')}: enthält ${was} („${treffer.trim()}“) – ` +
            `im Template gehören nur Musterdaten (siehe CLAUDE.md, „Das Template bleibt kundenfrei“).`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
//  9. LIVE-PFLICHTEN (nur bei mode: 'live' oder --live)
// ---------------------------------------------------------------------------
if (istLive || nurLive) {
  // Bewusst GROSSGESCHRIEBEN geprüft: Marker werden als "PLATZHALTER: UID" gesetzt.
  // (Kleingeschrieben würde das Schema-Feld `platzhalter` jeden Live-Gang blockieren.)
  if (/PLATZHALTER|TODO|XXX/.test(configText)) {
    fehler('content.config.ts enthält noch Marker (PLATZHALTER/TODO) – vor dem Live-Gang ersetzen');
  }
  // STAND.md ist das Gedächtnis des Projekts: Offene Punkte im Lücken-Inventar
  // ([ ]) blockieren den Live-Gang – erledigt wird mit [x] abgehakt.
  const standDatei = join(WURZEL, 'STAND.md');
  if (existsSync(standDatei)) {
    const stand = readFileSync(standDatei, 'utf-8');
    const offen = [...stand.matchAll(/^\s*-\s*\[ \]\s*(.+)$/gm)]
      .map((m) => m[1].trim())
      .filter((z) => !z.startsWith('*(')); // die Beispielzeile der Vorlage zählt nicht
    for (const punkt of offen) {
      fehler(`STAND.md: offener Punkt vor dem Live-Gang -> "${punkt.slice(0, 90)}"`);
    }
  } else {
    warnung('STAND.md fehlt – das Lücken-Inventar dieses Projekts ist nirgends festgehalten.');
  }
  if (!/uid:\s*'AT[UO]\d/.test(configText)) {
    warnung('Rechtstexte: UID-Nummer sieht nicht nach einer echten österreichischen UID aus');
  }
  if (!existsSync(join(DIST, 'sitemap-index.xml')) && !existsSync(join(DIST, 'sitemap-0.xml'))) {
    warnung('Keine Sitemap gefunden, obwohl die Seite live geht');
  }
}

// ---------------------------------------------------------------------------
//  Ergebnis
// ---------------------------------------------------------------------------
console.log('');
console.log(
  `Geprüft: ${htmlDateien.length} Seite(n), ${bilder.length} Bild(er) — Modus: ${istLive ? 'live' : 'demo'} — Motor ${pkg.version ?? '?'}`,
);
console.log('');

if (warnungen.length > 0) {
  console.log('⚠ Hinweise:');
  for (const w of warnungen) console.log(`  • ${w}`);
  console.log('');
}

if (probleme.length > 0) {
  console.log('✗ Diese Seite darf so nicht raus:');
  for (const p of probleme) console.log(`  • ${p}`);
  console.log('');
  console.log(`${probleme.length} Problem(e). Details zu den Regeln: CLAUDE.md`);
  process.exit(1);
}

console.log('✓ Prüf-Tor bestanden. Die Seite erfüllt den Standard.');
