/**
 * Theme – übersetzt die Design-Tokens aus content.config.ts in CSS-Variablen.
 *
 * Das ist die NAHTSTELLE zwischen Claude Design und dem Motor: Das Design
 * liefert die Werte, der Motor stellt sie als --farbe-* / --font-* bereit.
 * Die Kunden-Komponenten benutzen ausschließlich diese Variablen – niemals
 * einen Farbwert direkt im Markup (das prüft `npm run check`).
 */
import type { SiteConfig } from '../../content.config';

/** #rrggbb -> Wählt Schwarz oder Weiß für lesbaren Kontrast auf dieser Farbe. */
export function kontrastText(hex: string): string {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) return '#ffffff';
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // relative Helligkeit (YIQ) – bewährt und ohne Abhängigkeiten
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#1a1a1a' : '#ffffff';
}

/** true, wenn der Hintergrund hell ist (dunkler Text passt). */
export function istHell(hex: string): boolean {
  return kontrastText(hex) === '#1a1a1a';
}

/** CSS-Variablennamen dürfen nur a-z, 0-9 und - enthalten. */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] ?? c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Baut den Inhalt des :root { … }-Blocks.
 * Erzeugt aus jeder Design-Farbe eine --farbe-<name> und aus jeder Schrift
 * eine --font-<name>, plus die Werte, auf die sich der Motor verlässt.
 */
export function cssVariablen(site: SiteConfig): string {
  const { farben, schriften, radius } = site.design;
  const zeilen: string[] = [];

  for (const [name, wert] of Object.entries(farben)) {
    zeilen.push(`--farbe-${slug(name)}: ${wert};`);
  }
  for (const [name, wert] of Object.entries(schriften)) {
    zeilen.push(`--font-${slug(name)}: ${wert};`);
  }

  // Abgeleitet: lesbarer Text auf der Akzentfarbe (z. B. Buttons).
  zeilen.push(`--farbe-auf-primaer: ${kontrastText(farben.primaer)};`);

  // Fokus-Ring: die Akzentfarbe, außer sie hebt sich vom Hintergrund zu wenig
  // ab – dann die Textfarbe. Barrierefreiheit geht dem Design vor.
  const fokus = istHell(farben.hintergrund) === istHell(farben.primaer) ? farben.text : farben.primaer;
  zeilen.push(`--farbe-fokus: ${fokus};`);

  if (radius) zeilen.push(`--radius: ${radius};`);

  return zeilen.join(' ');
}
