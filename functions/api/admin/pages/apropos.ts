/**
 * PUT /api/admin/pages/apropos → 200 { ok: true }
 *
 * The "À propos" page, saved whole. There is no POST: the row is `id = 1` by
 * constraint, so creating and updating are the same act, and the endpoint
 * upserts rather than making the client know which one it is doing — an empty
 * database is exactly the case where the editor first opens this form.
 *
 * Behind the admin JWT; the *reading* half stays public on /api/pages/apropos.
 */
import { requireAdmin } from '../../../_lib/admin';
import { BodyError, MalformedBody, readJson } from '../../../_lib/body';
import { requireBucket, requireDb } from '../../../_lib/env';
import {
  badRequest,
  dbUnavailable,
  json,
  misconfigured,
  route,
  unprocessable,
} from '../../../_lib/http';
import { readAproposInput } from '../../../_lib/inputs';
import { forget } from '../../../_lib/media';
import { now } from '../../../_lib/write';
import type { D1Database, Handler } from '../../../types';

const COLUMNS = [
  'eyebrow',
  'greeting',
  'name',
  'intro',
  'portrait_image',
  'bio',
  'bio_emphasis',
  'quote',
  'stats_title',
  'follow_title',
  'follow_copy',
  'follow_cta',
  'follow_to',
  'updated_at',
] as const;

export const onRequestPut: Handler = async ({ request, env }) => {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;

  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  let input: ReturnType<typeof readAproposInput>;
  try {
    input = readAproposInput(await readJson(request));
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return badRequest('corps');
    throw error;
  }

  try {
    const existing = await db
      .prepare('SELECT portrait_image FROM page_apropos WHERE id = 1')
      .first<{ portrait_image: string }>();

    const columns = ['id', ...COLUMNS];
    await db.batch([
      db
        .prepare(
          `INSERT OR REPLACE INTO page_apropos (${columns.join(', ')})
           VALUES (${columns.map(() => '?').join(', ')})`,
        )
        .bind(
          1,
          input.eyebrow,
          input.greeting,
          input.name,
          input.intro,
          input.portraitImage,
          input.bio,
          input.bioEmphasis,
          input.quote,
          input.statsTitle,
          input.followTitle,
          input.followCopy,
          input.followCta,
          input.followTo,
          now(),
        ),
      // Cleared and rewritten, like every ordered table here — `position` is the
      // primary key, so renumbering in place would collide. `reorder` is not
      // used: it scopes the deletion to an owner column, and this table has none
      // (the page is a singleton, the whole table belongs to it).
      db.prepare('DELETE FROM apropos_stats'),
      ...input.stats.map((stat, index) =>
        db
          .prepare('INSERT INTO apropos_stats (position, label, value) VALUES (?, ?, ?)')
          .bind(index, stat.label, stat.value),
      ),
    ]);

    try {
      await forget(db, requireBucket(env), existing?.portrait_image, input.portraitImage);
    } catch {
      /* an orphaned object is cheaper than a failed save — see `forget` */
    }

    return json({ ok: true });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = route({ PUT: onRequestPut });
