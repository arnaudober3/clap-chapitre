/**
 * POST   /api/admin/newsletter/schedule/:bilanId → 201 { scheduledAt } | 404 | 409 | 422
 * DELETE /api/admin/newsletter/schedule/:bilanId → 204 | 404
 *
 * Books (or cancels) a future send. The date/time the editor types is
 * Europe/Paris local — `parisToUtcInstant` converts it before it ever touches
 * `scheduled_at`, so the cron Worker comparing against `datetime('now')` (UTC)
 * fires at the moment a French reader actually means.
 *
 * At most one active schedule per bilan (`idx_newsletter_sends_one_scheduled_per_bilan`);
 * a POST re-booking the same bilan updates that row rather than creating a
 * second one — matching the UI's one-slot-per-source model.
 *
 * Behind the admin JWT.
 */
import { requireAdmin } from '../../../../_lib/admin';
import { BodyError, MalformedBody, readJson } from '../../../../_lib/body';
import { requireDb } from '../../../../_lib/env';
import {
  conflict,
  created,
  dbUnavailable,
  misconfigured,
  noContent,
  notFound,
  route,
  unprocessable,
} from '../../../../_lib/http';
import { readNewsletterScheduleInput } from '../../../../_lib/inputs';
import { parisToUtcInstant } from '../../../../_lib/schedule';
import { changes, now, slug, uniqueIdIn } from '../../../../_lib/write';
import type { D1Database, Env, FunctionContext, Handler } from '../../../../types';

async function requireScheduleContext(
  request: Request,
  env: Env,
  params: FunctionContext['params'],
): Promise<{ bilanId: string; db: D1Database } | Response> {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;

  const bilanId = typeof params?.bilanId === 'string' ? params.bilanId : '';
  if (!bilanId) return notFound();

  try {
    return { bilanId, db: requireDb(env) };
  } catch {
    return misconfigured();
  }
}

export const onRequestPost: Handler = async ({ request, env, params }) => {
  const ctx = await requireScheduleContext(request, env, params);
  if (ctx instanceof Response) return ctx;
  const { bilanId, db } = ctx;

  let subject: string;
  let date: string;
  let time: string;
  try {
    const input = readNewsletterScheduleInput(await readJson(request));
    subject = input.subject;
    date = input.date;
    time = input.time;
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return unprocessable('corps');
    throw error;
  }

  const scheduledAt = parisToUtcInstant(date, time);
  if (scheduledAt <= now()) return unprocessable('date');

  try {
    const bilan = await db
      .prepare(`SELECT title FROM bilans WHERE id = ? AND status = 'published'`)
      .bind(bilanId)
      .first<{ title: string }>();
    if (!bilan) return notFound();

    const alreadySent = await db
      .prepare(`SELECT 1 AS found FROM newsletter_sends WHERE bilan_id = ? AND status = 'sent'`)
      .bind(bilanId)
      .first();
    if (alreadySent) return conflict('Cette édition a déjà été envoyée.');

    const existing = await db
      .prepare(`SELECT id FROM newsletter_sends WHERE bilan_id = ? AND status = 'scheduled'`)
      .bind(bilanId)
      .first<{ id: string }>();

    if (existing) {
      await db
        .prepare(`UPDATE newsletter_sends SET subject = ?, title = ?, scheduled_at = ? WHERE id = ?`)
        .bind(subject, bilan.title, scheduledAt, existing.id)
        .run();
    } else {
      const id = await uniqueIdIn(db, 'newsletter_sends', slug(subject) || 'newsletter');
      await db
        .prepare(
          `INSERT INTO newsletter_sends (id, bilan_id, subject, title, status, scheduled_at)
           VALUES (?, ?, ?, ?, 'scheduled', ?)`,
        )
        .bind(id, bilanId, subject, bilan.title, scheduledAt)
        .run();
    }

    return created({ scheduledAt });
  } catch {
    return dbUnavailable();
  }
};

export const onRequestDelete: Handler = async ({ request, env, params }) => {
  const ctx = await requireScheduleContext(request, env, params);
  if (ctx instanceof Response) return ctx;
  const { bilanId, db } = ctx;

  try {
    const result = await db
      .prepare(`DELETE FROM newsletter_sends WHERE bilan_id = ? AND status = 'scheduled'`)
      .bind(bilanId)
      .run();
    if (changes(result.meta) === 0) return notFound();

    return noContent();
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = route({ POST: onRequestPost, DELETE: onRequestDelete });
