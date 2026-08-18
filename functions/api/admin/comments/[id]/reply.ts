/**
 * POST /api/admin/comments/:id/reply → 201 { id, author, body, likes, isAuthor: true }
 *                                       | 404 | 409 | 422
 *
 * The editor's own answer to a root comment — the one write behind the admin
 * JWT that lands straight in the thread rather than in moderation: it is the
 * author's own voice, so there is nothing to queue.
 *
 * `target_type`/`target_id` are copied from the parent rather than sent by the
 * client, which only ever names the comment it is answering — the same reason
 * `/api/comments` re-derives them itself instead of trusting the form.
 * `comment_date` stays NULL, like every author reply: the thread shows an
 * "autrice" badge in its place, never a date.
 */
import { requireAdminDb } from '../../../../_lib/admin';
import { BodyError, MalformedBody, readJson, text } from '../../../../_lib/body';
import {
  conflict,
  created,
  dbUnavailable,
  notFound,
  postOnly,
  unprocessable,
} from '../../../../_lib/http';
import { commentId } from '../../../../_lib/write';
import type { Handler } from '../../../../types';

/** The one voice a reply speaks in — every reply is the editor's own. */
const AUTHOR_NAME = 'Marie-Zoé';

export const onRequestPost: Handler = async ({ request, env, params }) => {
  const check = await requireAdminDb(request, env);
  if (check instanceof Response) return check;
  const { db } = check;

  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) return notFound();

  let body: string;
  try {
    body = text(await readJson(request), 'body', { max: 4000 });
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return unprocessable('corps');
    throw error;
  }

  try {
    const parent = await db
      .prepare(
        `SELECT target_type, target_id, parent_id,
                (SELECT count(*) FROM comments r WHERE r.parent_id = comments.id) AS reply_count
           FROM comments WHERE id = ?`,
      )
      .bind(id)
      .first<{
        target_type: string;
        target_id: string;
        parent_id: string | null;
        reply_count: number;
      }>();

    if (!parent) return notFound();
    // The trigger in migration 0001 already refuses a reply to a reply — named
    // here so it surfaces as a 422 rather than the opaque 503 an abort would give.
    if (parent.parent_id) return unprocessable('id');
    // The thread renders one reply per comment (`nestComments` keeps only the
    // first); a second insert would just silently disappear.
    if (parent.reply_count > 0) return conflict('Ce commentaire a déjà une réponse.');

    const replyId = await commentId(db, AUTHOR_NAME);
    await db
      .prepare(
        `INSERT INTO comments
           (id, target_type, target_id, parent_id, author, is_author, body,
            comment_date, status, created_at, position)
         VALUES (?, ?, ?, ?, ?, 1, ?, NULL, 'approved', datetime('now'),
                 (SELECT coalesce(max(position), -1) + 1 FROM comments
                   WHERE target_type = ? AND target_id = ?))`,
      )
      .bind(
        replyId,
        parent.target_type,
        parent.target_id,
        id,
        AUTHOR_NAME,
        body,
        parent.target_type,
        parent.target_id,
      )
      .run();

    return created({ id: replyId, author: AUTHOR_NAME, body, isAuthor: true, likes: 0 });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = postOnly(onRequestPost);
