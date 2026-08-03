/**
 * GET /api/admin/articles/:id → 200 { article } | 404
 *
 * One avis for the editor, draft or published — which is the whole reason this
 * exists next to the public `/api/articles/:id`: that one refuses anything
 * unpublished, and the editor's form is precisely where a draft is opened.
 *
 * Behind the admin JWT.
 */
import { requireAdmin } from '../../../_lib/admin';
import { requireDb } from '../../../_lib/env';
import { dbUnavailable, getOnly, json, misconfigured, notFound } from '../../../_lib/http';
import { rowToArticle, type Row } from '../../../_lib/rows';
import { ARTICLE_COLUMNS_FULL } from '../../../_lib/articles';
import type { D1Database, Handler } from '../../../types';

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

export const onRequest = getOnly(onRequestGet);
