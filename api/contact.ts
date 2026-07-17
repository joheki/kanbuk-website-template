/**
 * Vercel Serverless Function – POST /api/contact
 * Aktiv, wenn das Projekt auf Vercel deployt wird.
 * Umgebungsvariablen (im Vercel-Dashboard setzen): RESEND_API_KEY, CONTACT_FROM
 */
// Die .js-Endung ist Pflicht: Vercel baut Server-Dateien als Node-ESM –
// ohne Endung stürzt die Funktion beim Start ab (FUNCTION_INVOCATION_FAILED).
import { verarbeiteKontakt, type Eingabe } from '../src/lib/kontakt.js';

export const config = { runtime: 'nodejs' };

export async function POST(request: Request): Promise<Response> {
  let daten: Eingabe = {};
  try {
    daten = (await request.json()) as Eingabe;
  } catch {
    daten = {};
  }

  const { status, json } = await verarbeiteKontakt(daten, {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CONTACT_FROM: process.env.CONTACT_FROM,
  });

  return new Response(JSON.stringify(json), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
