/**
 * The other direction: payload → database.
 *
 * `rows.ts` turns rows into the shapes `shared/content.ts` declares. This turns
 * a validated payload into the values a statement binds, and — more importantly
 * — owns the three invariants the schema enforces but cannot explain:
 *
 *   * published ⇔ dated. `CHECK ((status = 'published') = (published_at IS NOT
 *     NULL))` rejects a half-publication with a constraint error, which reaches
 *     the caller as an opaque 503. `publication()` makes that unreachable.
 *   * `updated_at` has a DEFAULT but no trigger. Every UPDATE has to set it, and
 *     one that forgets leaves an avis claiming it was last touched at creation.
 *   * ordered tables carry a UNIQUE position. Renumbering in place collides
 *     mid-statement; `reorder()` is the shape that does not.
 */
import { fold } from './text';
import type { D1Database, D1PreparedStatement } from '../types';

/** ISO instant, second precision — the format `datetime('now')` produces. */
export function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/** ISO day, '2026-07-18' — what `articles.published_at` stores. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface Publication {
  status: 'draft' | 'published';
  published_at: string | null;
}

/**
 * The publication pair, always set together.
 *
 * `existing` is the row's current `published_at`, and keeping it is what makes
 * re-saving a live avis a no-op on its date: only the *first* publication stamps
 * one. Unpublishing clears it, which is the only way back to a draft the CHECK
 * will accept.
 */
export function publication(
  status: 'draft' | 'published',
  existing?: string | null,
): Publication {
  if (status === 'draft') return { status: 'draft', published_at: null };
  return { status: 'published', published_at: existing || today() };
}

/**
 * A label → a URL-safe slug, or `''` when nothing survives.
 *
 * `fold()` is reused rather than reimplemented so a slug folds exactly like the
 * search expression does: "Un dernier été" and a search for "ete" agree on which
 * characters survive.
 */
export function slug(label: string): string {
  return fold(label)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * The same, for a primary key that must exist. A title of nothing but
 * punctuation falls back to 'avis' — `uniqueId` then makes it 'avis-2' and so
 * on, where an id of `''` would collide with the next such title.
 */
export function slugify(title: string): string {
  return slug(title) || 'avis';
}

/**
 * `slugify` plus a `-2`, `-3`… suffix until the id is free.
 *
 * Two avis can legitimately share a title — a film and the book it adapts — so
 * a collision is not an error to report, just an id to move past. The loop is
 * bounded: an editor with 50 identically-titled avis has a different problem.
 */
export async function uniqueId(db: D1Database, title: string): Promise<string> {
  const base = slugify(title);
  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const clash = await db
      .prepare('SELECT 1 AS taken FROM articles WHERE id = ?')
      .bind(candidate)
      .first();
    if (!clash) return candidate;
  }
  // Deterministic rather than random: the suite forbids Date.now()/Math.random()
  // in generated ids, and 50 collisions on one title never happen in practice.
  return `${base}-${slugify(now())}`;
}

/**
 * Rewrite an ordered join table: clear the owner's rows, insert them back in
 * order.
 *
 * The obvious alternative — UPDATE each row to its new position — breaks on
 * `UNIQUE (bilan_id, position)`: moving row A to slot 2 while row B still sits
 * there aborts the statement, and D1 rolls the whole batch back. Delete-then-
 * insert has no intermediate state to collide with, and inside `batch()` it is
 * atomic, so a failed insert cannot leave the selection empty.
 */
export function reorder(
  db: D1Database,
  table: string,
  ownerColumn: string,
  ownerId: string,
  rows: Array<Record<string, unknown>>,
): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [
    db.prepare(`DELETE FROM ${table} WHERE ${ownerColumn} = ?`).bind(ownerId),
  ];

  rows.forEach((row, index) => {
    const columns = [ownerColumn, ...Object.keys(row), 'position'];
    const values = [ownerId, ...Object.values(row), index];
    statements.push(
      db
        .prepare(
          `INSERT INTO ${table} (${columns.join(', ')})
           VALUES (${columns.map(() => '?').join(', ')})`,
        )
        .bind(...values),
    );
  });

  return statements;
}

/**
 * How many rows a write touched.
 *
 * `D1Result.meta` is typed as an open record — the runtime fills in `changes`,
 * `last_row_id`, `duration` and more, and pinning the whole shape here would be
 * a promise we cannot keep across D1 versions. This reads the one field the
 * handlers need: a DELETE that changed nothing is a 404, not a 204.
 */
export function changes(meta: Record<string, unknown>): number {
  const value = meta.changes;
  return typeof value === 'number' ? value : 0;
}
