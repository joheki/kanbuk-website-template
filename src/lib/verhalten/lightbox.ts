/**
 * LIGHTBOX – Bild groß anzeigen.
 *
 * Nutzt das native <dialog>: Fokusfalle, Escape und Hintergrund-Sperre kommen
 * vom Browser. Der Dialog wird bei Bedarf einmal erzeugt.
 *
 * Markup:
 *   <div data-lightbox>
 *     <figure><img src="klein.webp" data-gross="gross.webp" alt="…"></figure>
 *   </div>
 *
 * Ohne data-gross wird die Bildquelle selbst verwendet. Ohne JS bleibt die
 * Galerie eine normale Bildergalerie – nichts geht verloren.
 */
export function lightboxStarten(): void {
  const boxen = document.querySelectorAll<HTMLElement>('[data-lightbox]');
  if (boxen.length === 0) return;

  let dialog: HTMLDialogElement | null = null;
  let bildEl: HTMLImageElement;

  function dialogBauen(): HTMLDialogElement {
    const d = document.createElement('dialog');
    d.className = 'lightbox';
    d.innerHTML = `
      <button class="lightbox__schliessen" type="button" aria-label="Schließen">×</button>
      <img class="lightbox__bild" alt="" />
    `;
    d.addEventListener('click', (e) => {
      // Klick auf den Hintergrund (nicht aufs Bild) schließt
      if (e.target === d || (e.target as HTMLElement).classList.contains('lightbox__schliessen')) {
        d.close();
      }
    });
    document.body.appendChild(d);
    bildEl = d.querySelector('.lightbox__bild')!;
    return d;
  }

  boxen.forEach((box) => {
    box.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      const knopf = img.closest('button') ?? img;
      knopf.setAttribute('role', 'button');
      knopf.setAttribute('tabindex', '0');
      knopf.setAttribute('aria-haspopup', 'dialog');

      function oeffne() {
        dialog ??= dialogBauen();
        bildEl.src = img.dataset.gross || img.currentSrc || img.src;
        bildEl.alt = img.alt;
        dialog.showModal();
      }

      knopf.addEventListener('click', oeffne);
      knopf.addEventListener('keydown', (e) => {
        const k = e as KeyboardEvent;
        if (k.key === 'Enter' || k.key === ' ') {
          e.preventDefault();
          oeffne();
        }
      });
    });
  });
}
