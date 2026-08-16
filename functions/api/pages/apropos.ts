/**
 * GET /api/pages/apropos → 200 AProposContent | 404
 *
 * The "À propos" page, which is a single row plus one ordered list. A 404 here
 * means the row was never written — an empty database, not an error — and the
 * page renders its empty state rather than a broken one.
 *
 * Two columns hold multi-line text: `bio` is paragraphs separated by a blank
 * line (the same convention as `articles.body`), `bio_emphasis` is one term per
 * line. They are split here so the shape the client receives is already the
 * shape it renders.
 *
 * The portrait's alt text is not part of this row: it is fixed in `Hero.tsx`
 * rather than editable, so there is nothing here to make it dynamic again.
 *
 * Public: this is the page itself, and the admin editor reads the same endpoint
 * — there is nothing privileged on it.
 */
import { requireDb } from '../../_lib/env';
import { dbUnavailable, getOnly, json, misconfigured, notFound } from '../../_lib/http';
import type { D1Database, Handler } from '../../types';

/** Blank-line separated paragraphs → the array the page maps over. */
function paragraphs(value: unknown): string[] {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text.split(/\n\s*\n/).map((part) => part.trim()) : [];
}

/** One term per line, empty lines ignored. */
function lines(value: unknown): string[] {
  const text = typeof value === 'string' ? value : '';
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export const onRequestGet: Handler = async ({ env }) => {
  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  try {
    const [page, stats] = await db.batch([
      db.prepare('SELECT * FROM page_apropos WHERE id = 1'),
      db.prepare('SELECT label, value FROM apropos_stats ORDER BY position'),
    ]);

    const row = page.results[0];
    if (!row) return notFound();

    return json({
      eyebrow: String(row.eyebrow),
      greeting: String(row.greeting),
      name: String(row.name),
      intro: String(row.intro),
      // The R2 key, or '' while no portrait has been uploaded. The page renders
      // its neutral placeholder on the empty string rather than a broken image.
      portraitImage: String(row.portrait_image ?? ''),
      bio: paragraphs(row.bio),
      bioEmphasis: lines(row.bio_emphasis),
      quote: String(row.quote),
      statsTitle: String(row.stats_title),
      stats: stats.results.map((stat) => ({
        label: String(stat.label),
        value: Number(stat.value),
      })),
      follow: {
        title: String(row.follow_title),
        copy: String(row.follow_copy),
        cta: String(row.follow_cta),
        to: String(row.follow_to),
      },
    });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = getOnly(onRequestGet);
