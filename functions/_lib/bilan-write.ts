/**
 * The statements that write a bilan.
 *
 * A month is three things at once — its own row, an ordered selection of avis,
 * and the per-medium chips — plus a fourth the form makes easy to miss: the
 * bilan editor edits the *content* of the avis it features, inline on each card.
 * Saving a month therefore writes into `articles` too.
 *
 * All four go into one batch, so a month can never end up saved with a stale
 * selection or chips that count something else.
 */
import { reorder } from './write';
import type { BilanInput } from './inputs';
import type { Publication } from './write';
import type { Medium } from '../../shared/content';
import type { D1Database, D1PreparedStatement } from '../types';

const COLUMNS = [
  'year',
  'month',
  'month_label',
  'title',
  'mood',
  'status',
  'published_at',
  'updated_at',
] as const;

function values(input: BilanInput, publication: Publication, updatedAt: string): unknown[] {
  return [
    input.year,
    input.month,
    input.monthLabel,
    input.title,
    input.mood ?? null,
    publication.status,
    publication.published_at,
    updatedAt,
  ];
}

export function insertBilan(
  db: D1Database,
  input: BilanInput,
  publication: Publication,
  updatedAt: string,
): D1PreparedStatement {
  const columns = ['id', ...COLUMNS];
  return db
    .prepare(
      `INSERT INTO bilans (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
    )
    .bind(input.id, ...values(input, publication, updatedAt));
}

export function updateBilan(
  db: D1Database,
  input: BilanInput,
  publication: Publication,
  updatedAt: string,
): D1PreparedStatement {
  return db
    .prepare(`UPDATE bilans SET ${COLUMNS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
    .bind(...values(input, publication, updatedAt), input.id);
}

/**
 * The month's selection and its chips.
 *
 * `bilan_avis` carries `UNIQUE (bilan_id, position)`, so it is rewritten rather
 * than renumbered — see `reorder`. The chips are rewritten from the same
 * selection: `bilan_counts` is stored rather than derived, because the archive
 * months show chips without carrying their avis, and a stored count that nothing
 * recomputes is a count that drifts the first time a selection changes.
 */
export function selection(
  db: D1Database,
  id: string,
  avis: string[],
  media: Map<string, Medium>,
): D1PreparedStatement[] {
  const counts = new Map<Medium, number>();
  for (const articleId of avis) {
    const medium = media.get(articleId);
    if (medium) counts.set(medium, (counts.get(medium) ?? 0) + 1);
  }

  return [
    ...reorder(
      db,
      'bilan_avis',
      'bilan_id',
      id,
      avis.map((articleId) => ({ article_id: articleId })),
    ),
    db.prepare('DELETE FROM bilan_counts WHERE bilan_id = ?').bind(id),
    ...[...counts].map(([medium, count]) =>
      db
        .prepare('INSERT INTO bilan_counts (bilan_id, medium, count) VALUES (?, ?, ?)')
        .bind(id, medium, count),
    ),
  ];
}

/**
 * The media of the selected avis, and the proof they all exist.
 *
 * One query serves both: the chips need each avis' medium, and a selection
 * naming something absent must be a 422 rather than a foreign key aborting the
 * batch as an opaque 503. The caller compares the map's size to the selection's.
 */
export async function mediaOf(db: D1Database, avis: string[]): Promise<Map<string, Medium>> {
  if (avis.length === 0) return new Map();

  const { results } = await db
    .prepare(
      `SELECT id, medium FROM articles WHERE id IN (${avis.map(() => '?').join(', ')})`,
    )
    .bind(...avis)
    .all<{ id: string; medium: Medium }>();

  return new Map(results.map((row) => [row.id, row.medium]));
}

/** The card fields the bilan form owns — the avis columns it edits inline. */
const CARD_COLUMNS = [
  'title',
  'excerpt',
  'hook',
  'for_those_who',
  'body',
  'related_to_title',
  'related_to_note',
  'updated_at',
] as const;

/**
 * The inline card edits, one UPDATE per card.
 *
 * Each card is written whole, for the same reason the avis PUT replaces rather
 * than patches: the form holds every one of these fields on screen, so "the
 * editor cleared the hook" and "the payload omitted the hook" would otherwise be
 * the same request. Sending the complete card makes clearing a field possible.
 *
 * The other columns of an avis — medium, cover, status, publication — are not
 * here and must not be: the bilan form does not show them, and a month must not
 * be able to unpublish an avis as a side effect of being saved.
 */
export function cardEdits(
  db: D1Database,
  edits: BilanInput['edits'],
  updatedAt: string,
): D1PreparedStatement[] {
  return edits.map((edit) =>
    db
      .prepare(`UPDATE articles SET ${CARD_COLUMNS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
      .bind(
        edit.title,
        edit.excerpt,
        edit.hook ?? null,
        edit.forThoseWho ?? null,
        edit.body ?? null,
        edit.relatedTo?.title ?? null,
        edit.relatedTo?.note ?? null,
        updatedAt,
        edit.id,
      ),
  );
}
