/**
 * =============================================================================
 *  HOLEN – Dateien verlustfrei aus dem Netz in den Projektordner laden
 * =============================================================================
 *  WARUM NICHT EINFACH KOPIEREN? Binärdaten dürfen NIE als Base64 oder sonst
 *  als Text durch den Chat getragen werden: beim Abtippen gehen Bytes
 *  verloren, und die Datei sieht danach trotzdem gültig aus – im Piloten
 *  gingen so zwei Logos kaputt, und ein PDF wurde bei 256 KiB gekappt.
 *  Dieses Skript lädt direkt von der Quelle auf die Platte und prüft das
 *  Ergebnis sofort auf Vollständigkeit (scripts/lib/integritaet.mjs).
 *
 *  Zwei klassische Fallen werden abgefangen:
 *   1. Fehlerseiten-Falle: Server liefern bei kaputten Links gern eine
 *      HTML-Seite mit Status 200. Content-Type text/html => Rot, nichts
 *      gespeichert.
 *   2. Abschneide-Falle: abgebrochene Übertragung => Integritätsprüfung Rot.
 *      Die Datei bleibt dann zur Fehlersuche liegen, darf aber NICHT
 *      verwendet werden.
 *
 *      npm run holen -- --url https://beispiel.example/logo.png --ziel fotos/logo.png
 *      npm run holen -- --liste downloads.json
 *        (downloads.json: [{ "url": "https://…", "ziel": "fotos/x.jpg" }, …])
 *
 *  Rot = Exit 1.
 * =============================================================================
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute, extname } from 'node:path';
import { pruefeDatei } from './lib/integritaet.mjs';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : null;
}

// Manche Server (z. B. tile.openstreetmap.org) blocken anonyme Abrufe –
// deshalb ein ehrlicher, beschreibender User-Agent statt gar keinem.
const USER_AGENT = 'kanbuk-holen/1.0 (Build-Werkzeug; laedt Projektdateien einmalig lokal)';

/** Passt die Datei-Endung zum gemeldeten Content-Type? (nur Warnung, nicht rot) */
const TYP_ENDUNGEN = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/svg+xml': ['.svg'],
  'application/pdf': ['.pdf'],
};

// --- Aufträge einsammeln ------------------------------------------------------
const urlArg = arg('url');
const zielArg = arg('ziel');
const listeArg = arg('liste');

let auftraege = [];
if (listeArg) {
  const listePfad = isAbsolute(listeArg) ? listeArg : join(WURZEL, listeArg);
  if (!existsSync(listePfad)) {
    console.error(`✗ Liste nicht gefunden: ${listeArg}\n  Lösung: Pfad prüfen – erwartet wird eine JSON-Datei wie [{ "url": "https://…", "ziel": "fotos/x.jpg" }, …]`);
    process.exit(1);
  }
  try {
    auftraege = JSON.parse(readFileSync(listePfad, 'utf-8'));
  } catch (e) {
    console.error(`✗ ${listeArg} ist kein gültiges JSON (${e.message}).\n  Lösung: Datei reparieren – erwartet wird [{ "url": "https://…", "ziel": "fotos/x.jpg" }, …]`);
    process.exit(1);
  }
  if (!Array.isArray(auftraege) || auftraege.length === 0 || auftraege.some((a) => !a?.url || !a?.ziel)) {
    console.error(`✗ ${listeArg}: erwartet wird eine nicht-leere Liste von Objekten mit "url" und "ziel".\n  Beispiel: [{ "url": "https://beispiel.example/logo.png", "ziel": "fotos/logo.png" }]`);
    process.exit(1);
  }
} else if (urlArg && zielArg) {
  auftraege = [{ url: urlArg, ziel: zielArg }];
} else {
  console.error(
    'Verwendung:\n' +
      '  npm run holen -- --url <URL> --ziel fotos/name.jpg\n' +
      '  npm run holen -- --liste downloads.json\n' +
      '    (downloads.json: [{ "url": "https://…", "ziel": "fotos/x.jpg" }, …])',
  );
  process.exit(1);
}

// --- Laden + prüfen -------------------------------------------------------------
/** Lädt einen Auftrag. Liefert null (grün) oder die Fehlermeldung (rot). */
async function hole({ url, ziel }) {
  const zielPfad = isAbsolute(ziel) ? ziel : join(WURZEL, ziel);

  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(60_000), // hängende Server nicht ewig abwarten
    });
  } catch (e) {
    const detail = e?.cause?.code ?? e?.name ?? 'unbekannt';
    return `${url}\n      Abruf fehlgeschlagen (${detail}). Lösung: Internetverbindung prüfen und die URL im Browser testen.`;
  }

  if (!res.ok) {
    return `${url}\n      Server antwortet mit HTTP ${res.status}. Lösung: URL im Browser öffnen – vermutlich ist der Link veraltet oder braucht eine andere Adresse.`;
  }

  // Fehlerseiten-Falle: Status 200, aber der Server liefert eine HTML-Seite
  // (Login, "nicht gefunden", Weiterleitung). Die würde als .jpg/.pdf auf der
  // Platte landen und erst beim Besucher auffallen – deshalb hart Rot.
  const typ = (res.headers.get('content-type') ?? '').toLowerCase().split(';')[0].trim();
  if (typ === 'text/html') {
    return `${url}\n      Server liefert eine HTML-Seite statt einer Datei (Content-Type text/html) – fast immer eine Fehler- oder Loginseite. Nichts gespeichert.\n      Lösung: URL im Browser öffnen und den DIREKTEN Datei-Link kopieren (Rechtsklick aufs Bild -> Bildadresse kopieren).`;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(zielPfad), { recursive: true });
  writeFileSync(zielPfad, buf);

  const ergebnis = await pruefeDatei(zielPfad);
  if (!ergebnis.ok) {
    return `${ziel}\n      Datei gespeichert, aber UNVOLLSTÄNDIG/BESCHÄDIGT: ${ergebnis.grund}\n      Die Datei bleibt zur Fehlersuche liegen – NICHT verwenden. Erneut laden oder eine andere Quelle suchen.`;
  }

  const kib = (buf.length / 1024).toFixed(1);
  console.log(`  ✓ ${ziel}  (${kib} KiB, ${typ || 'ohne Content-Type'})`);

  // Nur ein Hinweis: falsche Endung macht die Datei nicht kaputt, verwirrt
  // aber später den MIME-Typ beim Ausliefern.
  const erwartet = TYP_ENDUNGEN[typ];
  if (erwartet && !erwartet.includes(extname(zielPfad).toLowerCase())) {
    console.log(`    ℹ Server meldet ${typ}, das Ziel endet auf "${extname(zielPfad)}" – Endung ggf. anpassen.`);
  }
  return null;
}

console.log(`Holen: ${auftraege.length} Datei(en)`);
const fehler = [];
for (const auftrag of auftraege) {
  const problem = await hole(auftrag);
  if (problem) {
    fehler.push(problem);
    console.log(`  ✗ ${problem.split('\n')[0]}`);
  }
}

console.log('');
if (fehler.length > 0) {
  console.error('✗ Holen NICHT vollständig gelungen:\n');
  for (const f of fehler) console.error(`  • ${f}\n`);
  process.exit(1);
}
console.log(`✓ Alle ${auftraege.length} Datei(en) geladen und auf Vollständigkeit geprüft.`);
