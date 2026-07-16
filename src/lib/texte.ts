/**
 * Bedientexte des MOTORS in du- und Sie-Form.
 *
 * Wichtig: Hier stehen NUR Texte, die der Motor zur Laufzeit selbst erzeugt –
 * Formular-Rückmeldungen, Fehler, der Einwilligungshinweis. Überschriften und
 * alle sichtbaren Inhalte kommen aus dem Design bzw. aus content.config.ts.
 *
 * Umschaltung über content.config.ts -> ansprache.
 */
import type { Ansprache } from '../../content.config';

export interface MotorTexte {
  /** Rechtlicher Hinweis unter dem Formular (vor dem Datenschutz-Link). */
  einwilligung: string;
  sendet: string;
  erfolg: string;
  fehler: string;
  verbindungsfehler: string;
  pflichtfelder: string;
  /** Hinweis im Demo-Modus, solange das Formular nicht scharf ist. */
  formularDemo: string;
}

const SIE: MotorTexte = {
  einwilligung:
    'Mit dem Absenden stimmen Sie der Verarbeitung Ihrer Angaben zur Bearbeitung der Anfrage zu. Details in der ',
  sendet: 'Wird gesendet …',
  erfolg: 'Vielen Dank! Ihre Nachricht wurde gesendet.',
  fehler: 'Das hat leider nicht geklappt. Bitte versuchen Sie es per E-Mail.',
  verbindungsfehler: 'Verbindung fehlgeschlagen. Bitte versuchen Sie es per E-Mail.',
  pflichtfelder: 'Bitte füllen Sie die Pflichtfelder aus.',
  formularDemo: 'In der Live-Version aktiv.',
};

const DU: MotorTexte = {
  einwilligung:
    'Mit dem Absenden stimmst du der Verarbeitung deiner Angaben zur Bearbeitung der Anfrage zu. Details in der ',
  sendet: 'Wird gesendet …',
  erfolg: 'Danke! Deine Nachricht wurde gesendet.',
  fehler: 'Das hat leider nicht geklappt. Bitte versuch es per E-Mail.',
  verbindungsfehler: 'Verbindung fehlgeschlagen. Bitte versuch es per E-Mail.',
  pflichtfelder: 'Bitte füll die Pflichtfelder aus.',
  formularDemo: 'In der Live-Version aktiv.',
};

/** Liefert die Motor-Texte in der gewählten Ansprache. */
export function motorTexte(ansprache: Ansprache): MotorTexte {
  return ansprache === 'du' ? DU : SIE;
}
