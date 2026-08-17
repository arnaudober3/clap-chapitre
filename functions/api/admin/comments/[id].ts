/**
 * PUT    /api/admin/comments/:id → 200 { id } | 404
 * DELETE /api/admin/comments/:id → 204        | 404
 *
 * Releasing a comment from the queue, or removing it. Behind the admin JWT.
 *
 * The PUT touches `status` and nothing else — deliberately. The triggers that
 * keep the thread one level deep and a reply on its parent's target are
 * `BEFORE INSERT` only, so `parent_id` and `target_id` have no guard once a row
 * exists. Not writing them is what keeps that gap harmless.
 */
import { requireAdminDb } from '../../../_lib/admin';
import { BodyError, MalformedBody, readJson } from '../../../_lib/body';
import { oneOf } from '../../../_lib/body';
import {
  badRequest,
  dbUnavailable,
  json,
  noContent,
  notFound,
  route,
  unprocessable,
} from '../../../_lib/http';
import { changes } from '../../../_lib/write';
import type { Handler } from '../../../types';

const STATUSES = ['pending', 'approved'] as const;

export const onRequestPut: Handler = async ({ request, env, params }) => {
  const check = await requireAdminDb(request, env);
  if (check instanceof Response) return check;
  const { db } = check;

  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) return notFound();

  let status: (typeof STATUSES)[number];
  try {
    status = oneOf(await readJson(request), 'status', STATUSES);
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return badRequest('corps');
    throw error;
  }

  try {
    const result = await db
      .prepare('UPDATE comments SET status = ? WHERE id = ?')
      .bind(status, id)
      .run();
    if (changes(result.meta) === 0) return notFound();

    return json({ id, status });
  } catch {
    return dbUnavailable();
  }
};

/**
 * Deletes a comment. A root takes its reply with it — `parent_id` cascades — and
 * its likes go too, since `likes.target_id` carries no foreign key and would
 * otherwise leave rows pointing at nothing.
 */
export const onRequestDelete: Handler = async ({ request, env, params }) => {
  const check = await requireAdminDb(request, env);
  if (check instanceof Response) return check;
  const { db } = check;

  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) return notFound();

  try {
    // Likes first: the subquery reads the very rows the next statement removes,
    // and the other order would silently match nothing.
    const [, removal] = await db.batch([
      db
        .prepare(
          `DELETE FROM likes
            WHERE target_type = 'comment'
              AND target_id IN (SELECT id FROM comments WHERE id = ? OR parent_id = ?)`,
        )
        .bind(id, id),
      db.prepare('DELETE FROM comments WHERE id = ?').bind(id),
    ]);

    if (changes(removal?.meta ?? {}) === 0) return notFound();
    return noContent();
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = route({ PUT: onRequestPut, DELETE: onRequestDelete });
