/**
 * GET /api/likes?targetType=X&targetId=Y → 200 { liked }
 *
 * Checks whether this caller has liked a target (avis, bilan or comment),
 * without modifying the state. Answers true if a row exists for this IP hash.
 *
 * POST /api/likes → 200 { likes, liked }
 *
 * Toggles a ♡ on an avis, a bilan or a comment, and answers the new count plus
 * whether this caller is now among it — the heart's two pieces of state, in one
 * round trip.
 *
 * One like per address, deduplicated through `likes`, which is why the displayed
 * counter is *recomputed* from that table on every toggle rather than
 * incremented. An increment can be replayed by a double click, a retry or a
 * reload; a recount cannot drift from the rows it counts.
 *
 * The address is never stored — only its salted digest. See `_lib/client-ip.ts`.
 */
import { BodyError, MalformedBody, oneOf, readJson, text } from '../_lib/body';
import { ipHash } from '../_lib/client-ip';
import { requireDb, requireIpSalt } from '../_lib/env';
import {
  badRequest,
  dbUnavailable,
  getOnly,
  json,
  misconfigured,
  postOnly,
  unprocessable,
} from '../_lib/http';
import type { D1Database, Handler } from '../types';

const TARGETS = ['article', 'bilan', 'comment'] as const;
type Target = (typeof TARGETS)[number];

/** Which table carries the displayed counter for each target. */
const TABLES: Readonly<Record<Target, string>> = {
  article: 'articles',
  bilan: 'bilans',
  comment: 'comments',
};

export const onRequestPost: Handler = async ({ request, env }) => {
  let db: D1Database;
  let salt: string;
  try {
    db = requireDb(env);
    salt = requireIpSalt(env);
  } catch {
    // Without the salt there is no dedup, and a counter anyone can raise without
    // limit is worse than no counter. Refuse rather than degrade.
    return misconfigured();
  }

  let targetType: Target;
  let targetId: string;
  try {
    const body = await readJson(request, 2 * 1024);
    targetType = oneOf(body, 'targetType', TARGETS);
    targetId = text(body, 'targetId', { max: 100 });
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return badRequest('corps');
    throw error;
  }

  const table = TABLES[targetType];

  try {
    // The target has to exist, and `likes` has no foreign key to say so — its
    // target is polymorphic across three tables.
    const target = await db
      .prepare(`SELECT 1 AS found FROM ${table} WHERE id = ?`)
      .bind(targetId)
      .first();
    if (!target) return unprocessable('targetId');

    const hash = await ipHash(request, salt);
    const existing = await db
      .prepare('SELECT 1 AS liked FROM likes WHERE target_type = ? AND target_id = ? AND ip_hash = ?')
      .bind(targetType, targetId, hash)
      .first();

    const liked = !existing;
    await db.batch([
      liked
        ? db
            .prepare('INSERT INTO likes (target_type, target_id, ip_hash) VALUES (?, ?, ?)')
            .bind(targetType, targetId, hash)
        : db
            .prepare('DELETE FROM likes WHERE target_type = ? AND target_id = ? AND ip_hash = ?')
            .bind(targetType, targetId, hash),
      // Recomputed, never `likes + 1`. This statement is the reason a replayed
      // request is harmless.
      db
        .prepare(
          `UPDATE ${table}
              SET likes = (SELECT count(*) FROM likes
                            WHERE target_type = ? AND target_id = ?)
            WHERE id = ?`,
        )
        .bind(targetType, targetId, targetId),
    ]);

    const row = await db
      .prepare(`SELECT likes FROM ${table} WHERE id = ?`)
      .bind(targetId)
      .first<{ likes: number }>();

    return json({ likes: Number(row?.likes ?? 0), liked });
  } catch {
    return dbUnavailable();
  }
};

export const onRequestGet: Handler = async ({ request, env }) => {
  let db: D1Database;
  let salt: string;
  try {
    db = requireDb(env);
    salt = requireIpSalt(env);
  } catch {
    return misconfigured();
  }

  const url = new URL(request.url);
  const targetType = url.searchParams.get('targetType');
  const targetId = url.searchParams.get('targetId');

  if (!targetType || !TARGETS.includes(targetType as Target)) {
    return badRequest('targetType');
  }
  if (!targetId) {
    return badRequest('targetId');
  }

  try {
    const hash = await ipHash(request, salt);
    const existing = await db
      .prepare('SELECT 1 AS liked FROM likes WHERE target_type = ? AND target_id = ? AND ip_hash = ?')
      .bind(targetType, targetId, hash)
      .first();

    return json({ liked: !!existing });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest: Handler = async (context) => {
  const { request } = context;
  if (request.method === 'GET') return onRequestGet(context);
  if (request.method === 'POST') return onRequestPost(context);
  return new Response('Method not allowed', { status: 405 });
};
