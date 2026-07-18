/**
 * =============================================================================
 *  KARTE – statisches Kartenbild statt Live-Embed
 * =============================================================================
 *  Claude Design baut gern einen Google-Maps-Rahmen ein (<iframe … output=embed>).
 *  Der SETZT COOKIES – damit bräuchte die Seite ein Cookie-Banner und eine
 *  erweiterte Datenschutzerklärung. Genau das wollen wir nicht.
 *
 *  Lösung: ein statisches Kartenbild, das beim Klick zu Google Maps verlinkt.
 *  Kein fremder Server beim Laden, kein Cookie, kein Banner.
 *
 *      npm run karte -- --adresse "Musterstraße 1, 1010 Wien"
 *      npm run karte -- --adresse "…" --primaer "#c0392b" --zoom 16
 *      npm run karte -- --adresse "…" --stil dunkel   (dunkle Websites!)
 *
 *  Stile: hell (OSM klassisch) · dunkel · dezent (beide CARTO, aufgeräumt,
 *  ohne Symbol-Wirrwarr, doppelte Auflösung).
 *
 *  Die Karte wird aus OpenStreetMap-Kacheln zusammengesetzt (bewusst KEIN
 *  fertiger Static-Map-Dienst: solche Dienste verschwinden – der Kachel-Server
 *  ist die Grundinfrastruktur). Das Bild wird EINMAL beim Bauen geladen und
 *  liegt danach lokal; zur Laufzeit geht kein Request nach draußen.
 *
 *  Lizenz: Kartendaten © OpenStreetMap-Mitwirkende (ODbL). Dieser Hinweis
 *  MUSS sichtbar neben der Karte stehen.
 * =============================================================================
 */
import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const WURZEL = process.cwd();
const RAW = join(WURZEL, 'fotos');
const UA = 'kanbuk-website-template/1.0 (statische Kartenbilder; Kontakt via Repo)';
const KACHEL = 256;

const args = process.argv.slice(2);
const wert = (name, standard) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : standard;
};

const adresse = wert('adresse');
const zoom = Math.min(19, Math.max(1, Number(wert('zoom', '16'))));
const breite = Number(wert('breite', '1200'));
const hoehe = Number(wert('hoehe', '800'));
const primaer = wert('primaer', '#c0392b');
const hintergrund = wert('hintergrund', '#f4f4f5');
const datei = wert('datei', 'karte.jpg');

/* Karten-Stil. „hell" = klassisches OSM (detailreich, viele Symbole).
   „dunkel"/„dezent" = aufgeräumte CARTO-Basiskarten (keine POI-Symbole,
   ruhige Flächen) – passen zu gestalteten Websites deutlich besser und
   gibt es in doppelter Auflösung (Retina). Attribution s. unten. */
const stil = wert('stil', 'hell');
const STILE = {
  hell: {
    kachel: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    faktor: 1,
    lizenz: 'Kartendaten © OpenStreetMap-Mitwirkende',
  },
  dunkel: {
    kachel: (z, x, y) => `https://basemaps.cartocdn.com/dark_all/${z}/${x}/${y}@2x.png`,
    faktor: 2,
    lizenz: 'Kartendaten © OpenStreetMap-Mitwirkende, © CARTO',
  },
  dezent: {
    kachel: (z, x, y) => `https://basemaps.cartocdn.com/light_all/${z}/${x}/${y}@2x.png`,
    faktor: 2,
    lizenz: 'Kartendaten © OpenStreetMap-Mitwirkende, © CARTO',
  },
};
if (!STILE[stil]) {
  console.error(`✗ Unbekannter Stil "${stil}" – erlaubt: ${Object.keys(STILE).join(', ')}`);
  process.exit(1);
}
const { kachel: kachelUrl, faktor, lizenz } = STILE[stil];

if (!adresse) {
  console.error(`
Bitte eine Adresse angeben:

  npm run karte -- --adresse "Musterstraße 1, 1010 Wien"

Optionen:
  --adresse      Vollständige Adresse (Pflicht)
  --zoom         Standard: 16 (14 = Übersicht, 18 = Detail)
  --primaer      Farbe der Markierung, z. B. "#c0392b"
  --breite/--hoehe   Standard: 1200×800
  --datei        Standard: karte.jpg
`);
  process.exit(1);
}

mkdirSync(RAW, { recursive: true });
const ziel = join(RAW, datei);

// --- Slippy-Map-Mathematik ---------------------------------------------
/** Weltkoordinate in Pixeln bei diesem Zoom. */
function weltPixel(lat, lon, z) {
  const n = KACHEL * 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

async function hole(url, versuche = 3) {
  for (let i = 1; i <= versuche; i++) {
    try {
      const antwort = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
      return Buffer.from(await antwort.arrayBuffer());
    } catch (e) {
      if (i === versuche) throw e;
      await new Promise((r) => setTimeout(r, 400 * i));
    }
  }
}

/** Adresse -> Koordinaten (Nominatim; laut Nutzungsregeln mit User-Agent). */
async function koordinaten(adr) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(adr)}`;
  const antwort = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!antwort.ok) throw new Error(`Nominatim antwortet ${antwort.status}`);
  const treffer = await antwort.json();
  if (!treffer.length) throw new Error('Adresse nicht gefunden');
  return { lat: Number(treffer[0].lat), lon: Number(treffer[0].lon), name: treffer[0].display_name };
}

/** Markierung: echte Standort-Nadel (Tropfenform) in der Markenfarbe,
    weiß umrandet, mit weichem Schattenpunkt – Spitze exakt am Ort. */
function nadelSvg(f = 1) {
  const b = breite * f;
  const h = hoehe * f;
  const cx = b / 2;
  const cy = h / 2;
  const s = 1.35 * f; // Nadelgröße
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${b}" height="${h}">
    <ellipse cx="${cx}" cy="${cy + 3 * s}" rx="${13 * s}" ry="${5 * s}" fill="#000" fill-opacity="0.28"/>
    <g transform="translate(${cx},${cy}) scale(${s})">
      <path d="M0 0 C -14 -22, -20 -28, -20 -40 A 20 20 0 1 1 20 -40 C 20 -28, 14 -22, 0 0 Z"
            fill="${primaer}" stroke="#ffffff" stroke-width="3.4"/>
      <circle cx="0" cy="-40" r="7.5" fill="#ffffff"/>
    </g>
  </svg>`);
}

/** Notfall-Platzhalter, damit der Bau nie blockiert. */
async function platzhalter() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${breite}" height="${hoehe}">
    <rect width="${breite}" height="${hoehe}" fill="${hintergrund}"/>
    <g stroke="${primaer}" stroke-opacity="0.16" stroke-width="2" fill="none">
      ${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${(i + 1) * (hoehe / 10)}" x2="${breite}" y2="${(i + 1) * (hoehe / 10)}"/>`).join('')}
      ${Array.from({ length: 13 }, (_, i) => `<line x1="${(i + 1) * (breite / 14)}" y1="0" x2="${(i + 1) * (breite / 14)}" y2="${hoehe}"/>`).join('')}
    </g>
  </svg>`;
  await sharp(Buffer.from(svg)).composite([{ input: nadelSvg() }]).jpeg({ quality: 82, mozjpeg: true }).toFile(ziel);
}

// --- Los ----------------------------------------------------------------
console.log(`→ Suche "${adresse}" …`);

let ort;
try {
  ort = await koordinaten(adresse);
  console.log(`  gefunden: ${ort.name}`);
} catch (e) {
  console.warn(`⚠ Adresse nicht auflösbar (${e.message}) – erzeuge Platzhalter-Karte.`);
  await platzhalter();
  console.log(`✓ ${datei} erzeugt (Platzhalter). Vor dem Live-Gang gegen eine echte Karte tauschen.`);
  process.exit(0);
}

const mitte = weltPixel(ort.lat, ort.lon, zoom);
const linksOben = { x: mitte.x - breite / 2, y: mitte.y - hoehe / 2 };
const vonX = Math.floor(linksOben.x / KACHEL);
const bisX = Math.floor((linksOben.x + breite - 1) / KACHEL);
const vonY = Math.floor(linksOben.y / KACHEL);
const bisY = Math.floor((linksOben.y + hoehe - 1) / KACHEL);
const anzahl = (bisX - vonX + 1) * (bisY - vonY + 1);

console.log(`→ Lade ${anzahl} Kacheln (Zoom ${zoom}) …`);

try {
  const teile = [];
  const maxKachel = 2 ** zoom;
  for (let ty = vonY; ty <= bisY; ty++) {
    for (let tx = vonX; tx <= bisX; tx++) {
      // Am Datumsgrenzen-Rand umlaufen; außerhalb Nord/Süd gibt es nichts.
      const kx = ((tx % maxKachel) + maxKachel) % maxKachel;
      if (ty < 0 || ty >= maxKachel) continue;
      const daten = await hole(kachelUrl(zoom, kx, ty));
      teile.push({
        input: daten,
        left: Math.round((tx * KACHEL - linksOben.x) * faktor),
        top: Math.round((ty * KACHEL - linksOben.y) * faktor),
      });
      // Höflich gegenüber dem freien Kachel-Server bleiben.
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  // Bei Retina-Stilen (faktor 2) entsteht das Bild in doppelter Auflösung –
  // Astro <Image> rechnet fürs Layout herunter, Bildschirme mit hoher
  // Pixeldichte bekommen die volle Schärfe.
  await sharp({
    create: { width: breite * faktor, height: hoehe * faktor, channels: 3, background: hintergrund },
  })
    .composite([...teile, { input: nadelSvg(faktor), blend: 'over' }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(ziel);

  const kb = Math.round(statSync(ziel).size / 1024);
  console.log(`
✓ ${datei} erzeugt (${breite * faktor}×${hoehe * faktor}, Stil „${stil}", ${kb} KB)
  Liegt in: fotos/${datei}

  Einbinden – als BILD mit Link, NIEMALS als fester <iframe>:
      <a href={site.betrieb.adresse.googleMapsUrl} target="_blank" rel="noopener noreferrer">
        <Image src={karte} alt="Karte: ${adresse}" />
      </a>

  Will der Kunde eine BEDIENTE Google-Karte: das Bild als Vorschau in die
  2-Klick-Einbettung legen –
      <Einbettung url="https://www.google.com/maps?q=…&output=embed" …>
        <Image src={karte} alt="…" />
      </Einbettung>

  PFLICHT: „${lizenz}" sichtbar neben die Karte setzen (ODbL-Lizenz).
`);
} catch (e) {
  console.warn(`⚠ Kacheln nicht ladbar (${e.message}) – erzeuge Platzhalter.`);
  await platzhalter();
  console.log(`✓ ${datei} erzeugt (Platzhalter). Vor dem Live-Gang gegen eine echte Karte tauschen.`);
}
