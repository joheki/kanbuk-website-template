/**
 * SLIDER – horizontal durchlaufende Inhalte (Galerie, Stimmen, Projekte).
 *
 * Nutzt natives Scroll-Snapping; das JS steuert nur Pfeile, Punkte und den
 * Auto-Durchlauf. Ohne JS bleibt es ein scrollbarer Streifen – nichts kaputt.
 *
 * Markup:
 *   <div data-slider data-slider-auto="4500">
 *     <div data-slider-spur>
 *       <figure> … </figure>
 *       <figure> … </figure>
 *     </div>
 *     <button data-slider-zurueck>‹</button>
 *     <button data-slider-vor>›</button>
 *     <div data-slider-punkte></div>   <!-- Punkte werden erzeugt -->
 *   </div>
 *
 * data-slider-auto="<ms>" schaltet den Auto-Durchlauf ein (weglassen = aus).
 * Auto-Durchlauf pausiert bei Hover, Fokus und im Hintergrund-Tab und läuft
 * nie bei „Bewegung reduzieren".
 */
import { bewegungReduziert } from './hilfen';

export function sliderStarten(): void {
  document.querySelectorAll<HTMLElement>('[data-slider]').forEach((slider) => {
    const spur = slider.querySelector<HTMLElement>('[data-slider-spur]');
    if (!spur) return;
    const folien = Array.from(spur.children) as HTMLElement[];
    if (folien.length <= 1) return;

    const reduziert = bewegungReduziert();
    let index = 0;

    // Punkte erzeugen (nur wenn ein Behälter vorhanden ist)
    const punkteBox = slider.querySelector<HTMLElement>('[data-slider-punkte]');
    const punkte: HTMLButtonElement[] = [];
    if (punkteBox) {
      punkteBox.setAttribute('role', 'tablist');
      folien.forEach((_, i) => {
        const p = document.createElement('button');
        p.type = 'button';
        p.className = 'slider-punkt';
        p.setAttribute('role', 'tab');
        p.setAttribute('aria-label', `Bild ${i + 1} von ${folien.length}`);
        p.addEventListener('click', () => gehe(i, true));
        punkteBox.appendChild(p);
        punkte.push(p);
      });
    }

    function markiere(i: number) {
      index = i;
      punkte.forEach((p, j) => {
        p.classList.toggle('ist-aktiv', j === i);
        p.setAttribute('aria-selected', String(j === i));
      });
    }

    function gehe(i: number, anhalten = false) {
      const n = (i + folien.length) % folien.length;
      spur!.scrollTo({
        left: folien[n].offsetLeft - spur!.offsetLeft,
        behavior: reduziert ? 'auto' : 'smooth',
      });
      markiere(n);
      if (anhalten) stopp();
    }

    slider.querySelector('[data-slider-zurueck]')?.addEventListener('click', () => gehe(index - 1, true));
    slider.querySelector('[data-slider-vor]')?.addEventListener('click', () => gehe(index + 1, true));

    // Beim manuellen Scrollen den aktiven Punkt mitführen
    let t: number | undefined;
    spur.addEventListener('scroll', () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const naechste = folien.reduce(
          (best, f, i) => {
            const d = Math.abs(f.offsetLeft - spur.offsetLeft - spur.scrollLeft);
            return d < best.d ? { d, i } : best;
          },
          { d: Infinity, i: 0 },
        );
        markiere(naechste.i);
      }, 90);
    });

    // Auto-Durchlauf
    const takt = Number(slider.dataset.sliderAuto ?? 0);
    let timer: number | undefined;
    function start() {
      if (!takt || reduziert) return;
      stopp();
      timer = window.setInterval(() => gehe(index + 1), takt);
    }
    function stopp() {
      if (timer) window.clearInterval(timer);
      timer = undefined;
    }
    if (takt && !reduziert) {
      slider.addEventListener('mouseenter', stopp);
      slider.addEventListener('mouseleave', start);
      slider.addEventListener('focusin', stopp);
      slider.addEventListener('focusout', start);
      document.addEventListener('visibilitychange', () => (document.hidden ? stopp() : start()));
      start();
    }

    markiere(0);
  });
}
