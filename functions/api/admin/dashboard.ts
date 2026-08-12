/**
 * GET /api/admin/dashboard?period=30j → 200 { periods, defaultPeriod, kpis, leaderboard, trend, drafts }
 *
 * The whole tableau de bord in one request: six cards, several queries, one
 * round-trip per phase. Changing the reporting period refetches the lot — a
 * rare action, and splitting the endpoint per card would trade one request
 * for six on the page that opens first.
 *
 * Every figure here is now computed from real audience events —
 * `view_hits`, `share_hits`, `likes.created_at`, `comments.created_at` — added
 * once the site actually recorded them. Before that, the KPI figures and the
 * trend points were stored constants: there was no events table to derive
 * them from, so inventing them from `views` alone would have been a chart
 * that lies about *when* those views happened. Now there is one.
 *
 * The KPI queries need to know which `period` was resolved before they can
 * run, and resolving `period` needs the `periods` table — so the handler runs
 * two batches: the period-independent cards first, then the KPI window
 * counts once `period` is known.
 *
 * An unknown `period` falls back to the default rather than 400: the parameter
 * comes from a dropdown, and a stale bookmark should show the dashboard, not an
 * error.
 *
 * Behind the admin JWT.
 */
import { requireAdmin } from '../../_lib/admin';
import { deltaPct, isPeriod, lastMonths, monthAbbrev, WINDOWS } from '../../_lib/audience';
import { requireDb } from '../../_lib/env';
import { dbUnavailable, getOnly, json, misconfigured } from '../../_lib/http';
import type { D1Database, D1PreparedStatement, Handler } from '../../types';

/** The leaderboard shows five rows, as the design does. */
const LEADERBOARD_SIZE = 5;

/** The trend shows a full year, oldest first. */
const TREND_MONTHS = 12;

/** One KPI card per real audience signal, in the order the strip renders them. */
const KPI_CARDS = [
  { key: 'views', label: 'Vues' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Commentaires' },
  { key: 'shares', label: 'Partages' },
] as const;

export const onRequestGet: Handler = async ({ request, env }) => {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;

  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  const requested = new URL(request.url).searchParams.get('period') ?? '';

  try {
    const [periods, leaderboard, trendRows, drafts] = await db.batch([
      db.prepare('SELECT id, label, position, is_default FROM stat_periods ORDER BY position'),
      // Avis and bilans compete in the same ranking, so they are unioned before
      // being ordered — ranking each separately would give two top-fives, not one.
      db
        .prepare(
          `SELECT * FROM (
             SELECT id, medium AS kind, title, views, id AS article_id
               FROM articles WHERE status = 'published'
             UNION ALL
             SELECT id, 'bilan' AS kind, title, views, NULL AS article_id
               FROM bilans WHERE status = 'published'
           )
           ORDER BY views DESC, id ASC
           LIMIT ?`,
        )
        .bind(LEADERBOARD_SIZE),
      // A calendar month at a time, over the whole year — not scoped to the
      // selected period, which is why this runs alongside `periods` rather
      // than with the KPI counts below.
      db
        .prepare(
          `SELECT strftime('%Y-%m', viewed_at) AS ym, count(*) AS n
             FROM view_hits
            WHERE viewed_at >= datetime('now', ?)
            GROUP BY ym`,
        )
        .bind(`-${TREND_MONTHS} months`),
      db
        .prepare(
          `SELECT id, title, 'article' AS kind FROM articles WHERE status = 'draft'
           UNION ALL
           SELECT id, title, 'bilan' AS kind FROM bilans WHERE status = 'draft'
           ORDER BY id`,
        ),
    ]);

    const known = periods.results.map((row) => String(row.id));
    const fallback =
      periods.results.find((row) => row.is_default === 1)?.id ?? periods.results[0]?.id ?? '';
    const period = known.includes(requested) ? requested : String(fallback);
    const days = isPeriod(period) ? WINDOWS[period] : WINDOWS['30j'];

    const byMonth = new Map(trendRows.results.map((row) => [String(row.ym), Number(row.n)]));
    const points = lastMonths(TREND_MONTHS).map((ym) => ({
      month: monthAbbrev(ym),
      views: byMonth.get(ym) ?? 0,
    }));

    const kpis = await kpiCounts(db, days);

    return json({
      periods: periods.results.map((row) => ({ id: String(row.id), label: String(row.label) })),
      defaultPeriod: String(fallback),
      period,
      kpis,
      leaderboard: leaderboard.results.map((row) => ({
        id: String(row.id),
        kind: String(row.kind),
        title: String(row.title),
        views: Number(row.views),
        // Only an avis is a link; a bilan's page is reached another way.
        articleId: row.article_id ? String(row.article_id) : undefined,
      })),
      trend: points,
      trendPeak: points.reduce(
        (peak, point) => (point.views > peak.views ? point : peak),
        points[0] ?? { month: '', views: 0 },
      ),
      drafts: drafts.results.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        kind: String(row.kind),
      })),
    });
  } catch {
    return dbUnavailable();
  }
};

interface KpiCard {
  key: string;
  label: string;
  value: number;
  deltaPct: number;
}

/**
 * The four KPI cards for a window `days` wide: the current window and the
 * immediately preceding one of equal length, one COUNT pair per signal.
 */
async function kpiCounts(db: D1Database, days: number): Promise<KpiCard[]> {
  const currentFrom = `-${days} days`;
  const previousFrom = `-${days * 2} days`;

  const statements: D1PreparedStatement[] = [
    db.prepare(`SELECT count(*) AS n FROM view_hits WHERE viewed_at >= datetime('now', ?)`).bind(currentFrom),
    db
      .prepare(
        `SELECT count(*) AS n FROM view_hits
          WHERE viewed_at >= datetime('now', ?) AND viewed_at < datetime('now', ?)`,
      )
      .bind(previousFrom, currentFrom),
    db.prepare(`SELECT count(*) AS n FROM likes WHERE created_at >= datetime('now', ?)`).bind(currentFrom),
    db
      .prepare(
        `SELECT count(*) AS n FROM likes
          WHERE created_at >= datetime('now', ?) AND created_at < datetime('now', ?)`,
      )
      .bind(previousFrom, currentFrom),
    // Approved only — the same rule the public pages enforce on every comment
    // count, so this KPI never claims credit for a pending or rejected message.
    db
      .prepare(
        `SELECT count(*) AS n FROM comments
          WHERE status = 'approved' AND created_at >= datetime('now', ?)`,
      )
      .bind(currentFrom),
    db
      .prepare(
        `SELECT count(*) AS n FROM comments
          WHERE status = 'approved'
            AND created_at >= datetime('now', ?) AND created_at < datetime('now', ?)`,
      )
      .bind(previousFrom, currentFrom),
    db.prepare(`SELECT count(*) AS n FROM share_hits WHERE created_at >= datetime('now', ?)`).bind(currentFrom),
    db
      .prepare(
        `SELECT count(*) AS n FROM share_hits
          WHERE created_at >= datetime('now', ?) AND created_at < datetime('now', ?)`,
      )
      .bind(previousFrom, currentFrom),
  ];

  const results = await db.batch<{ n: number }>(statements);

  return KPI_CARDS.map((card, index) => {
    const current = Number(results[index * 2]?.results[0]?.n ?? 0);
    const previous = Number(results[index * 2 + 1]?.results[0]?.n ?? 0);
    return { key: card.key, label: card.label, value: current, deltaPct: deltaPct(current, previous) };
  });
}

export const onRequest = getOnly(onRequestGet);
