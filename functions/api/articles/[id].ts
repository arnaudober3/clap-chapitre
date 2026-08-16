/**
 * GET /api/articles/:id → 200 { article, related, prev, next, bilan, comments } | 404
 *
 * Everything the avis page renders, in one request. The page needs five things —
 * the avis, its "à rapprocher de" links, its neighbours, the bilan it belongs to
 * (for the breadcrumb) and its thread — and asking for them separately would put
 * five round-trips between a click and a readable page.
 *
 * The four dependent queries go out in a single `batch`, so the extra cost over
 * fetching the avis alone is one database round-trip, not four.
 *
 * Public: an unpublished avis is a 404 here, not a preview.
 */
import { isAdminCaller } from '../../_lib/admin';
import { isCrawler } from '../../_lib/audience';
import { requireDb } from '../../_lib/env';
import { dbUnavailable, getOnly, json, misconfigured, notFound } from '../../_lib/http';
import { nestComments, rowToPublishedArticle, type Row } from '../../_lib/rows';
import { ARTICLE_COLUMNS, ARTICLE_COLUMNS_FULL } from '../../_lib/articles';
import type { D1Database, Handler } from '../../types';

export const onRequestGet: Handler = async ({ request, env, params }) => {
  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) return notFound();

  try {
    const article = await db
      .prepare(
        `SELECT ${ARTICLE_COLUMNS_FULL}
           FROM articles a
          WHERE a.id = ? AND a.status = 'published'`,
      )
      .bind(id)
      .first();

    if (!article) return notFound();

    // The neighbours are resolved by date rather than by position in a list:
    // `id` breaks the tie so two avis published the same day still have a stable
    // order, and inserting an older avis never renumbers anything.
    const publishedAt = String((article as Row).published_at ?? '');

    // A view is recorded for a real reader only: not a crawler, and not the
    // editor's own visit to the page they just published.
    const recordView =
      !isCrawler(request.headers.get('user-agent')) && !(await isAdminCaller(request, env));

    const batch = [
      db
        .prepare(
          `SELECT ${ARTICLE_COLUMNS}, ar.note AS note
             FROM article_related ar
             JOIN articles a ON a.id = ar.related_id
            WHERE ar.article_id = ? AND a.status = 'published'
            ORDER BY ar.position
            LIMIT 2`,
        )
        .bind(id),
      db
        .prepare(
          `SELECT ${ARTICLE_COLUMNS}
             FROM articles a
            WHERE a.status = 'published'
              AND (a.published_at, a.id) < (?, ?)
            ORDER BY a.published_at DESC, a.id DESC
            LIMIT 1`,
        )
        .bind(publishedAt, id),
      db
        .prepare(
          `SELECT ${ARTICLE_COLUMNS}
             FROM articles a
            WHERE a.status = 'published'
              AND (a.published_at, a.id) > (?, ?)
            ORDER BY a.published_at ASC, a.id ASC
            LIMIT 1`,
        )
        .bind(publishedAt, id),
      // The breadcrumb shows one bilan. An avis can be picked up by two months —
      // the editor's picker allows it — so the most recent one wins.
      db
        .prepare(
          `SELECT b.id, b.month_label, b.year, b.title
             FROM bilan_avis ba
             JOIN bilans b ON b.id = ba.bilan_id
            WHERE ba.article_id = ? AND b.status = 'published'
            ORDER BY b.id DESC
            LIMIT 1`,
        )
        .bind(id),
      db
        .prepare(
          // `status = 'approved'` is what makes the moderation queue mean
          // something: a comment sits in 'pending' until the editor releases it,
          // and this is the filter that keeps it off the page until then.
          `SELECT id, author, is_author, body, comment_date, likes, parent_id
             FROM comments
            WHERE target_type = 'article' AND target_id = ? AND status = 'approved'
            ORDER BY position, comment_date, id`,
        )
        .bind(id),
    ];

    if (recordView) {
      batch.push(
        db
          .prepare(`INSERT INTO view_hits (target_type, target_id, viewed_at) VALUES ('article', ?, datetime('now'))`)
          .bind(id),
        db.prepare(`UPDATE articles SET views = views + 1 WHERE id = ?`).bind(id),
      );
    }

    const [related, previous, next, bilan, comments] = await db.batch(batch);

    return json({
      article: rowToPublishedArticle(article as Row),
      related: related.results.map((row) => ({
        ...rowToPublishedArticle(row),
        note: String(row.note ?? ''),
      })),
      prev: previous.results[0] ? rowToPublishedArticle(previous.results[0]) : null,
      next: next.results[0] ? rowToPublishedArticle(next.results[0]) : null,
      bilan: bilan.results[0]
        ? {
            id: String(bilan.results[0].id),
            monthLabel: String(bilan.results[0].month_label),
            year: Number(bilan.results[0].year),
            title: String(bilan.results[0].title),
          }
        : null,
      comments: nestComments(comments.results),
    });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = getOnly(onRequestGet);
