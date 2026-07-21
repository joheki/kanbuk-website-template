/**
 * TABS – Kategorien umschalten.
 *
 * Speisekarten-Kategorien (Gastro), Wochentage (Studio), Leistungsbereiche
 * (Handwerk), Behandlungsarten (Beauty). Immer dieselbe Mechanik.
 *
 * Markup:
 *   <div data-tabs>
 *     <div role="tablist">
 *       <button data-tab="fruehstueck">Frühstück</button>
 *       <button data-tab="speisen">Speisen</button>
 *     </div>
 *     <div data-tabpanel="fruehstueck"> … </div>
 *     <div data-tabpanel="speisen"> … </div>
 *   </div>
 *
 * Optional: data-tabs-start="speisen" wählt den Start-Tab.
 * Optional: data-tabs-url  spiegelt den aktiven Tab in die URL (#speisen),
 *           damit ein Link direkt auf eine Kategorie zeigen kann.
 *
 * Vergibt: aria-selected, aria-controls, hidden, .ist-aktiv
 * Tastatur: Pfeiltasten, Pos1/Ende (ARIA-Standard)
 */
export function tabsStarten(): void {
  document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((box) => {
    const knoepfe = Array.from(box.querySelectorAll<HTMLButtonElement>('[data-tab]'));
    const panels = Array.from(box.querySelectorAll<HTMLElement>('[data-tabpanel]'));
    if (knoepfe.length === 0 || panels.length === 0) return;

    const liste = box.querySelector('[role="tablist"]');
    liste?.setAttribute('role', 'tablist');

    // ARIA-Verdrahtung
    knoepfe.forEach((k) => {
      const id = k.dataset.tab!;
      k.setAttribute('role', 'tab');
      k.setAttribute('type', 'button');
      k.id ||= `tab-${id}`;
      const panel = panels.find((p) => p.dataset.tabpanel === id);
      if (panel) {
        panel.setAttribute('role', 'tabpanel');
        panel.id ||= `panel-${id}`;
        panel.setAttribute('aria-labelledby', k.id);
        k.setAttribute('aria-controls', panel.id);
      }
    });

    function zeige(id: string, fokus = false, durchKlick = false) {
      knoepfe.forEach((k) => {
        const aktiv = k.dataset.tab === id;
        k.setAttribute('aria-selected', String(aktiv));
        k.tabIndex = aktiv ? 0 : -1;
        k.classList.toggle('ist-aktiv', aktiv);
        if (aktiv && fokus) k.focus();
      });
      panels.forEach((p) => {
        const aktiv = p.dataset.tabpanel === id;
        p.hidden = !aktiv;
        p.classList.toggle('ist-aktiv', aktiv);
      });
      /* Adresszeile NUR nach einer echten Bedienung anfassen (durchKlick).
         Vorher schrieb schon der Startaufruf den Anker hinein: Wer die
         Speisekarte bloß öffnete, sah plötzlich „…/speisekarte#fruehstueck",
         ohne etwas angeklickt zu haben – die Adresse gehört dem Besucher, nicht
         der Mechanik. Gelesen wird der Anker weiterhin (Deep-Links bleiben). */
      if (durchKlick && box.hasAttribute('data-tabs-url')) {
        history.replaceState(null, '', `#${id}`);
      }

      /* data-tabs-anker: nach dem Umschalten zurück an den Anfang der Tabs.
         WARUM: Panels sind unterschiedlich hoch (eine Speisekarten-Kategorie hat
         24 Positionen, die nächste 3). Schaltet man weiter unten um, wird die
         Seite plötzlich kürzer – der Browser rückt den Blick nach und man landet
         unvermittelt mitten im neuen Panel. Das fühlt sich an, als springe die
         Seite. Nur nötig, wenn die Tab-Leiste schon nach oben gescrollt ist
         (Rect.top < 0) – steht sie noch sichtbar da, bleibt alles, wo es ist.
         Den Abstand zu einer klebenden Kopfleiste regelt das Design per
         `scroll-margin-top`; die Mechanik hier kennt keine Höhen.

         WICHTIG: behavior 'instant', nicht das CSS-Standardverhalten. Der Motor
         setzt global `scroll-behavior: smooth` – damit würde der Rücksprung als
         sichtbarer Gleitflug über die halbe Seite abgespielt, und genau das
         wirkt wie „die Seite springt beim ersten Klick" (Nutzer-Befund im
         Piloten; beim zweiten Klick steht man schon oben, darum trat es nur
         einmal auf). Ein sofortiger Wechsel liest sich dagegen als neue
         Ansicht, wie bei einem Seitenwechsel. */
      if (durchKlick && box.hasAttribute('data-tabs-anker') && box.getBoundingClientRect().top < 0) {
        box.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
      }
    }

    knoepfe.forEach((k) => {
      k.addEventListener('click', () => zeige(k.dataset.tab!, false, true));
      k.addEventListener('keydown', (e) => {
        const i = knoepfe.indexOf(k);
        let ziel = -1;
        if (e.key === 'ArrowRight') ziel = (i + 1) % knoepfe.length;
        else if (e.key === 'ArrowLeft') ziel = (i - 1 + knoepfe.length) % knoepfe.length;
        else if (e.key === 'Home') ziel = 0;
        else if (e.key === 'End') ziel = knoepfe.length - 1;
        if (ziel >= 0) {
          e.preventDefault();
          zeige(knoepfe[ziel].dataset.tab!, true, true);
        }
      });
    });

    // Startwert: URL-Anker > data-tabs-start > erster Tab
    const ausUrl = location.hash.slice(1);
    const start =
      (ausUrl && knoepfe.some((k) => k.dataset.tab === ausUrl) && ausUrl) ||
      box.dataset.tabsStart ||
      knoepfe[0].dataset.tab!;
    zeige(start);
  });
}
