/**
 * POST /api/admin/newsletter/announce-test/:articleId { email } → 200 { sent: true } | 404 | 502
 *
 * A proof of an avis' announcement to one private address. Writes nothing:
 * it neither appears in "Derniers envois" nor uses up the avis' one real
 * announcement. A draft can be proofed too — checking the e-mail before
 * publishing is the point. Same footer caveat as `test/[bilanId].ts`.
 *
 * Local and Preview only: without `NEWSLETTER_TEST_SENDS=1` the route answers
 * 404, as if it did not exist — production has no proof copies.
 *
 * Behind the admin JWT.
 */
import { BodyError, MalformedBody, readJson } from '../../../../_lib/body';
import { sendOne } from '../../../../_lib/email';
import { testSendsEnabled } from '../../../../_lib/env';
import { dbUnavailable, json, notFound, postOnly, unprocessable } from '../../../../_lib/http';
import { readAnnounceTestInput } from '../../../../_lib/inputs';
import { requireNewsletterSendContext } from '../../../../_lib/newsletter-context';
import {
  buildAvisAnnouncement,
  renderAvisEmailHtml,
  unsubscribeToken,
} from '../../../../_lib/newsletter-email';
import type { Handler } from '../../../../types';

export const onRequestPost: Handler = async ({ request, env, params }) => {
  if (!testSendsEnabled(env)) return notFound();

  const ctx = await requireNewsletterSendContext(request, env, params, 'articleId');
  if (ctx instanceof Response) return ctx;
  const { id: articleId, db, apiKey, from, unsubSecret } = ctx;

  let testAddress: string;
  try {
    testAddress = readAnnounceTestInput(await readJson(request)).email;
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return unprocessable('corps');
    throw error;
  }

  try {
    const article = await db
      .prepare(`SELECT id, medium, title, hook, excerpt, cover FROM articles WHERE id = ?`)
      .bind(articleId)
      .first();
    if (!article) return notFound();

    const siteOrigin = new URL(request.url).origin;
    const announcement = buildAvisAnnouncement(article, siteOrigin);
    const token = await unsubscribeToken(testAddress, unsubSecret);

    const ok = await sendOne(apiKey, from, {
      to: testAddress,
      subject: announcement.subject,
      html: renderAvisEmailHtml(announcement, `${siteOrigin}/desinscription?token=${token}`),
    });
    if (!ok) return json({ error: "L'envoi du test a échoué." }, 502);

    return json({ sent: true });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = postOnly(onRequestPost);
