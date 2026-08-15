/**
 * POST /api/newsletter/subscribe → 201 { subscribed: true }
 *
 * The one public write this feature exposes with a free-text field, so it
 * gets the same three cheapest-first guards `/api/comments` uses: a
 * honeypot, a minimum time-on-form, then a sliding window in `rate_hits`.
 * The first two answer 201 without writing anything — telling a bot which
 * check caught it tells it what to change.
 *
 * A (re)subscribe is an upsert: an address that already unsubscribed simply
 * comes back, with a fresh `subscribed_at` and a fresh token — the old
 * unsubscribe link stops working the moment someone resubscribes, which is
 * the right failure mode for a token tied to one HMAC per identity, not per
 * subscription event.
 */
import { BodyError, MalformedBody, email, readJson } from '../../_lib/body';
import { hmacSha256Hex } from '../../_lib/crypto';
import { ipHash } from '../../_lib/client-ip';
import { requireDb, requireIpSalt, requireUnsubSecret } from '../../_lib/env';
import {
  badRequest,
  created,
  dbUnavailable,
  misconfigured,
  postOnly,
  tooManyRequests,
  unprocessable,
} from '../../_lib/http';
import { allow, NEWSLETTER_SUBSCRIBE_WINDOW } from '../../_lib/rate-limit';
import { looksAutomated } from '../../_lib/spam-guard';
import { now } from '../../_lib/write';
import type { D1Database, Handler } from '../../types';

export const onRequestPost: Handler = async ({ request, env }) => {
  let db: D1Database;
  let ipSalt: string;
  let unsubSecret: string;
  try {
    db = requireDb(env);
    ipSalt = requireIpSalt(env);
    unsubSecret = requireUnsubSecret(env);
  } catch {
    return misconfigured();
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request, 4 * 1024);
  } catch (error) {
    if (error instanceof MalformedBody) return badRequest('corps');
    throw error;
  }

  // Guards 1 and 2, quietly: a 201 with nothing written either way.
  if (looksAutomated(body)) return created({ subscribed: true });

  let address: string;
  try {
    address = email(body, 'email', { max: 254 });
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    throw error;
  }

  try {
    // Guard 3, before the write: a refused caller should cost one query, not two.
    if (!(await allow(db, 'newsletter-subscribe', await ipHash(request, ipSalt), NEWSLETTER_SUBSCRIBE_WINDOW))) {
      return tooManyRequests();
    }

    const token = await hmacSha256Hex(unsubSecret, address);
    await db
      .prepare(
        `INSERT INTO newsletter_subscribers (email, status, subscribed_at, unsubscribed_at, unsubscribe_token)
         VALUES (?, 'subscribed', ?, NULL, ?)
         ON CONFLICT(email) DO UPDATE SET
           status = 'subscribed', subscribed_at = excluded.subscribed_at,
           unsubscribed_at = NULL, unsubscribe_token = excluded.unsubscribe_token`,
      )
      .bind(address, now(), token)
      .run();

    return created({ subscribed: true });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = postOnly(onRequestPost);
