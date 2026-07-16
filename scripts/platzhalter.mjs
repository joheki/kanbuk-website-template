/**
 * Erzeugt Platzhalter-Assets für eine Demo:
 *   - textlose, marken-/branchenfarbene Bilder (Hero, Galerie, Karte) in fotos/
 *   - ein OG-Vorschaubild (public/og.jpg) mit Name + Claim (für WhatsApp/Social)
 *   - ein Favicon (public/favicon.svg) aus Initial + Primärfarbe
 *
 * Verwendung:
 *   npm run platzhalter -- --name "Muster Betrieb" --claim "…"
 *   npm run platzhalter -- --name "…" --primaer '#2f4a5c' --sekundaer '#d98a2b' --hintergrund '#f4f6f7'
 *   npm run platzhalter -- --preset beauty --name "…"   (grobe Branchen-Farbwelt statt eigener Farben)
 *
 * Beim Kunden IMMER die Farben aus dem Claude Design übergeben (--primaer …),
 * damit Platzhalter und Seite zusammenpassen. Echte Kundenfotos ersetzen die
 * Dateien in fotos/ einfach (gleicher Name).
 */
import sharp from 'sharp';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// --- Argumente einlesen -----------------------------------------------------
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const preset = arg('preset', 'gastro');
const name = arg('name', 'Ihr Betrieb');
const claim = arg('claim', '');
const force = process.argv.includes('--force');

// --- Grobe Branchen-Farbwelten (nur Fallback, wenn keine --primaer/… übergeben) ---
const PALETTEN = {
  gastro: { primaer: '#7a5c3e', sekundaer: '#c98a3c', hintergrund: '#faf6f0' },
  beauty: { primaer: '#9d6b7b', sekundaer: '#c9a24b', hintergrund: '#faf6f7' },
  handwerk: { primaer: '#2f4a5c', sekundaer: '#d98a2b', hintergrund: '#f4f6f7' },
  dienstleistung: { primaer: '#24425e', sekundaer: '#2f9e8f', hintergrund: '#f6f8fa' },
  praxis: { primaer: '#2e6e63', sekundaer: '#7fb3a4', hintergrund: '#f5f9f8' },
  studio: { primaer: '#1f7a70', sekundaer: '#f2765c', hintergrund: '#f4faf8' },
  kfz: { primaer: '#23272b', sekundaer: '#e2321f', hintergrund: '#f3f4f5' },
};
const basis = PALETTEN[preset] ?? PALETTEN.gastro;
// Gewählte Palette kann explizit übergeben werden (passt die Bilder an die Seite an):
//   --primaer '#..' --sekundaer '#..' --hintergrund '#..'
const p = {
  primaer: arg('primaer', basis.primaer),
  sekundaer: arg('sekundaer', basis.sekundaer),
  hintergrund: arg('hintergrund', basis.hintergrund),
};

// --- Helfer -----------------------------------------------------------------
function darken(hex, faktor) {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * faktor);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * faktor);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * faktor);
  return `rgb(${r},${g},${b})`;
}
function esc(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c]));
}
const dunkel = darken(p.primaer, 0.4);

// Dezentes, textloses Muster (weiche Kreise/Diagonale) als Overlay.
function motif(w, h, farbe, opacity) {
  return `
    <g opacity="${opacity}" fill="${farbe}">
      <circle cx="${w * 0.82}" cy="${h * 0.24}" r="${h * 0.28}"/>
      <circle cx="${w * 0.14}" cy="${h * 0.86}" r="${h * 0.18}"/>
    </g>`;
}

function heroSvg(w, h) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${p.primaer}"/><stop offset="1" stop-color="${dunkel}"/>
      </linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      ${motif(w, h, p.sekundaer, 0.16)}
    </svg>`);
}
function galerieSvg(w, h, a, b) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
      </linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      ${motif(w, h, '#ffffff', 0.10)}
    </svg>`);
}
function karteSvg(w, h) {
  const linien = [];
  for (let x = 0; x <= w; x += Math.round(w / 9)) linien.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
  for (let y = 0; y <= h; y += Math.round(h / 7)) linien.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="${p.hintergrund}"/>
      <g stroke="${p.primaer}" stroke-opacity="0.14" stroke-width="2">${linien.join('')}</g>
      <g transform="translate(${w / 2}, ${h / 2})">
        <path d="M0,-46 C24,-46 40,-28 40,-6 C40,20 0,46 0,46 C0,46 -40,20 -40,-6 C-40,-28 -24,-46 0,-46 Z"
              fill="${p.sekundaer}"/>
        <circle cx="0" cy="-6" r="14" fill="${p.hintergrund}"/>
      </g>
    </svg>`);
}
function ogSvg(w, h) {
  const claimZeile = claim ? `<text x="80" y="${h / 2 + 60}" font-family="Georgia, serif" font-size="34" fill="#ffffff" fill-opacity="0.9">${esc(claim).slice(0, 70)}</text>` : '';
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${p.primaer}"/><stop offset="1" stop-color="${dunkel}"/>
      </linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      ${motif(w, h, p.sekundaer, 0.18)}
      <text x="80" y="${h / 2 - 6}" font-family="Georgia, serif" font-weight="700" font-size="72" fill="#ffffff">${esc(name).slice(0, 34)}</text>
      ${claimZeile}
    </svg>`);
}

// --- Pfade ------------------------------------------------------------------
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'fotos');
const publicDir = join(root, 'public');
mkdirSync(rawDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

async function jpg(svgBuf, ziel, q = 72) {
  if (existsSync(ziel) && !force) {
    console.log(`  übersprungen (existiert): ${ziel.split(/[\\/]/).pop()}`);
    return;
  }
  await sharp(svgBuf).jpeg({ quality: q }).toFile(ziel);
  console.log(`  erzeugt: ${ziel.split(/[\\/]/).pop()}`);
}

// --- Erzeugen ---------------------------------------------------------------
await jpg(heroSvg(1800, 1000), join(rawDir, 'hero.jpg'), 70);
await jpg(galerieSvg(900, 900, p.sekundaer, p.primaer), join(rawDir, 'galerie-1.jpg'));
await jpg(galerieSvg(900, 900, p.primaer, p.sekundaer), join(rawDir, 'galerie-2.jpg'));
await jpg(galerieSvg(900, 900, darken(p.primaer, 0.8), p.sekundaer), join(rawDir, 'galerie-3.jpg'));
await jpg(galerieSvg(900, 900, darken(p.primaer, 0.6), darken(p.sekundaer, 0.85)), join(rawDir, 'galerie-4.jpg'));
await jpg(karteSvg(1000, 750), join(rawDir, 'karte.jpg'), 78);

// OG-Bild immer neu (spiegelt Name/Farben der aktuellen Demo).
await sharp(ogSvg(1200, 630)).jpeg({ quality: 82 }).toFile(join(publicDir, 'og.jpg'));
console.log('  erzeugt: og.jpg');

// Favicon aus Initial + Primärfarbe.
const initial = esc((name.trim()[0] || 'K').toUpperCase());
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Favicon">
  <rect width="64" height="64" rx="14" fill="${p.primaer}" />
  <text x="50%" y="52%" dy="0.36em" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="700" fill="${p.hintergrund}">${initial}</text>
</svg>
`;
writeFileSync(join(publicDir, 'favicon.svg'), faviconSvg, 'utf-8');
console.log('  erzeugt: favicon.svg');

// apple-touch-icon (PNG 180x180) für den Handy-Homescreen.
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="36" fill="${p.primaer}"/>
  <text x="50%" y="52%" dy="0.36em" text-anchor="middle" font-family="Georgia, serif" font-size="96" font-weight="700" fill="${p.hintergrund}">${initial}</text>
</svg>`;
await sharp(Buffer.from(appleSvg)).png().toFile(join(publicDir, 'apple-touch-icon.png'));
console.log('  erzeugt: apple-touch-icon.png');

console.log(`Platzhalter fertig (Preset: ${preset}).`);
