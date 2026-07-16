/**
 * =============================================================================
 *  EINWILLIGUNG – die Schleuse für Tracking, Pixel und Einbettungen
 * =============================================================================
 *  WICHTIG: Standardmäßig ist NICHTS davon aktiv. Ohne konfigurierte Dienste
 *  rendert der Motor keinen Banner, lädt nichts nach und setzt nichts – die
 *  Seite bleibt cookiefrei (das ist ein Verkaufsargument, kein Zufall).
 *
 *  Sobald ein Dienst in content.config.ts -> dienste eingetragen ist, gilt:
 *
 *  OPT-IN, NICHT OPT-OUT. Vor der Zustimmung wird KEIN fremdes Skript geladen,
 *  kein Cookie gesetzt, kein Request nach draußen gemacht. Weiterscrollen oder
 *  Wegklicken ist KEINE Zustimmung (DSGVO, EuGH „Planet49").
 *
 *  So funktioniert die Schleuse:
 *    <script type="text/plain" data-einwilligung="marketing" src="…"></script>
 *  Ein <script type="text/plain"> führt der Browser NICHT aus. Erst nach dem
 *  Ja tauscht dieses Modul es gegen ein echtes <script> – vorher passiert nichts.
 *
 *  Die Wahl liegt in localStorage (kein Cookie – nichts wird mitgesendet).
 *
 *  Das AUSSEHEN des Banners kommt aus dem Design. Hier steht nur die Mechanik.
 * =============================================================================
 */

export type Kategorie = 'notwendig' | 'funktional' | 'statistik' | 'marketing';

const SCHLUESSEL = 'kanbuk-einwilligung';
/** Version hochzählen, wenn sich die Dienste ändern -> erneut fragen (Pflicht). */
const VERSION = 1;

interface Zustand {
  version: number;
  zeitpunkt: string;
  erlaubt: Kategorie[];
}

function lesen(): Zustand | null {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return null;
    const z = JSON.parse(roh) as Zustand;
    if (z.version !== VERSION) return null; // Dienste haben sich geändert -> neu fragen
    return z;
  } catch {
    return null;
  }
}

function schreiben(erlaubt: Kategorie[]) {
  try {
    localStorage.setItem(
      SCHLUESSEL,
      JSON.stringify({ version: VERSION, zeitpunkt: new Date().toISOString(), erlaubt } satisfies Zustand),
    );
  } catch {
    /* Privater Modus o. Ä. – dann gilt die Wahl nur für diese Sitzung. */
  }
}

/** Ist diese Kategorie erlaubt? "notwendig" immer. */
export function erlaubt(kategorie: Kategorie): boolean {
  if (kategorie === 'notwendig') return true;
  return lesen()?.erlaubt.includes(kategorie) ?? false;
}

/** Wartet auf die Freigabe einer Kategorie (auch nachträglich). */
export function beiFreigabe(kategorie: Kategorie, tuwas: () => void): void {
  if (erlaubt(kategorie)) {
    tuwas();
    return;
  }
  document.addEventListener('einwilligung:geaendert', () => {
    if (erlaubt(kategorie)) tuwas();
  });
}

/**
 * Gibt die geparkten <script type="text/plain" data-einwilligung="…"> frei.
 * Erst hier entsteht ein echtes <script> – vorher war es toter Text.
 */
function skripteFreigeben() {
  document.querySelectorAll<HTMLScriptElement>('script[type="text/plain"][data-einwilligung]').forEach((alt) => {
    const kategorie = alt.dataset.einwilligung as Kategorie;
    if (!erlaubt(kategorie)) return;

    const neu = document.createElement('script');
    for (const attr of Array.from(alt.attributes)) {
      if (attr.name === 'type' || attr.name === 'data-einwilligung') continue;
      neu.setAttribute(attr.name, attr.value);
    }
    if (!alt.src) neu.textContent = alt.textContent;
    alt.replaceWith(neu);
  });
}

/** Wahl speichern, Schleuse öffnen, Banner schließen, Rest informieren. */
function setzen(erlaubteKategorien: Kategorie[]) {
  schreiben(erlaubteKategorien);
  skripteFreigeben();
  document.querySelectorAll('[data-einwilligung-banner]').forEach((b) => ((b as HTMLElement).hidden = true));
  document.dispatchEvent(new CustomEvent('einwilligung:geaendert', { detail: { erlaubt: erlaubteKategorien } }));
}

/**
 * Widerruf – rechtlich Pflicht: Die Zustimmung muss so einfach zurückziehbar
 * sein, wie sie erteilt wurde. Der Datenschutz-Link ruft das auf.
 * Nach dem Widerruf wird neu geladen, damit bereits geladene Skripte weg sind.
 */
export function widerrufen(): void {
  try {
    localStorage.removeItem(SCHLUESSEL);
  } catch {
    /* egal */
  }
  location.reload();
}

/**
 * Startet die Einwilligungs-Verwaltung.
 *
 * Markup (Aussehen kommt aus dem Design):
 *   <div data-einwilligung-banner hidden>
 *     <button data-einwilligung-alle>Alle akzeptieren</button>
 *     <button data-einwilligung-nur-notwendig>Nur notwendige</button>
 *     <button data-einwilligung-auswahl>Auswahl speichern</button>   (optional)
 *     <input type="checkbox" data-einwilligung-kategorie="statistik"> (optional)
 *   </div>
 *   <button data-einwilligung-widerruf>Einwilligung widerrufen</button>
 */
export function einwilligungStarten(): void {
  // Widerruf-Knöpfe funktionieren immer (auch ohne Banner auf der Seite).
  document.querySelectorAll<HTMLElement>('[data-einwilligung-widerruf]').forEach((k) => {
    k.addEventListener('click', (e) => {
      e.preventDefault();
      widerrufen();
    });
  });

  const banner = document.querySelector<HTMLElement>('[data-einwilligung-banner]');
  if (!banner) {
    // Kein Banner = keine Dienste konfiguriert = nichts zu tun.
    return;
  }

  const zustand = lesen();
  if (zustand) {
    // Schon entschieden: Banner bleibt weg, erlaubte Skripte starten.
    banner.hidden = true;
    skripteFreigeben();
    return;
  }

  banner.hidden = false;

  /** Welche Kategorien nutzt diese Seite überhaupt? */
  const vorhanden = [
    ...new Set(
      Array.from(document.querySelectorAll<HTMLElement>('[data-einwilligung]')).map(
        (el) => el.dataset.einwilligung as Kategorie,
      ),
    ),
  ];

  banner.querySelector('[data-einwilligung-alle]')?.addEventListener('click', () => {
    setzen(['notwendig', ...vorhanden]);
  });

  banner.querySelector('[data-einwilligung-nur-notwendig]')?.addEventListener('click', () => {
    setzen(['notwendig']);
  });

  banner.querySelector('[data-einwilligung-auswahl]')?.addEventListener('click', () => {
    const gewaehlt: Kategorie[] = ['notwendig'];
    banner
      .querySelectorAll<HTMLInputElement>('[data-einwilligung-kategorie]:checked')
      .forEach((c) => gewaehlt.push(c.dataset.einwilligungKategorie as Kategorie));
    setzen(gewaehlt);
  });
}
