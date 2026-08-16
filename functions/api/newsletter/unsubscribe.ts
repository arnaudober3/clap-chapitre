/**
 * POST /api/newsletter/unsubscribe → 200 { unsubscribed: true } | 404
 *
 * No honeypot, no timing window, no rate limit: the token itself is the
 * unguessable credential a bot would have to already hold, so there is
 * nothing here for a script to gain by hammering the endpoint.
 *
 * Idempotent — clicking an already-unsubscribed link is still a 200, not an
 * error, because from the visitor's side both mean the same thing: "I am not
 * on this list."
 *
 * Reached from `/desinscription?token=...`, a plain link with no side effect
 * of its own (email scanners prefetch links); the SPA page performs this POST
 * on mount.
 */
import { BodyError, MalformedBody, readJson, text } from '../../_lib/body';
import { requireDb } from '../../_lib/env';
import { badRequest, dbUnavailable, json, misconfigured, notFound, postOnly, unprocessable } from '../../_lib/http';
import { changes, now } from '../../_lib/write';
import type { D1Database, Handler } from '../../types';

export const onRequestPost: Handler = async ({ request, env }) => {
  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  let token: string;
  try {
    token = text(await readJson(request, 1024), 'token', { max: 64 });
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return badRequest('corps');
    throw error;
  }

  try {
    const result = await db
      .prepare(
        `UPDATE newsletter_subscribers
            SET status = 'unsubscribed', unsubscribed_at = coalesce(unsubscribed_at, ?)
          WHERE unsubscribe_token = ?`,
      )
      .bind(now(), token)
      .run();
    if (changes(result.meta) === 0) return notFound();

    return json({ unsubscribed: true });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = postOnly(onRequestPost);
