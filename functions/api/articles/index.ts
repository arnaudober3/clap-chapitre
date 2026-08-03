/**
 * GET /api/articles?medium=livre&page=1&perPage=24 → 200 { items, total, page, perPage }
 *
 * The full archive of a medium, paginated. Same rows as `/api/feed`, but with a
 * count so the page can render a pager instead of guessing whether there is
 * more.
 *
 * `total` counts the filter, not the page: it is what tells the client there are
 * 31 avis when it is showing 24.
 *
 * Public: published only.
 */
import { requireDb } from '../../_lib/env';
import { dbUnavailable, badRequest, getOnly, json, misconfigured } from '../../_lib/http';
import { QueryError, readMedium, readPage, readPerPage } from '../../_lib/query';
import { rowToPublishedArticle } from '../../_lib/rows';
import { ARTICLE_COLUMNS } from '../../_lib/articles';
import type { D1Database, Handler } from '../../types';

const DEFAULT_PER_PAGE = 24;
const MAX_PER_PAGE = 100;

export const onRequestGet: Handler = async ({ request, env }) => {
  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  const url = new URL(request.url);
  let medium: string | undefined;
  let page: number;
  let perPage: number;
  try {
    medium = readMedium(url);
    page = readPage(url);
    perPage = readPerPage(url, DEFAULT_PER_PAGE, MAX_PER_PAGE);
  } catch (error) {
    if (error instanceof QueryError) return badRequest(error.parameter);
    throw error;
  }

  const where = medium ? "a.status = 'published' AND a.medium = ?" : "a.status = 'published'";
  const filter = medium ? [medium] : [];

  try {
    // Both statements read the same filter; sending them together keeps the
    // count and the page from being taken at two different moments.
    const [rows, totals] = await db.batch([
      db
        .prepare(
          `SELECT ${ARTICLE_COLUMNS}
             FROM articles a
            WHERE ${where}
            ORDER BY a.published_at DESC, a.id DESC
            LIMIT ? OFFSET ?`,
        )
        .bind(...filter, perPage, (page - 1) * perPage),
      db.prepare(`SELECT count(*) AS total FROM articles a WHERE ${where}`).bind(...filter),
    ]);

    return json({
      items: rows.results.map(rowToPublishedArticle),
      total: Number(totals.results[0]?.total ?? 0),
      page,
      perPage,
    });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = getOnly(onRequestGet);
