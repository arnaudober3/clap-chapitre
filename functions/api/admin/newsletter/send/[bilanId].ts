/**
 * POST /api/admin/newsletter/send/:bilanId → 201 { id, recipientCount, failureCount } | 404 | 409
 *
 * Sends the newsletter generated from one published bilan to every subscribed
 * address. The content is rebuilt from the bilan's *current* state rather than
 * anything frozen earlier — "the newsletter is generated from the bilan" holds
 * at send time too, so a typo fixed after scheduling goes out fixed.
 *
 * Refuses a second send of the same bilan (409): two admin tabs racing to hit
 * "Envoyer maintenant" should not blast the list twice. Sending also clears any
 * pending schedule for the same bilan — sending early makes a booking moot.
 *
 * Behind the admin JWT.
 */
import { BodyError, MalformedBody, readJson } from '../../../../_lib/body';
import { sendBatch } from '../../../../_lib/email';
import { conflict, created, dbUnavailable, notFound, postOnly, unprocessable } from '../../../../_lib/http';
import { readNewsletterSendInput } from '../../../../_lib/inputs';
import { requireNewsletterSendContext } from '../../../../_lib/newsletter-context';
import { buildEdition, renderEmailHtml, unsubscribeToken } from '../../../../_lib/newsletter-email';
import { now, slug, uniqueIdIn } from '../../../../_lib/write';
import type { Handler } from '../../../../types';

export const onRequestPost: Handler = async ({ request, env, params }) => {
  const ctx = await requireNewsletterSendContext(request, env, params);
  if (ctx instanceof Response) return ctx;
  const { bilanId, db, apiKey, from, unsubSecret } = ctx;

  let subject: string;
  try {
    subject = readNewsletterSendInput(await readJson(request)).subject;
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return unprocessable('corps');
    throw error;
  }

  try {
    const bilan = await db
      .prepare(`SELECT * FROM bilans WHERE id = ? AND status = 'published'`)
      .bind(bilanId)
      .first();
    if (!bilan) return notFound();

    const already = await db
      .prepare(`SELECT 1 AS found FROM newsletter_sends WHERE bilan_id = ? AND status = 'sent'`)
      .bind(bilanId)
      .first();
    if (already) return conflict('Cette édition a déjà été envoyée.');

    const avis = await db
      .prepare(
        `SELECT a.id, a.medium, a.title, a.hook, a.excerpt, a.cover
           FROM bilan_avis ba
           JOIN articles a ON a.id = ba.article_id
          WHERE ba.bilan_id = ? AND a.status = 'published'
          ORDER BY ba.position`,
      )
      .bind(bilanId)
      .all();

    const siteOrigin = new URL(request.url).origin;
    const edition = buildEdition(bilan, avis.results, siteOrigin);
    const bilanUrl = `${siteOrigin}/bilan-culturel?mois=${bilanId}`;

    const subscribers = await db
      .prepare(`SELECT email FROM newsletter_subscribers WHERE status = 'subscribed'`)
      .all<{ email: string }>();

    const messages = await Promise.all(
      subscribers.results.map(async (row) => {
        const token = await unsubscribeToken(row.email, unsubSecret);
        const unsubscribeUrl = `${siteOrigin}/desinscription?token=${token}`;
        return {
          to: row.email,
          subject,
          html: renderEmailHtml(edition, unsubscribeUrl, bilanUrl),
        };
      }),
    );

    const { sent, failed } = await sendBatch(apiKey, from, messages);

    const id = await uniqueIdIn(db, 'newsletter_sends', slug(subject) || 'newsletter');
    await db.batch([
      db
        .prepare(
          `INSERT INTO newsletter_sends
             (id, bilan_id, subject, title, status, sent_at, recipient_count, failure_count)
           VALUES (?, ?, ?, ?, 'sent', ?, ?, ?)`,
        )
        .bind(id, bilanId, subject, edition.title, now(), sent, failed),
      db.prepare(`DELETE FROM newsletter_sends WHERE bilan_id = ? AND status = 'scheduled'`).bind(bilanId),
    ]);

    return created({ id, recipientCount: sent, failureCount: failed });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = postOnly(onRequestPost);
