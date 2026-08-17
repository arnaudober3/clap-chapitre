/**
 * PUT /api/admin/pages/me-suivre → 200 { ok: true }
 *
 * The "Me suivre" page, saved whole — the copy row plus the ordered social
 * links. Upserts for the same reason "À propos" does: `id = 1` by constraint, so
 * there is no meaningful difference between creating and updating it.
 *
 * Behind the admin JWT; reading stays public on /api/pages/me-suivre.
 */
import { requireAdminDb } from '../../../_lib/admin';
import { BodyError, MalformedBody, readJson } from '../../../_lib/body';
import { badRequest, dbUnavailable, json, route, unprocessable } from '../../../_lib/http';
import { readMeSuivreInput } from '../../../_lib/inputs';
import { now } from '../../../_lib/write';
import type { Handler } from '../../../types';

const COLUMNS = [
  'eyebrow',
  'title',
  'intro',
  'newsletter_eyebrow',
  'newsletter_title',
  'newsletter_copy',
  'newsletter_placeholder',
  'newsletter_cta',
  'updated_at',
] as const;

export const onRequestPut: Handler = async ({ request, env }) => {
  const check = await requireAdminDb(request, env);
  if (check instanceof Response) return check;
  const { db } = check;

  let input: ReturnType<typeof readMeSuivreInput>;
  try {
    input = readMeSuivreInput(await readJson(request));
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return badRequest('corps');
    throw error;
  }

  try {
    const columns = ['id', ...COLUMNS];
    await db.batch([
      db
        .prepare(
          `INSERT OR REPLACE INTO page_mesuivre (${columns.join(', ')})
           VALUES (${columns.map(() => '?').join(', ')})`,
        )
        .bind(
          1,
          input.eyebrow,
          input.title,
          input.intro,
          input.newsletterEyebrow,
          input.newsletterTitle,
          input.newsletterCopy,
          input.newsletterPlaceholder,
          input.newsletterCta,
          now(),
        ),
      // `mesuivre_socials.position` is UNIQUE, so the list is cleared and
      // rewritten rather than renumbered — moving a link up while another still
      // holds its slot would abort the statement. The whole table belongs to
      // this page, so the delete needs no owner clause.
      db.prepare('DELETE FROM mesuivre_socials'),
      ...input.socials.map((social, index) =>
        db
          .prepare(
            `INSERT INTO mesuivre_socials (key, position, name, handle, glyph, url, cta)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            social.key,
            index,
            social.name,
            social.handle,
            social.glyph,
            social.url,
            social.cta,
          ),
      ),
    ]);

    return json({ ok: true });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = route({ PUT: onRequestPut });
