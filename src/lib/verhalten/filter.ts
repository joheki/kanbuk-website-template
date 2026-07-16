/**
 * FILTER – Elemente nach Kategorie ein-/ausblenden.
 *
 * Galerie-Filter (Gastro/Beauty), Referenzen nach Gewerk (Handwerk),
 * Kurse nach Art (Studio).
 *
 * Markup:
 *   <div data-filter>
 *     <button data-filter-wert="alle">Alle</button>
 *     <button data-filter-wert="interieur">Interieur</button>
 *     <div data-filter-ziel>
 *       <figure data-kategorie="interieur"> … </figure>
 *       <figure data-kategorie="drinks"> … </figure>
 *     </div>
 *   </div>
 *
 * "alle" zeigt alles. Mehrere Kategorien je Element: data-kategorie="a b".
 * Vergibt: aria-pressed, hidden, .ist-aktiv
 */
export function filterStarten(): void {
  document.querySelectorAll<HTMLElement>('[data-filter]').forEach((box) => {
    const knoepfe = Array.from(box.querySelectorAll<HTMLButtonElement>('[data-filter-wert]'));
    const ziel = box.querySelector<HTMLElement>('[data-filter-ziel]') ?? box;
    const elemente = Array.from(ziel.querySelectorAll<HTMLElement>('[data-kategorie]'));
    if (knoepfe.length === 0 || elemente.length === 0) return;

    function filtern(wert: string) {
      knoepfe.forEach((k) => {
        const aktiv = k.dataset.filterWert === wert;
        k.setAttribute('aria-pressed', String(aktiv));
        k.classList.toggle('ist-aktiv', aktiv);
      });
      let sichtbar = 0;
      elemente.forEach((el) => {
        const kategorien = (el.dataset.kategorie ?? '').split(/\s+/);
        const zeigen = wert === 'alle' || kategorien.includes(wert);
        el.hidden = !zeigen;
        if (zeigen) sichtbar++;
      });
      // Für Screenreader: Anzahl der Treffer melden, falls ein Live-Bereich da ist.
      const meldung = box.querySelector<HTMLElement>('[data-filter-anzahl]');
      if (meldung) meldung.textContent = String(sichtbar);
    }

    knoepfe.forEach((k) => {
      k.setAttribute('type', 'button');
      k.addEventListener('click', () => filtern(k.dataset.filterWert!));
    });

    filtern(box.dataset.filterStart ?? knoepfe[0].dataset.filterWert ?? 'alle');
  });
}
