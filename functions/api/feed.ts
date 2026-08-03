/**
 * GET /api/feed?medium=film&limit=7 → 200 { items }
 *
 * The home page of a medium: its published avis, newest first. The hero is
 * `items[0]` and the grid is the rest — the split is the page's business, not
 * the endpoint's, so nothing here knows about heroes.
 *
 * `medium` is optional and answers the mixed feed. No route reaches that today
 * (`/` redirects to `/films`), but the query is the same one with one clause
 * fewer, and refusing it would be an arbitrary limit.
 *
 * Public: drafts and view counts never leave this handler.
 */
import { requireDb } from '../_lib/env';
import { dbUnavailable, badRequest, getOnly, json, misconfigured } from '../_lib/http';
import { QueryError, readLimit, readMedium } from '../_lib/query';
import { rowToPublishedArticle } from '../_lib/rows';
import { ARTICLE_COLUMNS } from '../_lib/articles';
import type { D1Database, Handler } from '../types';

/** Hero + six cards is what the design shows; the cap keeps the ceiling sane. */
const DEFAULT_LIMIT = 7;
const MAX_LIMIT = 24;

export const onRequestGet: Handler = async ({ request, env }) => {
  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  const url = new URL(request.url);
  let medium: string | undefined;
  let limit: number;
  try {
    medium = readMedium(url);
    limit = readLimit(url, DEFAULT_LIMIT, MAX_LIMIT);
  } catch (error) {
    if (error instanceof QueryError) return badRequest(error.parameter);
    throw error;
  }

  const where = medium ? "a.status = 'published' AND a.medium = ?" : "a.status = 'published'";
  const values = medium ? [medium, limit] : [limit];

  try {
    const { results } = await db
      .prepare(
        `SELECT ${ARTICLE_COLUMNS}
           FROM articles a
          WHERE ${where}
          ORDER BY a.published_at DESC, a.id DESC
          LIMIT ?`,
      )
      .bind(...values)
      .all();

    return json({ items: results.map(rowToPublishedArticle) });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = getOnly(onRequestGet);
