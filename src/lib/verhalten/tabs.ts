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

    function zeige(id: string, fokus = false) {
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
      if (box.hasAttribute('data-tabs-url')) {
        history.replaceState(null, '', `#${id}`);
      }
    }

    knoepfe.forEach((k) => {
      k.addEventListener('click', () => zeige(k.dataset.tab!));
      k.addEventListener('keydown', (e) => {
        const i = knoepfe.indexOf(k);
        let ziel = -1;
        if (e.key === 'ArrowRight') ziel = (i + 1) % knoepfe.length;
        else if (e.key === 'ArrowLeft') ziel = (i - 1 + knoepfe.length) % knoepfe.length;
        else if (e.key === 'Home') ziel = 0;
        else if (e.key === 'End') ziel = knoepfe.length - 1;
        if (ziel >= 0) {
          e.preventDefault();
          zeige(knoepfe[ziel].dataset.tab!, true);
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
