/**
 * Theme – übersetzt die Design-Tokens aus content.config.ts in CSS-Variablen.
 *
 * Das ist die NAHTSTELLE zwischen Claude Design und dem Motor: Das Design
 * liefert die Werte, der Motor stellt sie als --farbe-* / --font-* bereit.
 * Die Kunden-Komponenten benutzen ausschließlich diese Variablen – niemals
 * einen Farbwert direkt im Markup (das prüft `npm run check`).
 */
import type { SiteConfig } from '../../content.config';

const TEXT_DUNKEL = '#1a1a1a';
const TEXT_HELL = '#ffffff';

/** #rrggbb / #rgb -> [r, g, b] als 0–255. Null bei ungültiger Eingabe. */
function kanaele(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Relative Leuchtdichte nach WCAG 2.x (mit sRGB-Linearisierung). */
export function leuchtdichte(hex: string): number {
  const rgb = kanaele(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((k) => {
    const s = k / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhältnis zweier Farben nach WCAG (1 = gleich, 21 = Schwarz/Weiß). */
export function kontrastVerhaeltnis(a: string, b: string): number {
  const la = leuchtdichte(a);
  const lb = leuchtdichte(b);
  const [hell, dunkel] = la >= lb ? [la, lb] : [lb, la];
  return (hell + 0.05) / (dunkel + 0.05);
}

/**
 * #rrggbb -> Schwarz oder Weiß, je nachdem was auf dieser Farbe BESSER lesbar ist.
 *
 * Bewusst der echte WCAG-Kontrast statt der früheren YIQ-Helligkeitsschwelle:
 * Die Schwelle (yiq >= 150) lag bei mittelhellen Marken-Tönen daneben und
 * wählte Weiß, obwohl Schwarz doppelt so gut lesbar ist. Beim Piloten traf es
 * das Orange #e07f2a – Weiß ergab 2,90:1 (durchgefallen), Schwarz 6,00:1.
 * Betroffen war u. a. der Sprunglink „Zum Inhalt". Die Rechnung hier ist exakt
 * dieselbe, die auch das Prüf-Tor anwendet – ein Wert, eine Wahrheit.
 */
export function kontrastText(hex: string): string {
  if (!kanaele(hex)) return TEXT_HELL;
  return kontrastVerhaeltnis(hex, TEXT_DUNKEL) >= kontrastVerhaeltnis(hex, TEXT_HELL)
    ? TEXT_DUNKEL
    : TEXT_HELL;
}

/** true, wenn der Hintergrund hell ist (dunkler Text passt). */
export function istHell(hex: string): boolean {
  return kontrastText(hex) === TEXT_DUNKEL;
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
