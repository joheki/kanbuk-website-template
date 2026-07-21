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
/**
 * Bildausschnitt. Standard ist bewusst 'mitte' (vorhersagbar).
 *
 * 'auto' (sharp.strategy.attention) sucht die "interessanteste" Region – das
 * ist eine Kanten-/Sättigungs-Heuristik und geht bei Innenaufnahmen regelmäßig
 * daneben: Im Piloten landete der Ausschnitt zu rund der Hälfte auf Fußmatte
 * und Boden, weil deren Muster kontrastreicher war als die eigentliche Szene.
 * Ein Vorschaubild, das beim Verschicken den Boden zeigt, kostet echte Leads –
 * deshalb ist die berechenbare Mitte der Standard und 'auto' nur noch Option.
 */
const fokus = wert('fokus', 'mitte');
const ERLAUBTE_FOKUS = { mitte: 'centre', oben: 'top', unten: 'bottom', auto: null };
if (!(fokus in ERLAUBTE_FOKUS)) {
  console.error(`✗ Unbekannter --fokus "${fokus}" – erlaubt: ${Object.keys(ERLAUBTE_FOKUS).join(', ')}`);
  process.exit(1);
}
const qualitaet = Number(wert('qualitaet', '82'));

const bild = isAbsolute(bildArg) ? bildArg : join(root, bildArg);
const ziel = isAbsolute(zielArg) ? zielArg : join(root, zielArg);

if (!existsSync(bild)) {
  console.error(`✗ Bild nicht gefunden: ${bildArg}
  Erst das Foto nach fotos/ legen, dann:  npm run og -- --bild fotos/<name>.jpg`);
  process.exit(1);
}

// Zu kleine Vorlagen wurden früher STILL hochskaliert – das Ergebnis sieht in
// WhatsApp matschig aus, ohne dass es jemandem auffällt. Jetzt laut melden.
const quelle = await sharp(bild).metadata();
const warnungen = [];
if (quelle.width < 1200 || quelle.height < 630) {
  warnungen.push(
    `Vorlage ist zu klein (${quelle.width}×${quelle.height}, gebraucht mind. 1200×630).\n` +
      `    Das Bild wird hochgerechnet und wirkt in der Vorschau unscharf – besser ein größeres Foto nehmen.`,
  );
}

await sharp(bild)
  .resize(1200, 630, {
    fit: 'cover',
    position: ERLAUBTE_FOKUS[fokus] ?? sharp.strategy.attention,
  })
  .jpeg({ quality: qualitaet, mozjpeg: true })
  .toFile(ziel);

const kb = Math.round(statSync(ziel).size / 1024);
console.log(`✓ OG-Bild erzeugt: ${zielArg} (1200×630, ${kb} KB) aus ${bildArg}, Ausschnitt „${fokus}"`);
for (const w of warnungen) console.log(`⚠ ${w}`);
console.log(`
  PFLICHT: ${zielArg} JETZT ANSEHEN. Ein 1200×630-Ausschnitt schneidet aus jedem
  Foto etwas weg – zeigt er Boden, Fußmatte oder eine leere Wand statt der Szene,
  einen anderen Ausschnitt wählen:
      npm run og -- --bild ${bildArg} --fokus oben     (Motiv im oberen Bildteil)
      npm run og -- --bild ${bildArg} --fokus unten
      npm run og -- --bild ${bildArg} --fokus auto     (Automatik – kann danebenliegen)
  Das ist das Bild, das in WhatsApp erscheint, wenn der Link verschickt wird.`);
