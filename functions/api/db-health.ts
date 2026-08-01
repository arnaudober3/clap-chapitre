/**
 * GET /api/db-health — 200 { ok: true } | 500 | 503
 *
 * The D1 database is empty by design, so nothing in the site reads it yet. This
 * endpoint exists to make the binding *provable*: the same request answers 200
 * from the Vite dev server, from `wrangler pages dev` and from Cloudflare Pages
 * only if the binding is wired and the migrations have been applied.
 *
 * 500 means the deployment has no binding at all; 503 means the binding is there
 * but the database has not been migrated — two different fixes, hence two codes.
 *
 * Unauthenticated on purpose: it is the proof the wiring works, so it has to
 * answer before the secrets are in place. That holds only while the query stays
 * constant-cost on a one-row table and the body stays this opaque. The day it
 * returns counts, schema or timings, it goes behind the admin JWT.
 */
import { requireDb } from '../_lib/env';
import { getOnly, json, misconfigured } from '../_lib/http';
import type { D1Database, Handler } from '../types';

export const onRequestGet: Handler = async ({ env }) => {
  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  try {
    const row = await db.prepare('SELECT id FROM schema_health WHERE id = 1').first();
    if (!row) return json({ error: 'Migrations non appliquées.' }, 503);
    return json({ ok: true });
  } catch {
    // Almost always "no such table": the binding resolves but `npm run db:migrate`
    // was never run. The SQL error itself stays in the logs, not in the response.
    return json({ error: 'Base de données indisponible.' }, 503);
  }
};

export const onRequest = getOnly(onRequestGet);
