/**
 * POST /api/shares → 201 { recorded: true }
 *
 * Records a click on a share destination — a channel link or "Copier le
 * lien" — for an avis or a bilan. The one public write with no free-text
 * field, so there is nothing to spam: no honeypot, no minimum delay, just a
 * crawler check and the same sliding window every other public write uses.
 *
 * Answers 201 without writing anything for a crawler UA, the same
 * non-committal shape `/api/comments` uses for its own guards — telling a
 * bot which check caught it tells it what to change.
 */
import { BodyError, MalformedBody, oneOf, readJson, text } from '../_lib/body';
import { isCrawler } from '../_lib/audience';
import { ipHash } from '../_lib/client-ip';
import { requireDb, requireIpSalt } from '../_lib/env';
import {
  badRequest,
  created,
  dbUnavailable,
  misconfigured,
  postOnly,
  tooManyRequests,
  unprocessable,
} from '../_lib/http';
import { allow, SHARE_WINDOW } from '../_lib/rate-limit';
import type { D1Database, Handler } from '../types';

const TARGETS = ['article', 'bilan'] as const;
const CHANNELS = ['facebook', 'x', 'whatsapp', 'email', 'copy'] as const;

export const onRequestPost: Handler = async ({ request, env }) => {
  let db: D1Database;
  let salt: string;
  try {
    db = requireDb(env);
    salt = requireIpSalt(env);
  } catch {
    return misconfigured();
  }

  if (isCrawler(request.headers.get('user-agent'))) return created({ recorded: true });

  let targetType: (typeof TARGETS)[number];
  let targetId: string;
  let channel: (typeof CHANNELS)[number];
  try {
    const body = await readJson(request, 2 * 1024);
    targetType = oneOf(body, 'targetType', TARGETS);
    targetId = text(body, 'targetId', { max: 100 });
    channel = oneOf(body, 'channel', CHANNELS);
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return badRequest('corps');
    throw error;
  }

  try {
    if (!(await allow(db, 'share', await ipHash(request, salt), SHARE_WINDOW))) {
      return tooManyRequests();
    }

    const table = targetType === 'article' ? 'articles' : 'bilans';
    const target = await db
      .prepare(`SELECT 1 AS found FROM ${table} WHERE id = ? AND status = 'published'`)
      .bind(targetId)
      .first();
    if (!target) return unprocessable('targetId');

    await db
      .prepare(
        `INSERT INTO share_hits (target_type, target_id, channel, created_at)
         VALUES (?, ?, ?, datetime('now'))`,
      )
      .bind(targetType, targetId, channel)
      .run();

    return created({ recorded: true });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = postOnly(onRequestPost);
