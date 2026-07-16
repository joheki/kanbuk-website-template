/**
 * VERGLEICH – Vorher/Nachher-Schieber über zwei Bildern.
 *
 * Beauty (Behandlung), Handwerk (Sanierung), KFZ (Aufbereitung), Physio.
 *
 * Markup:
 *   <div data-vergleich>
 *     <img data-vergleich-vorher  src="vorher.webp"  alt="Vorher">
 *     <img data-vergleich-nachher src="nachher.webp" alt="Nachher">
 *     <input data-vergleich-regler type="range" min="0" max="100" value="50"
 *            aria-label="Vorher-Nachher-Vergleich">
 *   </div>
 *
 * Setzt die CSS-Variable --vergleich-pos (0–100 %) auf dem Container.
 * Das Design entscheidet, wie daraus ein Schnitt wird (clip-path o. Ä.).
 * Der native <input type="range"> ist von Haus aus tastaturbedienbar.
 */
export function vergleichStarten(): void {
  document.querySelectorAll<HTMLElement>('[data-vergleich]').forEach((box) => {
    const regler = box.querySelector<HTMLInputElement>('[data-vergleich-regler]');
    if (!regler) return;

    function setze(wert: number) {
      box.style.setProperty('--vergleich-pos', `${wert}%`);
    }

    regler.addEventListener('input', () => setze(Number(regler.value)));
    setze(Number(regler.value || 50));

    // Ziehen/Wischen direkt über dem Bild – der Regler bleibt die Wahrheit.
    let zieht = false;
    const ausPosition = (x: number) => {
      const r = box.getBoundingClientRect();
      const wert = Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100));
      regler.value = String(Math.round(wert));
      setze(wert);
    };

    box.addEventListener('pointerdown', (e) => {
      // Klicks auf den Regler selbst nicht doppelt behandeln
      if (e.target === regler) return;
      zieht = true;
      box.setPointerCapture(e.pointerId);
      ausPosition(e.clientX);
    });
    box.addEventListener('pointermove', (e) => zieht && ausPosition(e.clientX));
    box.addEventListener('pointerup', (e) => {
      if (!zieht) return; // z. B. Klick direkt auf den Regler – nie gecapturet
      zieht = false;
      box.releasePointerCapture(e.pointerId);
    });
    box.addEventListener('pointercancel', () => (zieht = false));
  });
}
