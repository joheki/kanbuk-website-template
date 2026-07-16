import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { site } from './content.config';

const istLive = site.mode === 'live';

/**
 * Erzeugt nach dem Build automatisch:
 *   - _headers    (Cloudflare Pages / Netlify)
 *   - _redirects  (Cloudflare Pages / Netlify)
 *   - vercel.json (Vercel)
 *
 * WARUM AUTOMATISCH: Früher stand der X-Robots-Tag fest in einer committeten
 * vercel.json und musste beim Live-Gang von Hand entfernt werden. Vergisst man
 * das, bleibt die Seite für Google gesperrt – und niemand merkt es, weil die
 * Seite ja funktioniert. Genau solche stillen Fallen darf ein Motor nicht haben.
 * Jetzt folgt alles dem `mode`.
 */
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

        // --- _headers (Cloudflare Pages / Netlify) ---
        const headerZeilen = ['/*', ...kopfzeilen.map((h) => `  ${h.key}: ${h.value}`), ''];
        writeFileSync(`${outDir}/_headers`, headerZeilen.join('\n'), 'utf-8');

        // --- _redirects (Cloudflare Pages / Netlify) ---
        // Rettet das Google-Ranking, wenn der Betrieb vorher andere Adressen hatte.
        if (site.weiterleitungen.length > 0) {
          const zeilen = site.weiterleitungen.map((w) => `${w.von}  ${w.nach}  ${w.status ?? 301}`);
          writeFileSync(`${outDir}/_redirects`, zeilen.join('\n') + '\n', 'utf-8');
        }

        // --- vercel.json (im Projekt-Ordner – dort liest Vercel sie) ---
        const vercel = {
          $schema: 'https://openapi.vercel.sh/vercel.json',
          _kommentar_de:
            'AUTOMATISCH ERZEUGT von astro.config.ts – nicht von Hand ändern. ' +
            'Der Inhalt folgt dem Feld `mode` in content.config.ts: bei "demo" mit ' +
            'X-Robots-Tag (nicht indexierbar), bei "live" ohne. Einfach mode umstellen ' +
            'und neu bauen.',
          headers: [{ source: '/(.*)', headers: kopfzeilen }],
          ...(site.weiterleitungen.length > 0 && {
            redirects: site.weiterleitungen.map((w) => ({
              source: w.von,
              destination: w.nach,
              permanent: (w.status ?? 301) === 301,
            })),
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
  image: {
    // astro:assets nutzt sharp für responsive Bildgrößen.
    responsiveStyles: true,
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
