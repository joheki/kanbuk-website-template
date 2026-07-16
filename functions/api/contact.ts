/**
 * Cloudflare Pages Function – POST /api/contact
 * Aktiv, wenn das Projekt auf Cloudflare Pages deployt wird.
 * Umgebungsvariablen (im Cloudflare-Dashboard setzen): RESEND_API_KEY, CONTACT_FROM
 *
 * Austauschbar mit der Vercel-Variante (api/contact.ts) – beide nutzen dieselbe
 * Logik aus src/lib/kontakt.ts. Es ist immer nur eine Plattform aktiv.
 */
import { verarbeiteKontakt, type Eingabe, type KontaktEnv } from '../../src/lib/kontakt';

interface PagesContext {
  request: Request;
  env: KontaktEnv;
}

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  let daten: Eingabe = {};
  try {
    daten = (await context.request.json()) as Eingabe;
  } catch {
    daten = {};
  }

  const { status, json } = await verarbeiteKontakt(daten, context.env);

  return new Response(JSON.stringify(json), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
