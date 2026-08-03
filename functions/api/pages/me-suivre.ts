/**
 * GET /api/pages/me-suivre → 200 MeSuivreContent | 404
 *
 * The "Me suivre" page: one row for the copy, one ordered table for the social
 * links. A 404 means the row was never written, which is what an empty database
 * looks like from here.
 *
 * The newsletter block on this page is presentational — the form posts nowhere —
 * so its copy lives in the same row rather than with the newsletter tooling.
 *
 * Public: the admin editor reads this same endpoint.
 */
import { requireDb } from '../../_lib/env';
import { dbUnavailable, getOnly, json, misconfigured, notFound } from '../../_lib/http';
import type { D1Database, Handler } from '../../types';

export const onRequestGet: Handler = async ({ env }) => {
  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  try {
    const [page, socials] = await db.batch([
      db.prepare('SELECT * FROM page_mesuivre WHERE id = 1'),
      db.prepare('SELECT key, name, handle, glyph, url, cta FROM mesuivre_socials ORDER BY position'),
    ]);

    const row = page.results[0];
    if (!row) return notFound();

    return json({
      eyebrow: String(row.eyebrow),
      title: String(row.title),
      intro: String(row.intro),
      newsletter: {
        eyebrow: String(row.newsletter_eyebrow),
        title: String(row.newsletter_title),
        copy: String(row.newsletter_copy),
        placeholder: String(row.newsletter_placeholder),
        cta: String(row.newsletter_cta),
      },
      socials: socials.results.map((social) => ({
        key: String(social.key),
        name: String(social.name),
        handle: String(social.handle),
        glyph: String(social.glyph),
        url: String(social.url),
        cta: String(social.cta),
      })),
    });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = getOnly(onRequestGet);
