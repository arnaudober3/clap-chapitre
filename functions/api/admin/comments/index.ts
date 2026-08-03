/**
 * GET /api/admin/comments?status=&page= → 200 { items, total, page, perPage, pending }
 *
 * The moderation queue. Without it the `pending` status would be a trap: comments
 * would pile up in a state nothing can ever release.
 *
 * Each row carries what the target is, not just its id — the queue mixes threads
 * from every avis and every bilan, and "on which page was this said" is the first
 * thing a moderator needs. `pending` counts the whole backlog whatever the
 * current filter, so the badge in the nav does not move when the list is filtered.
 *
 * Behind the admin JWT.
 */
import { requireAdmin } from '../../../_lib/admin';
import { requireDb } from '../../../_lib/env';
import { badRequest, dbUnavailable, json, misconfigured, route } from '../../../_lib/http';
import { QueryError, readPage, readPerPage } from '../../../_lib/query';
import type { D1Database, Handler } from '../../../types';

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

const STATUSES = ['pending', 'approved'] as const;

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
  let page: number;
  let perPage: number;
  try {
    page = readPage(url);
    perPage = readPerPage(url, DEFAULT_PER_PAGE, MAX_PER_PAGE);
  } catch (error) {
    if (error instanceof QueryError) return badRequest(error.parameter);
    throw error;
  }

  // Not `readStatus`: that one knows 'published'/'draft', which are an avis'
  // states, not a comment's. Same strictness, different vocabulary.
  const rawStatus = url.searchParams.get('status');
  const status =
    rawStatus === null || rawStatus === '' || rawStatus === 'all' ? undefined : rawStatus;
  if (status !== undefined && !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return badRequest('status');
  }

  const where = status ? 'WHERE c.status = ?' : '';
  const values = status ? [status] : [];

  try {
    const [rows, totals, backlog] = await db.batch([
      db
        .prepare(
          `SELECT c.id, c.target_type, c.target_id, c.parent_id, c.author, c.body,
                  c.comment_date, c.created_at, c.likes, c.status,
                  coalesce(a.title, b.title) AS target_title
             FROM comments c
             LEFT JOIN articles a ON c.target_type = 'article' AND a.id = c.target_id
             LEFT JOIN bilans   b ON c.target_type = 'bilan'   AND b.id = c.target_id
             ${where}
            ORDER BY c.created_at DESC, c.id
            LIMIT ? OFFSET ?`,
        )
        .bind(...values, perPage, (page - 1) * perPage),
      db.prepare(`SELECT count(*) AS total FROM comments c ${where}`).bind(...values),
      db.prepare("SELECT count(*) AS total FROM comments WHERE status = 'pending'"),
    ]);

    return json({
      items: rows.results.map((row) => ({
        id: String(row.id),
        targetType: String(row.target_type),
        targetId: String(row.target_id),
        targetTitle: String(row.target_title ?? ''),
        isReply: Boolean(row.parent_id),
        author: String(row.author),
        body: String(row.body),
        // ISO, like everywhere else — the French is built in src/format.ts.
        date: row.comment_date ? String(row.comment_date) : undefined,
        createdAt: row.created_at ? String(row.created_at) : undefined,
        likes: Number(row.likes ?? 0),
        status: String(row.status),
      })),
      total: Number(totals.results[0]?.total ?? 0),
      page,
      perPage,
      pending: Number(backlog.results[0]?.total ?? 0),
    });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = route({ GET: onRequestGet });
