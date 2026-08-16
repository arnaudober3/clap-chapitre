/**
 * GET /sitemap.xml → 200 application/xml | 500 | 503
 *
 * Every published avis and bilan, plus the site's static routes. Reuses the
 * same `status = 'published'` / `ORDER BY published_at DESC, id DESC` pattern
 * as `functions/api/feed.ts` and `functions/api/bilans/index.ts` — only the id
 * and published_at columns are needed here, so the query stays narrower than
 * either of those.
 *
 * `<lastmod>` is always present for a published row: the `CHECK
 * ((status='published') = (published_at IS NOT NULL))` constraint on both
 * tables (migrations/0001_contenu.sql) guarantees it.
 */
import { requireDb } from './_lib/env';
import { dbUnavailable, getOnly, misconfigured } from './_lib/http';
import { SITE_URL } from './_lib/site';
import type { D1Database, Handler } from './types';

const STATIC_ROUTES = [
  '/films',
  '/series',
  '/livres',
  '/docs',
  '/archives/films',
  '/archives/series',
  '/archives/livres',
  '/archives/docs',
  '/bilan-culturel',
  '/bilan-culturel/archives',
  '/a-propos',
  '/me-suivre',
];

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderUrlset(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>` +
        (entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : '') +
        `\n  </url>`,
    )
    .join('\n');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
}

export const onRequestGet: Handler = async ({ env }) => {
  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  try {
    const [articles, bilans] = await db.batch<{ id: string; published_at: string }>([
      db.prepare(
        `SELECT id, published_at FROM articles
          WHERE status = 'published' ORDER BY published_at DESC, id DESC`,
      ),
      db.prepare(
        `SELECT id, published_at FROM bilans
          WHERE status = 'published' ORDER BY published_at DESC, id DESC`,
      ),
    ]);

    const entries: SitemapEntry[] = [
      ...STATIC_ROUTES.map((path) => ({ loc: `${SITE_URL}${path}` })),
      ...articles.results.map((row) => ({
        loc: `${SITE_URL}/article/${row.id}`,
        lastmod: row.published_at,
      })),
      ...bilans.results.map((row) => ({
        loc: `${SITE_URL}/bilan-culturel?mois=${row.id}`,
        lastmod: row.published_at,
      })),
    ];

    return new Response(renderUrlset(entries), {
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = getOnly(onRequestGet);
