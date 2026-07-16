/**
 * FORMULAR – Absenden ohne Seitenwechsel, mit Rückmeldung.
 *
 * Ein Baustein für alle Formulare: Kontakt, Reservierung, Terminanfrage,
 * Angebotsanfrage. Welche Felder es gibt, steht in content.config.ts.
 *
 * Markup erzeugt <Formular>-Komponente. Erwartet:
 *   <form data-formular action="/api/contact"
 *         data-text-sendet="…" data-text-erfolg="…"
 *         data-text-fehler="…" data-text-verbindungsfehler="…">
 *     … Felder …
 *     <button type="submit" data-formular-absenden>Senden</button>
 *     <p data-formular-status role="status" aria-live="polite"></p>
 *   </form>
 *
 * Ohne JS greift das native POST auf dieselbe Adresse – das Formular
 * funktioniert also auch dann.
 *
 * Zustandsklassen fürs Design: .ist-erfolg / .ist-fehler auf dem Status-Element.
 */
export function formulareStarten(): void {
  document.querySelectorAll<HTMLFormElement>('[data-formular]').forEach((form) => {
    const status = form.querySelector<HTMLElement>('[data-formular-status]');
    const absenden = form.querySelector<HTMLButtonElement>('[data-formular-absenden]');
    if (!status || !absenden) return;

    const t = form.dataset;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      status.classList.remove('ist-erfolg', 'ist-fehler');

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const alterText = absenden.textContent;
      absenden.disabled = true;
      absenden.textContent = t.textSendet ?? 'Wird gesendet …';

      try {
        const daten = Object.fromEntries(new FormData(form).entries());
        const antwort = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(daten),
        });

        if (antwort.ok) {
          form.reset();
          status.textContent = t.textErfolg ?? 'Danke! Ihre Nachricht wurde gesendet.';
          status.classList.add('ist-erfolg');
        } else {
          const info = await antwort.json().catch(() => ({}));
          status.textContent = info.fehler ?? t.textFehler ?? 'Das hat leider nicht geklappt.';
          status.classList.add('ist-fehler');
        }
      } catch {
        status.textContent = t.textVerbindungsfehler ?? 'Verbindung fehlgeschlagen.';
        status.classList.add('ist-fehler');
      } finally {
        absenden.disabled = false;
        absenden.textContent = alterText;
      }
    });
  });
}
