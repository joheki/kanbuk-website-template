/**
 * Lädt passende Stockfotos von Pexels als Platzhalter in fotos/.
 * NUR als Platzhalter für Demos gedacht – für die Live-Seite echte Kundenfotos verwenden!
 *
 * Voraussetzung: kostenloser API-Key von https://www.pexels.com/api/
 * in die Datei ".env" eintragen:  PEXELS_API_KEY=dein_key
 *
 * Verwendung:
 *   npm run stock -- --thema "wiener wirtshaus" --anzahl 4 --prefix galerie
 *   npm run stock -- --thema "restaurant interior" --datei hero.jpg --orientierung landscape
 *   npm run stock -- --thema "nail salon" --anzahl 3 --prefix galerie
 *
 * Bilder von Pexels sind kommerziell frei nutzbar, ohne Namensnennung
 * (Fotografen werden zur Info unten trotzdem ausgegeben).
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'fotos');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const force = process.argv.includes('--force');

// --- API-Key aus Umgebung oder .env lesen ---
function leseKey() {
  if (process.env.PEXELS_API_KEY) return process.env.PEXELS_API_KEY;
  try {
    const env = readFileSync(join(root, '.env'), 'utf-8');
    const m = env.match(/^\s*PEXELS_API_KEY\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {
    /* keine .env */
  }
  return null;
}

const key = leseKey();
if (!key) {
  console.error(
    'Kein PEXELS_API_KEY gefunden.\n' +
      '→ Gratis-Key holen: https://www.pexels.com/api/ (registrieren, Key kopieren)\n' +
      '→ In die Datei ".env" eintragen:  PEXELS_API_KEY=dein_key',
  );
  process.exit(1);
}

const thema = arg('thema', '');
if (!thema) {
  console.error('Bitte --thema angeben, z. B.:  npm run stock -- --thema "café interior"');
  process.exit(1);
}
const datei = arg('datei', '');
const anzahl = datei ? 1 : parseInt(arg('anzahl', '4'), 10);
const prefix = arg('prefix', 'galerie');
const start = parseInt(arg('start', '1'), 10);
const orientierung = arg('orientierung', 'landscape'); // landscape | portrait | square

mkdirSync(rawDir, { recursive: true });

const url =
  `https://api.pexels.com/v1/search?query=${encodeURIComponent(thema)}` +
  `&per_page=${Math.min(anzahl + 2, 20)}&orientation=${orientierung}`;

const res = await fetch(url, { headers: { Authorization: key } });
if (res.status === 401) {
  console.error('Pexels lehnt den Key ab (401). Bitte PEXELS_API_KEY in .env prüfen.');
  process.exit(1);
}
if (!res.ok) {
  console.error(`Pexels-Fehler: HTTP ${res.status}`);
  process.exit(1);
}
const data = await res.json();
const fotos = (data.photos ?? []).slice(0, anzahl);
if (fotos.length === 0) {
  console.error(`Keine Treffer für „${thema}". Versuch ein anderes/englisches Stichwort.`);
  process.exit(1);
}

async function lade(fotoUrl, ziel) {
  if (existsSync(ziel) && !force) {
    console.log(`  übersprungen (existiert): ${ziel.split(/[\\/]/).pop()}`);
    return;
  }
  const r = await fetch(fotoUrl);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(ziel, buf);
  console.log(`  geladen: ${ziel.split(/[\\/]/).pop()}`);
}

console.log(`Thema „${thema}" – ${fotos.length} Bild(er):`);
for (let i = 0; i < fotos.length; i++) {
  const f = fotos[i];
  const quelle = f.src?.large2x || f.src?.large || f.src?.original;
  const name = datei || `${prefix}-${start + i}.jpg`;
  await lade(quelle, join(rawDir, name));
  console.log(`    Foto: ${f.photographer} (Pexels)`);
}
console.log('Fertig. Denk dran: nur Platzhalter – für Live-Seiten echte Kundenfotos.');
