/**
 * POST /api/admin/newsletter/test/:bilanId → 200 { sent: true } | 404 | 502
 *
 * A proof of the edition to one private address. Writes nothing to
 * `newsletter_sends` — "Derniers envois" is real send history, and a test
 * blast is noise that does not belong in it. The test address' footer
 * unsubscribe link is real HTML but inert in practice: a test recipient is
 * never a row in `newsletter_subscribers`, so the link 404s if followed,
 * which is an acceptable, minor caveat for a proof copy.
 *
 * Behind the admin JWT.
 */
import { BodyError, MalformedBody, readJson } from '../../../../_lib/body';
import { sendOne } from '../../../../_lib/email';
import { dbUnavailable, json, notFound, postOnly, unprocessable } from '../../../../_lib/http';
import { readNewsletterTestInput } from '../../../../_lib/inputs';
import { requireNewsletterSendContext } from '../../../../_lib/newsletter-context';
import { buildEdition, renderEmailHtml, unsubscribeToken } from '../../../../_lib/newsletter-email';
import type { Handler } from '../../../../types';

export const onRequestPost: Handler = async ({ request, env, params }) => {
  const ctx = await requireNewsletterSendContext(request, env, params);
  if (ctx instanceof Response) return ctx;
  const { bilanId, db, apiKey, from, unsubSecret } = ctx;

  let subject: string;
  let testAddress: string;
  try {
    const input = readNewsletterTestInput(await readJson(request));
    subject = input.subject;
    testAddress = input.email;
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
    const token = await unsubscribeToken(testAddress, unsubSecret);
    const unsubscribeUrl = `${siteOrigin}/desinscription?token=${token}`;

    const ok = await sendOne(apiKey, from, {
      to: testAddress,
      subject,
      html: renderEmailHtml(edition, unsubscribeUrl, bilanUrl),
    });
    if (!ok) return json({ error: "L'envoi du test a échoué." }, 502);

    return json({ sent: true });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = postOnly(onRequestPost);
