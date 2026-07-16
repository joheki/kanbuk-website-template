import type { APIRoute } from 'astro';
import { site } from '../../content.config';

/**
 * robots.txt – mode-abhängig.
 * demo: alles gesperrt (zusätzlich zu noindex-Meta + X-Robots-Tag-Header).
 * live: Indexierung erlaubt, Verweis auf die Sitemap.
 */
export const GET: APIRoute = () => {
  const istLive = site.mode === 'live';
  const body = istLive
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site.domain).href}\n`
    : `User-agent: *\nDisallow: /\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
