/**
 * AKKORDEON – auf-/zuklappbare Bereiche (FAQ, Preisgruppen, Leistungsdetails).
 *
 * Basiert bewusst auf nativem <details>/<summary>: funktioniert ohne JS,
 * ist von Haus aus barrierefrei und für Google im DOM (kein SEO-Nachteil).
 * Das JS fügt nur zwei Dinge hinzu, die nativ fehlen:
 *   1. Optionales „nur eines offen" (data-akkordeon-exklusiv)
 *   2. Sanftes Auf-/Zuklappen statt Springen
 *
 * Markup:
 *   <div data-akkordeon data-akkordeon-exklusiv>
 *     <details><summary>Frage</summary><div>Antwort</div></details>
 *     <details><summary>Frage</summary><div>Antwort</div></details>
 *   </div>
 */
import { bewegungReduziert } from './hilfen';

export function akkordeonStarten(): void {
  document.querySelectorAll<HTMLElement>('[data-akkordeon]').forEach((box) => {
    const eintraege = Array.from(box.querySelectorAll<HTMLDetailsElement>('details'));
    if (eintraege.length === 0) return;

    const exklusiv = box.hasAttribute('data-akkordeon-exklusiv');
    const reduziert = bewegungReduziert();

    eintraege.forEach((d) => {
      d.addEventListener('toggle', () => {
        d.classList.toggle('ist-offen', d.open);
        if (d.open && exklusiv) {
          eintraege.filter((a) => a !== d && a.open).forEach((a) => (a.open = false));
        }
      });

      if (reduziert) return;

      // Sanftes Ausklappen: Höhe animieren, ohne das native Verhalten zu ersetzen.
      const inhalt = d.querySelector<HTMLElement>('summary + *');
      if (!inhalt) return;
      d.addEventListener('toggle', () => {
        if (!d.open) return;
        const hoehe = inhalt.scrollHeight;
        inhalt.animate(
          [
            { height: '0px', opacity: 0 },
            { height: `${hoehe}px`, opacity: 1 },
          ],
          { duration: 220, easing: 'ease-out' },
        );
      });
    });
  });
}
