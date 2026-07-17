/**
 * CHECK-LAUF – die komplette Prüf-Kette hinter `npm run check`:
 *
 *   1. vorcheck.mjs   – Sekunden-Prüfung OHNE Build (Pflichtfelder, Dateien
 *                       existieren, Binär-Integrität) – fängt ab, was sonst
 *                       erst nach 2 Minuten Build auffiele
 *   2. astro build    – NUR wenn sich seit dem letzten Lauf etwas geändert hat
 *   3. check.mjs      – das Prüf-Tor über die gebaute Seite
 *
 *       npm run check              (übliche Kette)
 *       npm run check -- --live    (zusätzlich Live-Pflichten)
 *       npm run check -- --force   (Build erzwingen, Marke ignorieren)
 *
 * ZUR BAU-ERSPARNIS (mit Vorsicht gebaut): Im Piloten waren 2–3 von ~8
 * Check-Läufen redundant – nichts hatte sich geändert, gebaut wurde trotzdem.
 * Die Marke ist ein Hash über die SORTIERTE Liste aller Quell-Dateien samt
 * Größe und Änderungszeit. Weil die LISTE Teil des Hashes ist, fallen auch
 * GELÖSCHTE Dateien auf (nur mtime-Vergleiche würden sie übersehen). Die Marke
 * liegt IN dist/ – wer dist/ löscht, löscht die Marke mit, und dann wird
 * gebaut. Grundsatz: Im Zweifel bauen.
 */
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const WURZEL = process.cwd();
const MARKE = join(WURZEL, 'dist', '.kanbuk-marke.json');
const args = process.argv.slice(2);
const force = args.includes('--force');
const live = args.includes('--live');

// --- Was zählt als Quelle? Alles, was das Bau-Ergebnis beeinflusst. ---------
const QUELLEN = ['content.config.ts', 'astro.config.ts', 'package.json', 'tsconfig.json', 'src', 'fotos', 'public', 'daten'];

function sammle(pfad, zeilen) {
  if (!existsSync(pfad)) return;
  const st = statSync(pfad);
  if (st.isDirectory()) {
    for (const e of readdirSync(pfad)) sammle(join(pfad, e), zeilen);
  } else {
    zeilen.push(`${relative(WURZEL, pfad).replace(/\\/g, '/')}|${st.size}|${st.mtimeMs}`);
  }
}

function quellMarke() {
  const zeilen = [];
  for (const q of QUELLEN) sammle(join(WURZEL, q), zeilen);
  zeilen.sort();
  return createHash('sha1').update(zeilen.join('\n')).digest('hex');
}

/** node direkt starten – NIE über die Shell: der Node-Pfad enthält unter
    Windows ein Leerzeichen ("C:\Program Files\…") und cmd zerlegt ihn daran. */
function nodeLauf(argv) {
  const r = spawnSync(process.execPath, argv, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
/** npx braucht unter Windows die Shell (npx.cmd). Als EIN Befehls-String, nicht
    als Argument-Liste – Liste + shell:true warnt Node zu Recht (keine Escapes);
    die Argumente hier sind feste Literale, kein Nutzer-Input. */
function npxLauf(argv) {
  const r = spawnSync(['npx', ...argv].join(' '), { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// --- 1. Vorprüfung (Sekunden, ohne Build) ------------------------------------
if (existsSync(join(WURZEL, 'scripts', 'vorcheck.mjs'))) {
  nodeLauf([join('scripts', 'vorcheck.mjs')]);
}

// --- 2. Bauen – nur wenn nötig ------------------------------------------------
const marke = quellMarke();
const alteMarke = existsSync(MARKE) ? JSON.parse(readFileSync(MARKE, 'utf-8')).marke : null;

if (force || marke !== alteMarke || !existsSync(join(WURZEL, 'dist', 'index.html'))) {
  npxLauf(['astro', 'build']);
  writeFileSync(MARKE, JSON.stringify({ marke: quellMarke() }) + '\n', 'utf-8');
} else {
  console.log('↷ Quellen unverändert – Build übersprungen (npm run check -- --force erzwingt ihn).');
}

// --- 3. Das Prüf-Tor ----------------------------------------------------------
nodeLauf([join('scripts', 'check.mjs'), ...(live ? ['--live'] : [])]);
