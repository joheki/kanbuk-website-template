/**
 * Datei-Integritätsprüfung – geteilte Bibliothek der Prüf-Werkzeuge
 * (holen.mjs, vorcheck.mjs).
 *
 * WARUM ES DAS BRAUCHT: Eine kaputte Binärdatei sieht harmlos aus. Sie hat
 * einen plausiblen Namen, eine plausible Größe und meist sogar einen gültigen
 * Header – erst der Besucher sieht dann ein halbes Bild oder ein PDF, das
 * sich nicht öffnen lässt. Deshalb wird hier nicht der Header angeschaut,
 * sondern die STRUKTUR: die Endmarken (JPEG FF D9, PNG IEND, PDF %%EOF) und
 * bei Rasterbildern eine VOLLSTÄNDIGE Dekodierung mit sharp.
 *
 * WICHTIG: sharp(f).metadata() reicht ausdrücklich NICHT – das liest nur den
 * Header, und eine bei 60 % gekappte Datei hat einen völlig gesunden Header.
 * Nur .raw().toBuffer() zwingt sharp, jedes Pixel wirklich zu dekodieren.
 *
 *   import { pruefeDatei } from './lib/integritaet.mjs';
 *   const ergebnis = await pruefeDatei('fotos/hero.jpg');
 *   if (!ergebnis.ok) console.error(ergebnis.grund);
 *
 * Liefert { ok: true } oder { ok: false, grund: '…' } – der Grund ist
 * deutsch, konkret und nennt den Lösungsweg.
 */
import { existsSync, statSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import sharp from 'sharp';

/** Formate, die sharp vollständig dekodieren kann und soll. */
const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const PNG_IEND = Buffer.from('IEND', 'latin1');

const nichtOk = (grund) => ({ ok: false, grund });

/**
 * Prüft eine Datei auf Vollständigkeit und Lesbarkeit.
 * Unbekannte Endungen (z. B. .woff2, .md): nur Größe > 0.
 */
export async function pruefeDatei(pfad) {
  if (!existsSync(pfad)) {
    return nichtOk('Datei existiert nicht – Pfad prüfen (Tippfehler? Groß-/Kleinschreibung?)');
  }
  const stat = statSync(pfad);
  if (stat.isDirectory()) {
    return nichtOk('Pfad ist ein Ordner, keine Datei');
  }
  if (stat.size === 0) {
    return nichtOk('Datei ist leer (0 Bytes) – die Übertragung ist fehlgeschlagen. Datei löschen und neu laden (npm run holen)');
  }

  const endung = extname(pfad).toLowerCase();

  // --- Struktur-Prüfung: die Endmarke verrät eine abgeschnittene Datei -----
  if (endung === '.jpg' || endung === '.jpeg') {
    const buf = readFileSync(pfad);
    if (buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) {
      return nichtOk('JPEG ist abgeschnitten (Endmarke FF D9 fehlt) – nur ein Teil der Datei ist angekommen. Neu laden (npm run holen), nie Binärdaten per Chat kopieren');
    }
  } else if (endung === '.png') {
    const buf = readFileSync(pfad);
    if (!buf.includes(PNG_IEND)) {
      return nichtOk('PNG ist abgeschnitten (IEND-Block fehlt) – nur ein Teil der Datei ist angekommen. Neu laden (npm run holen)');
    }
  } else if (endung === '.pdf') {
    const buf = readFileSync(pfad);
    if (buf.subarray(0, 4).toString('latin1') !== '%PDF') {
      return nichtOk('keine PDF-Datei (beginnt nicht mit %PDF) – vermutlich eine HTML-Fehlerseite mit falscher Endung. Quelle prüfen und direkt laden (npm run holen)');
    }
    // %%EOF darf Anhängsel (Zeilenumbrüche, Signatur-Reste) haben – deshalb
    // die letzten 1024 Bytes durchsuchen statt strikt das Dateiende.
    const schwanz = buf.subarray(Math.max(0, buf.length - 1024)).toString('latin1');
    if (!schwanz.includes('%%EOF')) {
      return nichtOk('PDF ist abgeschnitten (%%EOF am Ende fehlt) – genau so wurde im Piloten ein PDF bei 256 KiB gekappt. Neu laden (npm run holen)');
    }
    return { ok: true };
  } else if (endung === '.svg') {
    let text;
    try {
      text = readFileSync(pfad, 'utf-8');
    } catch {
      return nichtOk('SVG lässt sich nicht als Text lesen – Datei ist beschädigt. Neu erzeugen oder neu laden');
    }
    if (!text.includes('<svg')) {
      return nichtOk('kein <svg>-Element in der Datei – das ist kein SVG (vermutlich eine HTML-Fehlerseite). Quelle prüfen und direkt laden (npm run holen)');
    }
    return { ok: true };
  }

  // --- Voll-Dekodierung: der einzige Beweis, dass JEDES Pixel da ist -------
  // failOn 'warning' ist Absicht: libvips meldet eine gekappte Datei manchmal
  // nur als Warnung und liefert graue Restfläche – das wäre genau der stille
  // Fehler, den diese Prüfung verhindern soll.
  if (RASTER.has(endung)) {
    try {
      await sharp(pfad, { failOn: 'warning' }).raw().toBuffer();
    } catch (e) {
      const kurz = String(e?.message ?? e).split('\n')[0];
      return nichtOk(`Bild lässt sich nicht vollständig dekodieren (${kurz}) – Datei ist beschädigt oder abgeschnitten. Neu laden (npm run holen), nie Binärdaten per Chat kopieren`);
    }
  }

  // Unbekannte Endung: mehr als Größe > 0 können wir nicht seriös prüfen.
  return { ok: true };
}
