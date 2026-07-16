/**
 * =============================================================================
 *  SCHRIFT – jede Google-Schrift lokal einbetten
 * =============================================================================
 *  Claude Design wählt Schriften frei und verlinkt sie per CDN. Das ist bei uns
 *  verboten: externe Requests bedeuten fremde Server, DSGVO-Fragen und Wartezeit.
 *
 *  Dieses Skript lädt die Schrift herunter, legt sie nach public/fonts/ und
 *  schreibt die @font-face-Regeln in src/styles/fonts.css.
 *
 *      npm run schrift -- --familie "<Name laut fonts.google.com>"
 *      npm run schrift -- --familie "<Name>" --schnitte 300,400,600,700
 *      npm run schrift -- --familie "<Name>" --kursiv
 *
 *  Danach in content.config.ts eintragen:
 *      schriften: { ueberschrift: "'<Name>', Georgia, serif", … }
 * =============================================================================
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WURZEL = process.cwd();
const FONT_DIR = join(WURZEL, 'public', 'fonts');
const CSS_DATEI = join(WURZEL, 'src', 'styles', 'fonts.css');

// --- CLI ---------------------------------------------------------------
const args = process.argv.slice(2);
const wert = (name, standard) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : standard;
};
const familie = wert('familie');
const schnitte = wert('schnitte', '400,700').split(',').map((s) => s.trim());
const kursiv = args.includes('--kursiv');

if (!familie) {
  console.error(`
Bitte eine Schriftfamilie angeben:

  npm run schrift -- --familie "<Name laut fonts.google.com>"
  npm run schrift -- --familie "<Name>" --schnitte 300,400,600,700 --kursiv

Optionen:
  --familie   Name laut Google Fonts (Pflicht)
  --schnitte  Strichstärken, Standard: 400,700
  --kursiv    zusätzlich die kursiven Schnitte
`);
  process.exit(1);
}

// --- Google-Fonts-CSS holen -------------------------------------------
// Mit modernem User-Agent -> wir bekommen woff2 (kleinstes Format).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function cssUrl() {
  const fam = familie.replace(/ /g, '+');
  if (kursiv) {
    const paare = schnitte.flatMap((s) => [`0,${s}`, `1,${s}`]).sort();
    return `https://fonts.googleapis.com/css2?family=${fam}:ital,wght@${paare.join(';')}&display=swap`;
  }
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@${schnitte.join(';')}&display=swap`;
}

async function hole(url, alsText = true) {
  const antwort = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!antwort.ok) throw new Error(`${antwort.status} ${antwort.statusText} bei ${url}`);
  return alsText ? antwort.text() : Buffer.from(await antwort.arrayBuffer());
}

function dateiname(fam, gewicht, istKursiv, hash) {
  const basis = fam.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${basis}-${gewicht}${istKursiv ? '-italic' : ''}-${hash}.woff2`;
}

console.log(`→ Lade "${familie}" (${schnitte.join(', ')}${kursiv ? ', kursiv' : ''}) …`);

let css;
try {
  css = await hole(cssUrl());
} catch (e) {
  console.error(`✗ Konnte die Schrift nicht laden: ${e.message}`);
  console.error('  Stimmt der Name genau so wie auf fonts.google.com?');
  process.exit(1);
}

// --- Blöcke zerlegen ---------------------------------------------------
const bloecke = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map((m) => m[1]);
if (bloecke.length === 0) {
  console.error('✗ Keine @font-face-Regeln gefunden – Name prüfen.');
  process.exit(1);
}

mkdirSync(FONT_DIR, { recursive: true });

/** Gleiche Datei für mehrere Schnitte (Variable Fonts) nur einmal speichern. */
const gespeichert = new Map();
const regeln = [];
let geladen = 0;

for (const block of bloecke) {
  const url = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
  if (!url) continue;
  const gewicht = block.match(/font-weight:\s*([^;]+);/)?.[1].trim() ?? '400';
  const stil = block.match(/font-style:\s*([^;]+);/)?.[1].trim() ?? 'normal';
  const unicode = block.match(/unicode-range:\s*([^;]+);/)?.[1].trim();

  // Nur die für Deutsch nötigen Zeichensätze (latin + latin-ext).
  // Spart deutlich Gewicht: kyrillisch/griechisch braucht kein Wiener Betrieb.
  if (unicode && !/U\+0000|U\+0100|U\+0301/.test(unicode)) continue;

  let datei = gespeichert.get(url);
  if (!datei) {
    const hash = url.slice(-12).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
    datei = dateiname(familie, gewicht.replace(/\s+/g, '-'), stil === 'italic', hash);
    const daten = await hole(url, false);
    writeFileSync(join(FONT_DIR, datei), daten);
    gespeichert.set(url, datei);
    geladen++;
    console.log(`  ✓ ${datei} (${Math.round(daten.length / 1024)} KB)`);
  }

  regeln.push(
    [
      '@font-face {',
      `  font-family: '${familie}';`,
      `  font-style: ${stil};`,
      `  font-weight: ${gewicht};`,
      '  font-display: swap;',
      `  src: url('/fonts/${datei}') format('woff2');`,
      ...(unicode ? [`  unicode-range: ${unicode};`] : []),
      '}',
    ].join('\n'),
  );
}

if (regeln.length === 0) {
  console.error('✗ Keine passenden Schnitte gefunden (latin).');
  process.exit(1);
}

// --- fonts.css schreiben (bestehende Familien behalten) ----------------
const KOPF = `/* Lokale Schriften – erzeugt von scripts/schrift.mjs.
 * NIEMALS eine CDN-Schrift verlinken: externe Requests sind verboten
 * (fremder Server, DSGVO, Ladezeit). Neue Schrift:
 *     npm run schrift -- --familie "<Name>"
 */\n\n`;

let bestehend = existsSync(CSS_DATEI) ? readFileSync(CSS_DATEI, 'utf-8') : '';
// Alte Regeln derselben Familie entfernen, damit nichts doppelt steht.
bestehend = bestehend
  .replace(new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*'${familie}'[^}]*\\}`, 'g'), '')
  .replace(/^\/\*[\s\S]*?\*\/\s*/, '')
  .trim();

const neu = KOPF + [bestehend, `/* ${familie} */`, regeln.join('\n\n')].filter(Boolean).join('\n\n') + '\n';
writeFileSync(CSS_DATEI, neu, 'utf-8');

console.log(`
✓ "${familie}" ist jetzt lokal eingebettet (${geladen} Datei(en), ${regeln.length} Schnitt(e)).
  Eingetragen in: src/styles/fonts.css

  Jetzt noch in content.config.ts -> design.schriften eintragen, z. B.:
      ueberschrift: "'${familie}', Georgia, serif",
`);
