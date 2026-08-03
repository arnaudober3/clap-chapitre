/**
 * GET    /api/admin/bilans/:id   → 200 { bilan } | 404
 * GET    /api/admin/bilans/next  → 200 { next: { id, year, month } }
 * PUT    /api/admin/bilans/:id   → 200 { id }    | 404
 * DELETE /api/admin/bilans/:id   → 204           | 404
 *
 * One month for the editor, draft or published, with its avis in editorial order
 * — the editor's list is the one it reorders, so it must not be regrouped by
 * medium on the way out.
 *
 * `next` is the odd one: it answers the month the catalogue has no bilan for
 * yet, which the "nouveau bilan" form needs and which has no row to return. It
 * is computed from the highest id, so December rolls over to January of the
 * following year, and it never reads a clock — the same catalogue always yields
 * the same answer.
 *
 * Behind the admin JWT.
 */
import { requireAdmin } from '../../../_lib/admin';
import { cardEdits, mediaOf, selection, updateBilan } from '../../../_lib/bilan-write';
import { BodyError, MalformedBody, readJson } from '../../../_lib/body';
import { requireDb } from '../../../_lib/env';
import {
  badRequest,
  dbUnavailable,
  json,
  misconfigured,
  noContent,
  notFound,
  route,
  unprocessable,
} from '../../../_lib/http';
import { readBilanInput } from '../../../_lib/inputs';
import { groupCounts, rowToBilan, rowToPublishedArticle, type Row } from '../../../_lib/rows';
import { changes, now, publication } from '../../../_lib/write';
import { ARTICLE_COLUMNS_FULL } from '../../../_lib/articles';
import type { D1Database, Handler } from '../../../types';

/** The id that means "the month after the last one on file". */
const NEXT = 'next';

export const onRequestGet: Handler = async ({ request, env, params }) => {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;

  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) return notFound();

  try {
    if (id === NEXT) return json({ next: await nextMonth(db) });

    const bilan = await db.prepare('SELECT * FROM bilans WHERE id = ?').bind(id).first();
    if (!bilan) return notFound();

    const [avis, counts] = await db.batch([
      db
        .prepare(
          `SELECT ${ARTICLE_COLUMNS_FULL}
             FROM bilan_avis ba
             JOIN articles a ON a.id = ba.article_id
            WHERE ba.bilan_id = ?
            ORDER BY ba.position`,
        )
        .bind(id),
      db.prepare('SELECT bilan_id, medium, count FROM bilan_counts WHERE bilan_id = ?').bind(id),
    ]);

    return json({
      bilan: {
        ...rowToBilan(bilan as Row, groupCounts(counts.results).get(id) ?? {}),
        avis: avis.results.map(rowToPublishedArticle),
      },
    });
  } catch {
    return dbUnavailable();
  }
};

/**
 * The month after the newest one on file, whatever its status — a draft already
 * covering July means the next new bilan is August, not July again.
 *
 * An empty catalogue has no "next month" to derive, so it answers null and the
 * form asks the editor instead of inventing a date from the server's clock.
 */
async function nextMonth(db: D1Database): Promise<{ id: string; year: number; month: number } | null> {
  const row = await db.prepare('SELECT max(id) AS last FROM bilans').first();
  const last = typeof row?.last === 'string' ? row.last : '';
  if (!last) return null;

  const [year, month] = last.split('-').map(Number);
  const rolls = month === 12;
  const nextYear = rolls ? year + 1 : year;
  const nextMonthNumber = rolls ? 1 : month + 1;

  return {
    id: `${nextYear}-${String(nextMonthNumber).padStart(2, '0')}`,
    year: nextYear,
    month: nextMonthNumber,
  };
}

/**
 * Replaces a month: its own columns, its ordered selection, its chips, and the
 * cards' inline edits — one batch, so the selection and the chips can never end
 * up describing different months' worth of avis.
 *
 * The id in the URL wins over the one in the payload. Letting the body rename a
 * month would turn a save into a move, silently, and `bilans.id` is a primary
 * key that `bilan_avis` points at.
 */
export const onRequestPut: Handler = async ({ request, env, params }) => {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;

  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id || id === NEXT) return notFound();

  let input: ReturnType<typeof readBilanInput>;
  try {
    input = { ...readBilanInput(await readJson(request)), id };
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return badRequest('corps');
    throw error;
  }

  try {
    const existing = await db
      .prepare('SELECT published_at FROM bilans WHERE id = ?')
      .bind(id)
      .first<{ published_at: string | null }>();
    if (!existing) return notFound();

    const media = await mediaOf(db, input.avis);
    if (media.size !== input.avis.length) return unprocessable('avis');

    const stamp = now();
    await db.batch([
      updateBilan(db, input, publication(input.status, existing.published_at), stamp),
      ...selection(db, id, input.avis, media),
      ...cardEdits(db, input.edits, stamp),
    ]);

    return json({ id });
  } catch {
    return dbUnavailable();
  }
};

/**
 * Removes a month. `bilan_avis` and `bilan_counts` cascade; the avis themselves
 * do not — they are reviews in their own right and stay in the feed. Only the
 * grouping disappears, which is what deleting a bilan means.
 */
export const onRequestDelete: Handler = async ({ request, env, params }) => {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;

  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id || id === NEXT) return notFound();

  try {
    const [removal] = await db.batch([
      db.prepare('DELETE FROM bilans WHERE id = ?').bind(id),
      // As on an avis: `comments.target_id` carries no foreign key, so the
      // thread has to be cleared by hand or it becomes unreachable rows.
      db.prepare("DELETE FROM comments WHERE target_type = 'bilan' AND target_id = ?").bind(id),
      db.prepare("DELETE FROM likes WHERE target_type = 'bilan' AND target_id = ?").bind(id),
    ]);

    if (changes(removal?.meta ?? {}) === 0) return notFound();
    return noContent();
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = route({
  GET: onRequestGet,
  PUT: onRequestPut,
  DELETE: onRequestDelete,
});
