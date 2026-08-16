/**
 * POST /api/admin/newsletter/dispatch → 200 { dispatched, failed }
 *
 * Fires every scheduled send whose time has come. Not behind the admin JWT —
 * the caller is a machine, the standalone `cron-newsletter/` Worker on a
 * timer, not a signed-in editor — but behind an `X-Cron-Secret` header,
 * compared in constant time against `CRON_SECRET`.
 *
 * Selects every `'scheduled'` row already due, not just one: a missed or
 * coarse cron tick should not silently lose a send. A bilan that was
 * unpublished or deleted between scheduling and firing is marked `'failed'`
 * rather than crashing the whole batch.
 */
import { requireDb, requireCronSecret, requireNewsletterFrom, requireResendKey, requireUnsubSecret } from '../../../_lib/env';
import { sendBatch } from '../../../_lib/email';
import { dbUnavailable, json, misconfigured, postOnly, unauthorized } from '../../../_lib/http';
import { buildEdition, renderEmailHtml, unsubscribeToken } from '../../../_lib/newsletter-email';
import { timingSafeEqualHex } from '../../../_lib/crypto';
import { now } from '../../../_lib/write';
import type { D1Database, Handler } from '../../../types';

export const onRequestPost: Handler = async ({ request, env }) => {
  let db: D1Database;
  let cronSecret: string;
  let apiKey: string;
  let from: string;
  let unsubSecret: string;
  try {
    db = requireDb(env);
    cronSecret = requireCronSecret(env);
    apiKey = requireResendKey(env);
    from = requireNewsletterFrom(env);
    unsubSecret = requireUnsubSecret(env);
  } catch {
    return misconfigured();
  }

  const presented = request.headers.get('x-cron-secret') ?? '';
  if (!timingSafeEqualHex(presented, cronSecret)) return unauthorized();

  try {
    const due = await db
      .prepare(
        `SELECT id, bilan_id, subject
           FROM newsletter_sends
          WHERE status = 'scheduled' AND scheduled_at <= datetime('now')`,
      )
      .all<{ id: string; bilan_id: string; subject: string }>();

    const siteOrigin = new URL(request.url).origin;
    let dispatched = 0;
    let failed = 0;

    for (const row of due.results) {
      const bilan = await db
        .prepare(`SELECT * FROM bilans WHERE id = ? AND status = 'published'`)
        .bind(row.bilan_id)
        .first();

      if (!bilan) {
        // Clearing scheduled_at alongside the status is required, not tidy:
        // the CHECK pairs `status = 'scheduled'` with `scheduled_at IS NOT
        // NULL AND sent_at IS NULL`, and a 'failed' row that kept its old
        // scheduled_at would still match that shape with neither timestamp
        // freshly set, aborting the UPDATE.
        await db
          .prepare(`UPDATE newsletter_sends SET status = 'failed', scheduled_at = NULL WHERE id = ?`)
          .bind(row.id)
          .run();
        failed += 1;
        continue;
      }

      const avis = await db
        .prepare(
          `SELECT a.id, a.medium, a.title, a.hook, a.excerpt, a.cover
             FROM bilan_avis ba
             JOIN articles a ON a.id = ba.article_id
            WHERE ba.bilan_id = ? AND a.status = 'published'
            ORDER BY ba.position`,
        )
        .bind(row.bilan_id)
        .all();

      const edition = buildEdition(bilan, avis.results, siteOrigin);
      const bilanUrl = `${siteOrigin}/bilan-culturel?mois=${row.bilan_id}`;

      const subscribers = await db
        .prepare(`SELECT email FROM newsletter_subscribers WHERE status = 'subscribed'`)
        .all<{ email: string }>();

      const messages = await Promise.all(
        subscribers.results.map(async (subscriber) => {
          const token = await unsubscribeToken(subscriber.email, unsubSecret);
          const unsubscribeUrl = `${siteOrigin}/desinscription?token=${token}`;
          return {
            to: subscriber.email,
            subject: row.subject,
            html: renderEmailHtml(edition, unsubscribeUrl, bilanUrl),
          };
        }),
      );

      const { sent, failed: chunkFailed } = await sendBatch(apiKey, from, messages);

      await db
        .prepare(
          `UPDATE newsletter_sends
              SET status = 'sent', sent_at = ?, recipient_count = ?, failure_count = ?
            WHERE id = ?`,
        )
        .bind(now(), sent, chunkFailed, row.id)
        .run();

      dispatched += 1;
    }

    return json({ dispatched, failed });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = postOnly(onRequestPost);
