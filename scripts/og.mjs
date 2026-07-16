/**
 * OG – erzeugt das Social-/WhatsApp-Vorschaubild (1200×630) aus einem echten Foto.
 *
 * Beim Port PFLICHT: public/og.jpg gehört zum Template-Muster und muss ersetzt
 * werden – sonst zeigt WhatsApp beim Verschicken der Demo das Musterbild.
 *
 *   npm run og                                   (nimmt fotos/hero.jpg)
 *   npm run og -- --bild fotos/aussen.jpg
 *   npm run og -- --bild fotos/hero.jpg --fokus mitte
 *
 * Alternative mit Name/Farben statt Foto: npm run platzhalter (erzeugt og.jpg mit Text).
 */
import sharp from 'sharp';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const wert = (name, standard) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : standard;
};

const bildArg = wert('bild', 'fotos/hero.jpg');
const zielArg = wert('ziel', 'public/og.jpg');
/** 'auto' = sharp sucht den interessantesten Ausschnitt; 'mitte' = zentriert. */
const fokus = wert('fokus', 'auto');
const qualitaet = Number(wert('qualitaet', '82'));

const bild = isAbsolute(bildArg) ? bildArg : join(root, bildArg);
const ziel = isAbsolute(zielArg) ? zielArg : join(root, zielArg);

if (!existsSync(bild)) {
  console.error(`✗ Bild nicht gefunden: ${bildArg}
  Erst das Foto nach fotos/ legen, dann:  npm run og -- --bild fotos/<name>.jpg`);
  process.exit(1);
}

await sharp(bild)
  .resize(1200, 630, { fit: 'cover', position: fokus === 'mitte' ? 'centre' : sharp.strategy.attention })
  .jpeg({ quality: qualitaet, mozjpeg: true })
  .toFile(ziel);

const kb = Math.round(statSync(ziel).size / 1024);
console.log(`✓ OG-Bild erzeugt: ${zielArg} (1200×630, ${kb} KB) aus ${bildArg}
  Vorschau testen: Link in WhatsApp einfügen (nach dem Deploy).`);
