import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { site } from './content.config';

const istLive = site.mode === 'live';

/**
 * Erzeugt nach dem Build automatisch die Auslieferungs-Regeln für Vercel
 * (vercel.json): Sicherheits-Kopfzeilen, Sperr-Header je nach `mode`,
 * Schriften-Caching und die Weiterleitungen der Vorgänger-Website.
 *
 * NUR VERCEL, mit Absicht: Früher entstanden hier zusätzlich `_headers` und
 * `_redirects` für Cloudflare Pages / Netlify. Kanbuk hostet ausschließlich
 * auf Vercel – die zweite Schiene wurde nie ausgeliefert, musste aber
 * mitgepflegt werden und ging dabei still kaputt (in `_redirects` sind
 * Query-Strings wie `/index.php?id=670` gar nicht zulässig, die alten
 * TYPO3-Adressen hätten dort nie gegriffen). Doppelte Wege heißen doppelte
 * Fehlerquellen. Wer später doch auf einen anderen Host wechselt, holt sich
 * die Erzeugung aus der Versionsgeschichte zurück.
 *
 * WARUM AUTOMATISCH: Früher stand der X-Robots-Tag fest in einer committeten
 * vercel.json und musste beim Live-Gang von Hand entfernt werden. Vergisst man
 * das, bleibt die Seite für Google gesperrt – und niemand merkt es, weil die
 * Seite ja funktioniert. Genau solche stillen Fallen darf ein Motor nicht haben.
 * Jetzt folgt alles dem `mode`.
 */
/**
 * Zerlegt eine alte Adresse in Pfad + Query-Bedingungen.
 *
 * Die Vorgänger-Website war ein TYPO3 mit Adressen wie `/index.php?id=670`.
 * Vercel vergleicht `source` NUR mit dem Pfad – ein Fragezeichen darin würde
 * nie zutreffen, und die alten Google-Treffer liefen still ins Leere. Der
 * Query-Teil muss deshalb als `has`-Bedingung mitgegeben werden.
 */
function zerlegeWeiterleitung(von: string) {
  const [pfad, suchteil] = von.split('?');
  const has = suchteil
    ? [...new URLSearchParams(suchteil)].map(([key, value]) => ({ type: 'query' as const, key, value }))
    : [];
  return { pfad, has };
}

function auslieferungsRegeln() {
  const sicherheit = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'geolocation=(), camera=(), microphone=(), interest-cohort=()',
    },
  ];
  const kopfzeilen = istLive
    ? [
        // HSTS nur live: zwingt Browser dauerhaft auf HTTPS (Vorschau-Domains
        // sollen keine so langlebige Zusage machen).
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ...sicherheit,
      ]
    : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, ...sicherheit];

  return {
    name: 'kanbuk-auslieferung',
    hooks: {
      'astro:build:done': ({ dir }: { dir: URL }) => {
        const outDir = fileURLToPath(dir);

        /**
         * Schriften unveränderlich cachen. Ohne diese Regel liefert der Host
         * public/-Dateien mit `max-age=0, must-revalidate` aus – der Browser
         * fragt die Schrift dann bei JEDEM Seitenwechsel neu beim Server nach,
         * und während dieser Rückfrage zeigt font-display:swap die Ersatz-
         * schrift: der Text „hüpft" bei den ersten Seitenwechseln (auf der
         * Pilot-Seite live gemessen). Die Dateinamen aus `npm run schrift`
         * tragen einen Hash – eine neue Schrift bekommt einen neuen Namen,
         * darum ist ein Jahr + immutable sicher.
         */
        const schriftCache = { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' };

        // --- vercel.json (im Projekt-Ordner – dort liest Vercel sie) ---
        //
        // ACHTUNG: Vercel prüft diese Datei gegen ein Schema und lehnt JEDES
        // unbekannte Feld ab ("should NOT have additional property"). Ein
        // Hinweis-Feld wie `_kommentar_de` lässt den Deploy also komplett
        // scheitern – deshalb steht der Hinweis hier im Quelltext und NICHT
        // in der erzeugten Datei. Nur `$schema` ist als Zusatz erlaubt.
        //
        // Die Datei ist AUTOMATISCH ERZEUGT – nicht von Hand ändern. Ihr Inhalt
        // folgt dem Feld `mode` in content.config.ts: bei "demo" mit
        // X-Robots-Tag (nicht indexierbar), bei "live" ohne. Einfach `mode`
        // umstellen und neu bauen.
        const vercel = {
          $schema: 'https://openapi.vercel.sh/vercel.json',
          /**
           * Formular-Endpunkt in Frankfurt rechnen lassen, nicht dort, wo
           * Vercel gerade Platz hat (Standard war Washington/iad1).
           *
           * WARUM: Über /api/contact laufen Name, Telefonnummer und Nachricht
           * echter Gäste – personenbezogene Daten. Die gehören nicht ohne Not
           * über einen US-Server. Der Rest der Seite ist statisch und kommt
           * ohnehin aus dem CDN-Knoten beim Besucher; das hier betrifft nur die
           * Funktion. Nebeneffekt: näher am Gast = schnelleres Absenden.
           *
           * fra1 = Frankfurt, der nächste EU-Standort zu Österreich.
           */
          regions: ['fra1'],
          headers: [
            { source: '/(.*)', headers: kopfzeilen },
            { source: '/fonts/(.*)', headers: [schriftCache] },
          ],
          ...(site.weiterleitungen.length > 0 && {
            redirects: site.weiterleitungen.map((w) => {
              const { pfad, has } = zerlegeWeiterleitung(w.von);
              return {
                source: pfad,
                ...(has.length > 0 && { has }),
                destination: w.nach,
                permanent: (w.status ?? 301) === 301,
              };
            }),
          }),
        };
        writeFileSync('vercel.json', JSON.stringify(vercel, null, 2) + '\n', 'utf-8');
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: site.domain,
  // Rein statischer Build – kein SSR-Adapter, kein CMS, keine Datenbank.
  output: 'static',
  // Sitemap nur im live-Modus (im demo-Modus wird ohnehin nicht indexiert).
  integrations: [...(istLive ? [sitemap()] : []), auslieferungsRegeln()],
  /**
   * Vorschau-Server fest auf IPv4-localhost.
   *
   * WARUM: Ohne Angabe bindet der Server an den Namen "localhost". Node löst den
   * seit Version 17 zuerst nach ::1 (IPv6) auf – der Server lauscht dann NUR auf
   * IPv6. Ein Browser, der http://localhost:4321 über IPv4 aufruft (oder auf dem
   * IPv6 abgeschaltet ist), bekommt „Verbindung abgelehnt", obwohl der Server
   * läuft. Genau das ist unter Windows passiert.
   *
   * 127.0.0.1 ist zusätzlich enger als 0.0.0.0: Die Vorschau bleibt auf dem
   * eigenen Rechner und hängt nicht im ganzen WLAN.
   */
  server: {
    host: '127.0.0.1',
  },
  image: {
    // astro:assets nutzt sharp für responsive Bildgrößen.
    responsiveStyles: true,
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
