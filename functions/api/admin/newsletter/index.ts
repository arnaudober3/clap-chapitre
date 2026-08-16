/**
 * GET /api/admin/newsletter → 200 { stats, sends, scheduled }
 *
 * The newsletter page in one request, mirroring `admin/dashboard.ts`'s
 * "whole page, one request" shape: the audience figures, the real send
 * history, and whatever is currently booked to go out later.
 *
 * `stats.monthDelta` is a net count over the trailing 30 days — gained minus
 * lost — not a percentage: `deltaPct()` in `_lib/audience.ts` answers a
 * different question (variation against the *previous* window of equal
 * length), and the mock this replaces always showed a signed absolute number
 * ("+38"), which a net count is and a ratio is not.
 *
 * Behind the admin JWT.
 */
import { requireAdmin } from '../../../_lib/admin';
import { WINDOWS } from '../../../_lib/audience';
import { requireDb } from '../../../_lib/env';
import { dbUnavailable, getOnly, json, misconfigured } from '../../../_lib/http';
import type { D1Database, Handler } from '../../../types';

/** How many sends "Derniers envois" shows. */
const SENDS_SHOWN = 20;

export const onRequestGet: Handler = async ({ request, env }) => {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;

  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  const since = `-${WINDOWS['30j']} days`;

  try {
    const [total, gained, lost, sends, scheduled] = await db.batch([
      db.prepare(`SELECT count(*) AS n FROM newsletter_subscribers WHERE status = 'subscribed'`),
      db
        .prepare(`SELECT count(*) AS n FROM newsletter_subscribers WHERE subscribed_at >= datetime('now', ?)`)
        .bind(since),
      db
        .prepare(`SELECT count(*) AS n FROM newsletter_subscribers WHERE unsubscribed_at >= datetime('now', ?)`)
        .bind(since),
      db
        .prepare(
          `SELECT id, bilan_id, title, subject, sent_at, recipient_count, failure_count
             FROM newsletter_sends
            WHERE status = 'sent'
            ORDER BY sent_at DESC
            LIMIT ?`,
        )
        .bind(SENDS_SHOWN),
      db.prepare(
        `SELECT bilan_id, subject, scheduled_at FROM newsletter_sends WHERE status = 'scheduled'`,
      ),
    ]);

    return json({
      stats: {
        total: Number(total.results[0]?.n ?? 0),
        monthDelta: Number(gained.results[0]?.n ?? 0) - Number(lost.results[0]?.n ?? 0),
      },
      sends: sends.results.map((row) => ({
        id: String(row.id),
        bilanId: String(row.bilan_id),
        title: String(row.title),
        subject: String(row.subject),
        sentAt: String(row.sent_at),
        recipientCount: Number(row.recipient_count ?? 0),
        failureCount: Number(row.failure_count ?? 0),
      })),
      scheduled: scheduled.results.map((row) => ({
        bilanId: String(row.bilan_id),
        subject: String(row.subject),
        scheduledAt: String(row.scheduled_at),
      })),
    });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = getOnly(onRequestGet);
