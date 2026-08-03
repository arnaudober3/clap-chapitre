/**
 * GET /api/admin/bilans → 200 { items, total, page, perPage, draft, catalogue }
 *
 * The back-office bilans listing. `items` holds only published months: the month
 * in progress gets its own card above the table, so it is returned separately as
 * `draft` rather than being paginated in with the rest — and it must not
 * disappear when the editor searches.
 *
 * `catalogue.since` is the oldest published month, which the page renders as
 * "depuis mai 2025". It travels as `{ month, year }`, not as that sentence: the
 * French belongs to `src/format.ts`.
 *
 * Behind the admin JWT.
 */
import { requireAdmin } from '../../../_lib/admin';
import { requireDb } from '../../../_lib/env';
import { dbUnavailable, badRequest, getOnly, json, misconfigured } from '../../../_lib/http';
import { QueryError, readBilanSort, readPage, readPerPage, readSearch } from '../../../_lib/query';
import { bilanOrderBy, folded, likeTerm } from '../../../_lib/sql';
import { groupCounts, rowToBilan, type Row } from '../../../_lib/rows';
import type { D1Database, Handler } from '../../../types';

const DEFAULT_PER_PAGE = 7;
const MAX_PER_PAGE = 100;

const BILAN_COLUMNS =
  'id, year, month, month_label, title, mood, status, published_at, updated_at, views, likes';

export const onRequestGet: Handler = async ({ request, env }) => {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;

  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  const url = new URL(request.url);
  let search: string | undefined;
  let sort: ReturnType<typeof readBilanSort>;
  let page: number;
  let perPage: number;
  try {
    search = readSearch(url);
    sort = readBilanSort(url);
    page = readPage(url);
    perPage = readPerPage(url, DEFAULT_PER_PAGE, MAX_PER_PAGE);
  } catch (error) {
    if (error instanceof QueryError) return badRequest(error.parameter);
    throw error;
  }

  const clauses = ["status = 'published'"];
  const values: unknown[] = [];
  if (search) {
    // Month, year and title together: the editor looks for "juin 2026" as
    // readily as for a title.
    clauses.push(`${folded("month_label || ' ' || year || ' ' || title")} LIKE ? ESCAPE '\\'`);
    values.push(likeTerm(search));
  }
  const where = `WHERE ${clauses.join(' AND ')}`;

  try {
    const [rows, totals, draft, catalogue, counts] = await db.batch([
      db
        .prepare(
          `SELECT ${BILAN_COLUMNS} FROM bilans ${where}
            ORDER BY ${bilanOrderBy(sort)}
            LIMIT ? OFFSET ?`,
        )
        .bind(...values, perPage, (page - 1) * perPage),
      db.prepare(`SELECT count(*) AS total FROM bilans ${where}`).bind(...values),
      // The month in progress. There is at most one by convention; the newest
      // wins if the editor ever leaves two open.
      db.prepare(
        `SELECT ${BILAN_COLUMNS} FROM bilans WHERE status = 'draft' ORDER BY id DESC LIMIT 1`,
      ),
      db.prepare(
        `SELECT sum(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
                sum(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
                min(CASE WHEN status = 'published' THEN id END) AS since
           FROM bilans`,
      ),
      db.prepare('SELECT bilan_id, medium, count FROM bilan_counts'),
    ]);

    const chips = groupCounts(counts.results);
    const summary = catalogue.results[0] ?? {};
    // Ids are 'AAAA-MM', so the smallest string is the oldest month — no date
    // parsing, and it sorts the same way in SQLite as it reads.
    const since = typeof summary.since === 'string' ? summary.since.split('-') : null;

    return json({
      items: rows.results.map((row: Row) => rowToBilan(row, chips.get(String(row.id)) ?? {})),
      total: Number(totals.results[0]?.total ?? 0),
      page,
      perPage,
      draft: draft.results[0]
        ? rowToBilan(draft.results[0], chips.get(String(draft.results[0].id)) ?? {})
        : null,
      catalogue: {
        published: Number(summary.published ?? 0),
        drafts: Number(summary.drafts ?? 0),
        since: since ? { year: Number(since[0]), month: Number(since[1]) } : null,
      },
    });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = getOnly(onRequestGet);
