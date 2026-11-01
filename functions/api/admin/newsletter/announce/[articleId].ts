/**
 * POST /api/admin/newsletter/announce/:articleId
 *   → 201 { recipientCount, failureCount, sentAt } | 404 | 409 | 502
 *
 * Tells every subscribed address that one avis is out. Never fired by a save:
 * the editor ticks « Prévenir les abonné·es » and the form calls this *after*
 * the avis is stored and published — so a misclick on Publier mails nobody,
 * and a failed send never fails a save.
 *
 * At most once per avis, unpublish/republish included. The slot is claimed
 * before anything leaves (`INSERT OR IGNORE` on `article_announcements`'s
 * primary key), so two tabs racing get one send and one 409. Only a send where
 * *nothing* went out gives the slot back, so the editor can retry; a partial
 * one keeps it — re-sending would mail twice everyone who already got it.
 *
 * Behind the admin JWT.
 */
import { sendBatch } from '../../../../_lib/email';
import { conflict, created, dbUnavailable, json, notFound, postOnly } from '../../../../_lib/http';
import { requireNewsletterSendContext } from '../../../../_lib/newsletter-context';
import {
  buildAvisAnnouncement,
  renderAvisEmailHtml,
  unsubscribeToken,
} from '../../../../_lib/newsletter-email';
import { changes, now } from '../../../../_lib/write';
import type { Handler } from '../../../../types';

export const onRequestPost: Handler = async ({ request, env, params }) => {
  const ctx = await requireNewsletterSendContext(request, env, params, 'articleId');
  if (ctx instanceof Response) return ctx;
  const { id: articleId, db, apiKey, from, unsubSecret } = ctx;

  try {
    const article = await db
      .prepare(
        `SELECT id, medium, title, hook, excerpt, cover
           FROM articles WHERE id = ? AND status = 'published'`,
      )
      .bind(articleId)
      .first();
    if (!article) return notFound();

    const siteOrigin = new URL(request.url).origin;
    const announcement = buildAvisAnnouncement(article, siteOrigin);
    const sentAt = now();

    const claim = await db
      .prepare(
        `INSERT OR IGNORE INTO article_announcements (article_id, subject, title, sent_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(articleId, announcement.subject, announcement.title, sentAt)
      .run();
    if (changes(claim.meta ?? {}) === 0) return conflict('Cet avis a déjà été annoncé.');

    const subscribers = await db
      .prepare(`SELECT email FROM newsletter_subscribers WHERE status = 'subscribed'`)
      .all<{ email: string }>();

    const messages = await Promise.all(
      subscribers.results.map(async (row) => {
        const token = await unsubscribeToken(row.email, unsubSecret);
        return {
          to: row.email,
          subject: announcement.subject,
          html: renderAvisEmailHtml(announcement, `${siteOrigin}/desinscription?token=${token}`),
        };
      }),
    );

    const { sent, failed } = await sendBatch(apiKey, from, messages);

    if (sent === 0 && failed > 0) {
      await db.prepare('DELETE FROM article_announcements WHERE article_id = ?').bind(articleId).run();
      return json({ error: "L'annonce n'a pu être envoyée à personne." }, 502);
    }

    await db
      .prepare(
        `UPDATE article_announcements SET recipient_count = ?, failure_count = ? WHERE article_id = ?`,
      )
      .bind(sent, failed, articleId)
      .run();

    return created({ recipientCount: sent, failureCount: failed, sentAt });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = postOnly(onRequestPost);
