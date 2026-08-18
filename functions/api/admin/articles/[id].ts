/**
 * GET    /api/admin/articles/:id → 200 { article } | 404
 * PUT    /api/admin/articles/:id → 200 { id }      | 404
 * DELETE /api/admin/articles/:id → 204             | 404
 *
 * One avis for the editor, draft or published — which is the whole reason this
 * exists next to the public `/api/articles/:id`: that one refuses anything
 * unpublished, and the editor's form is precisely where a draft is opened.
 *
 * Behind the admin JWT.
 */
import { requireAdminDb } from '../../../_lib/admin';
import { hasMissingRelated, updateArticle } from '../../../_lib/article-write';
import { BodyError, MalformedBody, readJson } from '../../../_lib/body';
import { requireBucket } from '../../../_lib/env';
import {
  badRequest,
  dbUnavailable,
  json,
  noContent,
  notFound,
  route,
  unprocessable,
} from '../../../_lib/http';
import { readArticleInput } from '../../../_lib/inputs';
import { forget } from '../../../_lib/media';
import { rowToArticle, type Row } from '../../../_lib/rows';
import { changes, now, publication } from '../../../_lib/write';
import { ARTICLE_COLUMNS_FULL } from '../../../_lib/articles';
import type { Handler } from '../../../types';

export const onRequestGet: Handler = async ({ request, env, params }) => {
  const check = await requireAdminDb(request, env);
  if (check instanceof Response) return check;
  const { db } = check;

  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) return notFound();

  try {
    const row = await db
      .prepare(`SELECT ${ARTICLE_COLUMNS_FULL} FROM articles a WHERE a.id = ?`)
      .bind(id)
      .first();

    if (!row) return notFound();
    return json({ article: rowToArticle(row as Row) });
  } catch {
    return dbUnavailable();
  }
};

/**
 * Replaces an avis wholesale — every column the form owns, plus its related
 * links. A PUT rather than a PATCH because the form always holds the complete
 * avis: sending a partial one would make "the editor cleared this field" and
 * "the editor did not touch this field" the same request.
 *
 * The current row is read first for two things it alone knows: the existing
 * `published_at`, so re-saving a live avis does not restamp it, and the previous
 * cover, so a replaced image can be swept up.
 */
export const onRequestPut: Handler = async ({ request, env, params }) => {
  const check = await requireAdminDb(request, env);
  if (check instanceof Response) return check;
  const { db } = check;

  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) return notFound();

  let input: ReturnType<typeof readArticleInput>;
  try {
    input = readArticleInput(await readJson(request));
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return badRequest('corps');
    throw error;
  }

  try {
    const existing = await db
      .prepare('SELECT published_at, cover FROM articles WHERE id = ?')
      .bind(id)
      .first<{ published_at: string | null; cover: string }>();
    if (!existing) return notFound();

    if (await hasMissingRelated(db, id, input)) return unprocessable('related');

    await db.batch(
      updateArticle(db, id, input, publication(input.status, existing.published_at), now()),
    );

    // After the write, and never in its way: an image nobody points at is a
    // fraction of a cent, a failed save is the editor's work.
    try {
      await forget(db, requireBucket(env), existing.cover, input.cover);
    } catch {
      /* no bucket configured, or R2 refused — see `forget` */
    }

    return json({ id });
  } catch {
    return dbUnavailable();
  }
};

/**
 * Removes an avis. `bilan_avis` and `article_related` cascade, so a month that
 * featured it simply loses that card rather than breaking.
 *
 * The comments do not cascade — `comments.target_id` carries no foreign key,
 * since it points at two tables — so the thread is cleared explicitly. Missing
 * that would leave rows nothing can ever reach or delete.
 */
export const onRequestDelete: Handler = async ({ request, env, params }) => {
  const check = await requireAdminDb(request, env);
  if (check instanceof Response) return check;
  const { db } = check;

  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) return notFound();

  try {
    const existing = await db
      .prepare('SELECT cover FROM articles WHERE id = ?')
      .bind(id)
      .first<{ cover: string }>();
    if (!existing) return notFound();

    const [removal] = await db.batch([
      db.prepare('DELETE FROM articles WHERE id = ?').bind(id),
      db
        .prepare("DELETE FROM comments WHERE target_type = 'article' AND target_id = ?")
        .bind(id),
      db.prepare("DELETE FROM likes WHERE target_type = 'article' AND target_id = ?").bind(id),
    ]);

    // The row was there a moment ago; if nothing changed, something else removed
    // it in between, and 404 is the honest answer.
    if (changes(removal?.meta ?? {}) === 0) return notFound();

    try {
      await forget(db, requireBucket(env), existing.cover, '');
    } catch {
      /* see above */
    }

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
