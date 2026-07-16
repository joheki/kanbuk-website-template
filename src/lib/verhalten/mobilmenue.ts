/**
 * MOBILMENÜ – Navigation am Handy auf-/zuklappen.
 *
 * Markup:
 *   <button data-menue-schalter aria-controls="hauptnavi">Menü</button>
 *   <nav id="hauptnavi" data-menue>… </nav>
 *
 * Vergibt: aria-expanded, .ist-offen (auf Schalter, Navigation und <html>).
 * `html.menue-offen` gibt dem Design die Möglichkeit, das Scrollen zu sperren.
 * Schließt bei Escape, bei Klick auf einen Link und beim Wechsel auf Desktop.
 */
export function mobilmenueStarten(): void {
  const schalter = document.querySelector<HTMLButtonElement>('[data-menue-schalter]');
  const navi = document.querySelector<HTMLElement>('[data-menue]');
  if (!schalter || !navi) return;

  schalter.setAttribute('type', 'button');
  schalter.setAttribute('aria-expanded', 'false');
  if (navi.id) schalter.setAttribute('aria-controls', navi.id);

  function setze(offen: boolean) {
    schalter!.setAttribute('aria-expanded', String(offen));
    schalter!.classList.toggle('ist-offen', offen);
    navi!.classList.toggle('ist-offen', offen);
    document.documentElement.classList.toggle('menue-offen', offen);
  }

  const offen = () => schalter.getAttribute('aria-expanded') === 'true';

  schalter.addEventListener('click', () => setze(!offen()));

  navi.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setze(false)));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && offen()) {
      setze(false);
      schalter.focus();
    }
  });

  // Beim Wechsel auf Desktop-Breite sicher zurücksetzen, damit kein
  // gesperrtes Scrollen zurückbleibt.
  window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
    if (e.matches) setze(false);
  });
}
