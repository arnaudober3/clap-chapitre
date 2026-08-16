/**
 * GET /api/bilans/:id → 200 { bilan, comments } | 404
 *
 * One month, with its avis in editorial order and its thread. `:id` is either a
 * month ('2026-07') or the literal `latest`, which is how the page opens when
 * the URL carries no `?mois=` — asking for the list first just to learn the
 * newest id would cost a round-trip for something the database already knows.
 *
 * The avis come back inside `bilan.avis`, the shape the type declares, so the
 * page hands `bilan` straight to its sections.
 *
 * Public: published months and published avis only.
 */
import { isAdminCaller } from '../../_lib/admin';
import { isCrawler } from '../../_lib/audience';
import { requireDb } from '../../_lib/env';
import { dbUnavailable, getOnly, json, misconfigured, notFound } from '../../_lib/http';
import { groupCounts, nestComments, rowToPublishedArticle, rowToPublishedBilan, type Row } from '../../_lib/rows';
import { ARTICLE_COLUMNS_FULL } from '../../_lib/articles';
import type { D1Database, Handler } from '../../types';

/** The id that means "whichever month is newest". */
const LATEST = 'latest';

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
    // One statement for both cases: `latest` drops the id filter and takes the
    // first row of the same ordering the archive uses.
    const bilan =
      id === LATEST
        ? await db
            .prepare(
              `SELECT * FROM bilans
                WHERE status = 'published'
                ORDER BY published_at DESC, id DESC
                LIMIT 1`,
            )
            .first()
        : await db
            .prepare(`SELECT * FROM bilans WHERE id = ? AND status = 'published'`)
            .bind(id)
            .first();

    if (!bilan) return notFound();

    const monthId = String((bilan as Row).id);

    // A view is recorded for a real reader only: not a crawler, and not the
    // editor's own visit to the month they just published.
    const recordView =
      !isCrawler(request.headers.get('user-agent')) && !(await isAdminCaller(request, env));

    const batch = [
      db
        .prepare(
          `SELECT ${ARTICLE_COLUMNS_FULL}
             FROM bilan_avis ba
             JOIN articles a ON a.id = ba.article_id
            WHERE ba.bilan_id = ? AND a.status = 'published'
            ORDER BY ba.position`,
        )
        .bind(monthId),
      db.prepare(`SELECT bilan_id, medium, count FROM bilan_counts WHERE bilan_id = ?`).bind(monthId),
      db
        .prepare(
          // See the same filter on /api/articles/:id — pending comments are
          // invisible until moderated.
          `SELECT id, author, is_author, body, comment_date, likes, parent_id
             FROM comments
            WHERE target_type = 'bilan' AND target_id = ? AND status = 'approved'
            ORDER BY position, comment_date, id`,
        )
        .bind(monthId),
    ];

    if (recordView) {
      batch.push(
        db
          .prepare(`INSERT INTO view_hits (target_type, target_id, viewed_at) VALUES ('bilan', ?, datetime('now'))`)
          .bind(monthId),
        db.prepare(`UPDATE bilans SET views = views + 1 WHERE id = ?`).bind(monthId),
      );
    }

    const [avis, counts, comments] = await db.batch(batch);

    return json({
      bilan: {
        ...rowToPublishedBilan(bilan as Row, groupCounts(counts.results).get(monthId) ?? {}),
        avis: avis.results.map(rowToPublishedArticle),
      },
      comments: nestComments(comments.results),
    });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = getOnly(onRequestGet);
