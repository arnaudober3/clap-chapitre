/**
 * The statements that write an avis.
 *
 * Shared by POST (create) and PUT (replace) so the two cannot drift: a column
 * added to one and forgotten in the other is the bug where a field saves once
 * and disappears on the next edit.
 *
 * Everything returns statements rather than executing them. The caller batches
 * them, which is what makes an avis and its `article_related` rows land together
 * or not at all — D1 runs a batch in one implicit transaction.
 */
import { reorder } from './write';
import type { ArticleInput } from './inputs';
import type { Publication } from './write';
import type { D1Database, D1PreparedStatement } from '../types';

/** Columns written by both paths, in one order, bound the same way. */
const COLUMNS = [
  'title',
  'medium',
  'excerpt',
  'cover',
  'status',
  'published_at',
  'updated_at',
  'hook',
  'for_those_who',
  'body',
  'genre_meta',
  'reading_time',
  'pull_quote',
  'related_to_title',
  'related_to_note',
] as const;

/**
 * `undefined` → `null`, so an absent optional clears its column instead of
 * binding the string "undefined". This is the inverse of `optionalText` in
 * `rows.ts`, which turns the same NULL back into an absent property.
 */
function values(input: ArticleInput, publication: Publication, updatedAt: string): unknown[] {
  return [
    input.title,
    input.medium,
    input.excerpt,
    input.cover,
    publication.status,
    publication.published_at,
    updatedAt,
    input.hook ?? null,
    input.forThoseWho ?? null,
    input.body ?? null,
    input.genreMeta ?? null,
    input.readingTime ?? null,
    input.pullQuote ?? null,
    input.relatedTo?.title ?? null,
    input.relatedTo?.note ?? null,
  ];
}

/**
 * Whether any `related` entry names an avis that is not there.
 *
 * Checked before the batch rather than caught after it: the foreign key would
 * abort the whole write, and the resulting error is indistinguishable from "the
 * migrations were never applied" — one is a 422 about the payload, the other a
 * 503 about the deployment, and guessing between them sends the caller after the
 * wrong fix.
 */
export async function hasMissingRelated(
  db: D1Database,
  id: string,
  input: ArticleInput,
): Promise<boolean> {
  const targets = input.related.map((entry) => entry.id).filter((entry) => entry !== id);
  if (targets.length === 0) return false;

  const found = await db
    .prepare(
      `SELECT count(*) AS found FROM articles
        WHERE id IN (${targets.map(() => '?').join(', ')})`,
    )
    .bind(...targets)
    .first<{ found: number }>();

  return (found?.found ?? 0) !== targets.length;
}

export function insertArticle(
  db: D1Database,
  id: string,
  input: ArticleInput,
  publication: Publication,
  updatedAt: string,
): D1PreparedStatement[] {
  const columns = ['id', ...COLUMNS];
  return [
    db
      .prepare(
        `INSERT INTO articles (${columns.join(', ')})
         VALUES (${columns.map(() => '?').join(', ')})`,
      )
      .bind(id, ...values(input, publication, updatedAt)),
    ...relatedStatements(db, id, input),
  ];
}

export function updateArticle(
  db: D1Database,
  id: string,
  input: ArticleInput,
  publication: Publication,
  updatedAt: string,
): D1PreparedStatement[] {
  return [
    db
      .prepare(
        `UPDATE articles SET ${COLUMNS.map((column) => `${column} = ?`).join(', ')}
          WHERE id = ?`,
      )
      .bind(...values(input, publication, updatedAt), id),
    ...relatedStatements(db, id, input),
  ];
}

/**
 * The "à rapprocher de" links, rewritten wholesale.
 *
 * `article_related` has `PRIMARY KEY (article_id, related_id)` and a position,
 * so it gets the same delete-then-insert treatment as every other ordered table
 * here — see `reorder` for why updating in place does not work.
 *
 * A link pointing at a missing avis is left to the foreign key: the batch aborts
 * and the caller answers 422, which is accurate — the payload named something
 * that is not there.
 */
function relatedStatements(
  db: D1Database,
  id: string,
  input: ArticleInput,
): D1PreparedStatement[] {
  return reorder(
    db,
    'article_related',
    'article_id',
    id,
    // Self-references are dropped rather than refused: the schema's
    // `CHECK (article_id <> related_id)` would abort the whole save, and an avis
    // listed as related to itself is a slip, not a payload worth rejecting.
    input.related
      .filter((entry) => entry.id !== id)
      .map((entry) => ({ related_id: entry.id, note: entry.note })),
  );
}
