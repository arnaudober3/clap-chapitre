/**
 * POST /api/comments → 201 { queued: true }
 *
 * The one endpoint an anonymous visitor can write through, which is what makes
 * it the one that needs defending. Four guards, cheapest first, and none of them
 * is the last word — the comment lands in 'pending' and is invisible until the
 * editor releases it. That is the guard that actually holds; the rest exist so
 * the queue stays a queue rather than a spam folder.
 *
 *   1. honeypot — a field no human sees, filled in by form-filling bots
 *   2. minimum delay — a form submitted faster than it can be read
 *   3. sliding window — five per quarter hour per address (`rate_hits`)
 *   4. coherence — the target exists, and a reply matches its parent
 *
 * The first two answer 201 without writing anything. Telling a bot which check
 * caught it is telling it what to change.
 */
import { BodyError, MalformedBody, oneOf, optionalText, readJson, text } from '../_lib/body';
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
import { allow, COMMENT_WINDOW } from '../_lib/rate-limit';
import { commentId, today } from '../_lib/write';
import type { D1Database, Handler } from '../types';

const TARGETS = ['article', 'bilan'] as const;

/**
 * How long a form must have been on screen. Three seconds is under the time it
 * takes to read the label and type a name, and well over a script's round trip.
 */
const MIN_SECONDS = 3;

/**
 * And how long it may plausibly have been there. Twelve hours covers a tab left
 * open overnight; anything beyond is a fabricated stamp, not a slow reader.
 */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const onRequestPost: Handler = async ({ request, env }) => {
  let db: D1Database;
  let salt: string;
  try {
    db = requireDb(env);
    salt = requireIpSalt(env);
  } catch {
    // A missing salt is a misconfigured deployment, not an open door: without it
    // there is no rate limit, so the endpoint refuses rather than running unguarded.
    return misconfigured();
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request, 16 * 1024);
  } catch (error) {
    if (error instanceof MalformedBody) return badRequest('corps');
    throw error;
  }

  // Guard 1. The field is rendered off-screen and left empty by anyone who can
  // see the form. A 201 with nothing written is the quiet answer.
  if (typeof body.trap === 'string' && body.trap.trim() !== '') return created({ queued: true });

  // Guard 2. `openedAt` is stamped when the composer mounts, and the stamp has
  // to be *plausible* rather than merely old enough. `Number(null)` is 0, which
  // reads as "opened at the epoch" and would walk straight through a lower
  // bound alone — so the window is closed at both ends: nothing from the
  // future, nothing older than a session could reasonably be.
  const openedAt = Number(body.openedAt);
  const age = Date.now() - openedAt;
  if (!Number.isFinite(openedAt) || age < MIN_SECONDS * 1000 || age > MAX_AGE_MS) {
    return created({ queued: true });
  }

  let targetType: (typeof TARGETS)[number];
  let targetId: string;
  let author: string;
  let content: string;
  let parentId: string | undefined;
  try {
    targetType = oneOf(body, 'targetType', TARGETS);
    targetId = text(body, 'targetId', { max: 100 });
    author = text(body, 'author', { max: 80 });
    content = text(body, 'body', { max: 4000 });
    parentId = optionalText(body, 'parentId', { max: 100 });
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    throw error;
  }

  try {
    // Guard 3, before any read of the content tables: a refused caller should
    // cost one query, not four.
    if (!(await allow(db, 'comment', await ipHash(request, salt), COMMENT_WINDOW))) {
      return tooManyRequests();
    }

    // Guard 4. The target must exist and be visible — commenting on an unpublished
    // draft would be commenting on something the visitor cannot have read.
    const table = targetType === 'article' ? 'articles' : 'bilans';
    const target = await db
      .prepare(`SELECT 1 AS found FROM ${table} WHERE id = ? AND status = 'published'`)
      .bind(targetId)
      .first();
    if (!target) return unprocessable('targetId');

    if (parentId) {
      // The triggers enforce both of these on INSERT, but as an abort that
      // surfaces as a 503. Checking here names the field instead.
      const parent = await db
        .prepare(
          `SELECT parent_id FROM comments
            WHERE id = ? AND target_type = ? AND target_id = ? AND status = 'approved'`,
        )
        .bind(parentId, targetType, targetId)
        .first<{ parent_id: string | null }>();
      // A reply to a reply is refused rather than reparented: the thread renders
      // one level, and silently moving it would put the answer under the wrong
      // comment.
      if (!parent || parent.parent_id) return unprocessable('parentId');
    }

    await db
      .prepare(
        `INSERT INTO comments
           (id, target_type, target_id, parent_id, author, is_author, body,
            comment_date, status, created_at, position)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'pending', datetime('now'),
                 (SELECT coalesce(max(position), -1) + 1 FROM comments
                   WHERE target_type = ? AND target_id = ?))`,
      )
      .bind(
        await commentId(db, author),
        targetType,
        targetId,
        parentId ?? null,
        author,
        content,
        today(),
        targetType,
        targetId,
      )
      .run();

    // Deliberately not the created row: nothing may render it yet, and handing
    // it back would invite a client to do exactly that.
    return created({ queued: true });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = postOnly(onRequestPost);
