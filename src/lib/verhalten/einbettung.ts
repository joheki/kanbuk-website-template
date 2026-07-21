/**
 * =============================================================================
 *  EINBETTUNG – die 2-Klick-Lösung für Maps, Instagram, YouTube
 * =============================================================================
 *  Das Problem: Ein <iframe> zu Google Maps oder Instagram lädt SOFORT beim
 *  Seitenaufruf – setzt Cookies, überträgt die IP an einen fremden Konzern.
 *  Ohne vorherige Einwilligung ist das nicht zulässig.
 *
 *  Die Lösung: Der Rahmen wird NICHT ins HTML geschrieben. Stattdessen liegt
 *  dort ein Platzhalter (z. B. das statische Kartenbild). Erst wenn der Besucher
 *  bewusst klickt, entsteht der <iframe>. Vorher geht kein einziges Byte raus.
 *
 *  Damit kann ein Kunde eine echte Google-Karte haben, OHNE dass die Seite
 *  einen Cookie-Banner braucht – der Klick IST die Einwilligung für den Fall.
 *
 *  ABER: Die beste Lösung bleibt das statische Kartenbild mit Link
 *  (npm run karte). Kein Rahmen, kein Klick, keine Diskussion. Die
 *  2-Klick-Einbettung ist für Kunden, die unbedingt eine bediente Karte wollen.
 *
 *  Das AUSSEHEN kommt aus dem Design. Hier steht nur die Mechanik.
 * =============================================================================
 */
import { erlaubt, type Kategorie } from './einwilligung';

export function einbettungStarten(): void {
  document.querySelectorAll<HTMLElement>('[data-einbettung]').forEach((box) => {
    const url = box.dataset.einbettung;
    if (!url) return;

    const titel = box.dataset.einbettungTitel ?? 'Externer Inhalt';
    const kategorie = (box.dataset.einbettungKategorie as Kategorie) ?? 'funktional';
    const seitenverhaeltnis = box.dataset.einbettungFormat ?? '16 / 9';

    function laden() {
      const rahmen = document.createElement('iframe');
      rahmen.src = url!;
      rahmen.title = titel;
      rahmen.loading = 'lazy';
      // Rechte so eng wie möglich halten.
      rahmen.referrerPolicy = 'no-referrer';
      rahmen.setAttribute('allow', 'fullscreen');
      rahmen.style.cssText = `width:100%; aspect-ratio:${seitenverhaeltnis}; border:0; display:block;`;
      box.replaceChildren(rahmen);
      box.classList.add('ist-geladen');

      /* Alles, was nur zum PLATZHALTER gehört, verschwindet mit ihm.
         Typischer Fall: unter dem statischen Kartenbild steht die Pflicht-
         Lizenzzeile „Kartendaten © OpenStreetMap-Mitwirkende". Sobald der
         Besucher die echte Google-Karte lädt, ist das Bild weg – die Zeile
         blieb aber stehen und behauptete etwas Falsches über den nun
         sichtbaren Inhalt. Elemente dafür mit
         data-einbettung-nur-platzhalter auszeichnen. */
      const umfeld = box.closest('section') ?? box.parentElement ?? document.body;
      umfeld.querySelectorAll<HTMLElement>('[data-einbettung-nur-platzhalter]').forEach((el) => {
        el.hidden = true;
      });
    }

    // Wurde die Kategorie schon freigegeben, darf direkt geladen werden.
    if (erlaubt(kategorie) && box.hasAttribute('data-einbettung-auto')) {
      laden();
      return;
    }

    const knopf = box.querySelector<HTMLElement>('[data-einbettung-laden]') ?? box;
    knopf.setAttribute('role', 'button');
    knopf.setAttribute('tabindex', '0');

    function ausloesen(e: Event) {
      e.preventDefault();
      laden();
    }
    knopf.addEventListener('click', ausloesen);
    knopf.addEventListener('keydown', (e) => {
      const k = e as KeyboardEvent;
      if (k.key === 'Enter' || k.key === ' ') ausloesen(e);
    });
  });
}
