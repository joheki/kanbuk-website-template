/**
 * Formular-Verarbeitung – von BEIDEN Serverless-Varianten genutzt
 * (Vercel: /api/contact.ts, Cloudflare Pages: /functions/api/contact.ts).
 *
 * Generisch: verarbeitet JEDES in content.config.ts definierte Formular
 * (Kontakt, Reservierung, Terminanfrage, Angebot …). Welche Felder es gibt und
 * welche Pflicht sind, steht in der Config – nicht hier.
 *
 * Versendet über die Resend-REST-API (kein zusätzliches npm-Paket nötig).
 */
import { site } from '../../content.config';

export interface KontaktEnv {
  RESEND_API_KEY?: string;
  CONTACT_FROM?: string;
}

export interface KontaktErgebnis {
  status: number;
  json: Record<string, unknown>;
}

export type Eingabe = Record<string, string | undefined>;

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Schützt vor Header-Injection und begrenzt die Länge. */
function saeubern(wert: string, maxLaenge = 5000): string {
  return wert.replace(/[\r\n]+/g, ' ').trim().slice(0, maxLaenge);
}

export async function verarbeiteKontakt(rohdaten: Eingabe, env: KontaktEnv): Promise<KontaktErgebnis> {
  // 0) Eingaben normalisieren: Der Body kommt vom Client und kann ALLES enthalten
  //    (Zahlen, Objekte, Arrays). Alles Nicht-String wird verworfen – sonst
  //    crasht .trim() mit einem 500 statt einer sauberen Fehlermeldung.
  const daten: Record<string, string> = {};
  for (const [k, v] of Object.entries(rohdaten ?? {})) {
    if (typeof v === 'string') daten[k] = v;
  }

  // 1) Honeypot: Bots füllen dieses Feld. Wir melden Erfolg, senden aber nichts.
  if (daten.webseite && daten.webseite.trim() !== '') {
    return { status: 200, json: { ok: true } };
  }

  // 1b) Zeitfalle: Menschen brauchen zum Ausfüllen länger als 3 Sekunden.
  //     Fehlt das Feld (kein JS) oder ist die Uhr des Geräts verstellt
  //     (negative Dauer), lassen wir durch – der Honeypot greift weiterhin.
  const geladen = Number(daten._t ?? '');
  if (Number.isFinite(geladen) && geladen > 0) {
    const dauer = Date.now() - geladen;
    if (dauer >= 0 && dauer < 3000) {
      return { status: 200, json: { ok: true } };
    }
  }

  // 2) Welches Formular? Ohne Angabe das erste (üblicherweise 'kontakt').
  const id = (daten.formular ?? '').trim();
  const formular = id ? site.formulare.find((f) => f.id === id) : site.formulare[0];
  if (!formular) {
    return { status: 400, json: { fehler: 'Unbekanntes Formular.' } };
  }

  // 3) Pflichtfelder laut Config prüfen
  const fehlend = formular.felder
    .filter((f) => f.pflicht && !(daten[f.name] ?? '').trim())
    .map((f) => f.label);
  if (fehlend.length > 0) {
    return { status: 400, json: { fehler: `Bitte ausfüllen: ${fehlend.join(', ')}.` } };
  }

  // 4) E-Mail-Felder auf Format prüfen
  const emailFeld = formular.felder.find((f) => f.typ === 'email');
  const antwortAdresse = emailFeld ? (daten[emailFeld.name] ?? '').trim() : '';
  if (emailFeld && antwortAdresse && !emailRegex.test(antwortAdresse)) {
    return { status: 400, json: { fehler: 'Bitte geben Sie eine gültige E-Mail-Adresse an.' } };
  }

  // 5) Serverkonfiguration prüfen
  if (!env.RESEND_API_KEY || !env.CONTACT_FROM) {
    return {
      status: 500,
      json: { fehler: 'Der E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY / CONTACT_FROM).' },
    };
  }

  // 6) Nachricht aus den konfigurierten Feldern bauen – in der Reihenfolge der Config.
  const zeilen = [`${formular.betreff} – ${site.betrieb.name}`, ''];
  for (const f of formular.felder) {
    const wert = (daten[f.name] ?? '').trim();
    zeilen.push(`${f.label}: ${wert ? saeubern(wert) : '–'}`);
  }

  try {
    const antwort = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [site.betrieb.email],
        ...(antwortAdresse && { reply_to: antwortAdresse }),
        subject: `${formular.betreff} – ${site.betrieb.name}`,
        text: zeilen.join('\n'),
      }),
    });

    if (!antwort.ok) {
      return { status: 502, json: { fehler: 'Die Nachricht konnte gerade nicht gesendet werden.' } };
    }
    return { status: 200, json: { ok: true } };
  } catch {
    return { status: 502, json: { fehler: 'Die Nachricht konnte gerade nicht gesendet werden.' } };
  }
}
