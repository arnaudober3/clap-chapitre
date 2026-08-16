/**
 * GET /api/bilans → 200 { items }
 *
 * Every published month, newest first: the archive page groups them by year, and
 * the month switcher on the bilan page uses the same list.
 *
 * Each entry carries three derived things the listings render without opening a
 * month: its per-medium chips, how many avis it holds, and the first three
 * covers for the little collage. They are gathered in three statements over the
 * whole set rather than per month — a fifteen-month archive would otherwise be
 * forty-five queries.
 *
 * Public: published months only.
 */
import { requireDb } from '../../_lib/env';
import { dbUnavailable, getOnly, json, misconfigured } from '../../_lib/http';
import { groupCounts, rowToPublishedBilan, type Row } from '../../_lib/rows';
import type { D1Database, Handler } from '../../types';

/** What the archive's month card shows: three covers, no more. */
const COVERS_PER_CARD = 3;

export const onRequestGet: Handler = async ({ env }) => {
  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  try {
    const [months, counts, avis] = await db.batch([
      db.prepare(
        `SELECT id, year, month, month_label, title, mood, status, published_at, updated_at, views, likes
           FROM bilans
          WHERE status = 'published'
          ORDER BY published_at DESC, id DESC`,
      ),
      db.prepare(
        `SELECT bc.bilan_id, bc.medium, bc.count
           FROM bilan_counts bc
           JOIN bilans b ON b.id = bc.bilan_id
          WHERE b.status = 'published'`,
      ),
      // Ordered by the editorial position, so "the first three covers" means the
      // three the month opens with, not three arbitrary ones.
      db.prepare(
        `SELECT ba.bilan_id, a.cover, ba.position
           FROM bilan_avis ba
           JOIN articles a ON a.id = ba.article_id
           JOIN bilans b ON b.id = ba.bilan_id
          WHERE b.status = 'published' AND a.status = 'published'
          ORDER BY ba.bilan_id, ba.position`,
      ),
    ]);

    const chips = groupCounts(counts.results);
    const covers = new Map<string, string[]>();
    for (const row of avis.results) {
      const key = String(row.bilan_id);
      const list = covers.get(key) ?? [];
      list.push(String(row.cover));
      covers.set(key, list);
    }

    return json({
      items: months.results.map((row: Row) => {
        const id = String(row.id);
        const monthCovers = covers.get(id) ?? [];
        return {
          ...rowToPublishedBilan(row, chips.get(id) ?? {}),
          avisCount: monthCovers.length,
          covers: monthCovers.slice(0, COVERS_PER_CARD),
        };
      }),
    });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = getOnly(onRequestGet);
