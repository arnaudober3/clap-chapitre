/**
 * GET /api/admin/dashboard?period=30j → 200 { periods, defaultPeriod, kpis, leaderboard, trend, drafts }
 *
 * The whole tableau de bord in one request: six cards, six queries, one
 * round-trip. Changing the reporting period refetches the lot — a rare action,
 * and splitting the endpoint per card would trade one request for six on the
 * page that opens first.
 *
 * The rule that shapes this handler: anything the content tables can answer,
 * they answer. The leaderboard, the drafts list and the trend's peak are
 * computed here. The KPI figures and the trend points are stored, because they
 * are windowed aggregates over audience events this database does not record —
 * and inventing them from `views` would be a chart that lies.
 *
 * An unknown `period` falls back to the default rather than 400: the parameter
 * comes from a dropdown, and a stale bookmark should show the dashboard, not an
 * error.
 *
 * Behind the admin JWT.
 */
import { requireAdmin } from '../../_lib/admin';
import { requireDb } from '../../_lib/env';
import { dbUnavailable, getOnly, json, misconfigured } from '../../_lib/http';
import type { D1Database, Handler } from '../../types';

/** The leaderboard shows five rows, as the design does. */
const LEADERBOARD_SIZE = 5;

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
    const [periods, kpis, leaderboard, trend, drafts] = await db.batch([
      db.prepare('SELECT id, label, position, is_default FROM stat_periods ORDER BY position'),
      db.prepare('SELECT period_id, key, label, value, delta_pct FROM stat_kpis ORDER BY position'),
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
      db.prepare('SELECT month_label, views FROM stat_trend ORDER BY position'),
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

    const points = trend.results.map((row) => ({
      month: String(row.month_label),
      views: Number(row.views),
    }));

    return json({
      periods: periods.results.map((row) => ({ id: String(row.id), label: String(row.label) })),
      defaultPeriod: String(fallback),
      period,
      kpis: kpis.results
        .filter((row) => row.period_id === period)
        .map((row) => ({
          key: String(row.key),
          label: String(row.label),
          value: Number(row.value),
          deltaPct: Number(row.delta_pct),
        })),
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

export const onRequest = getOnly(onRequestGet);
