/**
 * Database rows → the shapes declared in `shared/content.ts`.
 *
 * One conversion, in one place, so a column rename breaks here rather than in a
 * component. Two rules run through all of it:
 *
 *   * `NULL` becomes an absent property, never `''`. The type says `hook?:
 *     string`, and a hero renders "no hook" and "an empty hook" differently.
 *   * no French display string is ever produced here. The wire carries
 *     `publishedAt: '2026-07-18'`; `src/format.ts` turns it into "18 juillet
 *     2026" at render time. Writing that date twice is how the two copies start
 *     disagreeing.
 *
 * These functions are pure and take plain objects, so they are testable without
 * a database, an environment, or a request.
 */
import type {
  Medium,
  WireArticle,
  WireBilan,
  WireComment,
  WirePublishedArticle,
  WirePublishedBilan,
} from '../../shared/content';

/** A row as D1 hands it over: every column, unknown until read. */
export type Row = Record<string, unknown>;

/** `NULL`/absent → undefined, anything else → its string. */
function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function count(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

/**
 * The fields every avis carries, published or not.
 *
 * `comments` is the thread's size, which the queries compute with a scalar
 * subquery rather than a stored column — a counter that can drift from the rows
 * it counts is a counter that will.
 */
function baseArticle(row: Row) {
  return {
    id: text(row.id),
    title: text(row.title),
    medium: text(row.medium) as Medium,
    excerpt: text(row.excerpt),
    cover: text(row.cover),
    author: text(row.author),
    likes: count(row.likes),
    comments: count(row.comment_count),
    views: count(row.views),
    hook: optionalText(row.hook),
    forThoseWho: optionalText(row.for_those_who),
    body: optionalText(row.body),
    genreMeta: optionalText(row.genre_meta),
    readingTime: optionalText(row.reading_time),
    pullQuote: optionalText(row.pull_quote),
    relatedTo:
      optionalText(row.related_to_title) && optionalText(row.related_to_note)
        ? { title: text(row.related_to_title), note: text(row.related_to_note) }
        : undefined,
  };
}

/**
 * An avis, narrowed on its own `status` column.
 *
 * The schema guarantees published ⇔ dated, so the branch below cannot produce a
 * published avis without a date — but it reads the column rather than trusting
 * the caller to have filtered, because both listings mix the two.
 */
export function rowToArticle(row: Row): WireArticle {
  const base = baseArticle(row);
  if (row.status === 'draft') {
    // The ISO edit time; the client turns it into "Modifié il y a 2 jours".
    return { ...base, status: 'draft', updatedAt: text(row.updated_at) };
  }
  return { ...base, status: 'published', publishedAt: text(row.published_at) };
}

/** Same, for a query that already filtered on published rows. */
export function rowToPublishedArticle(row: Row): WirePublishedArticle {
  return { ...baseArticle(row), status: 'published', publishedAt: text(row.published_at) };
}

/**
 * A bilan and its per-medium chips.
 *
 * `counts` comes from its own table rather than from counting the linked avis:
 * the archive months carry chips without carrying their detail, so counting
 * would show zero on every month the editor has not fully written out.
 */
export function rowToBilan(row: Row, counts: Partial<Record<Medium, number>> = {}): WireBilan {
  const base = {
    id: text(row.id),
    year: count(row.year),
    month: count(row.month),
    monthLabel: text(row.month_label),
    title: text(row.title),
    mood: optionalText(row.mood),
    avis: [] as WirePublishedArticle[],
    counts,
    views: count(row.views),
    likes: count(row.likes),
  };

  if (row.status === 'draft') {
    return { ...base, status: 'draft', updatedAt: text(row.updated_at) };
  }
  return { ...base, status: 'published', publishedAt: text(row.published_at) };
}

/** Same, for a query restricted to published months. */
export function rowToPublishedBilan(
  row: Row,
  counts: Partial<Record<Medium, number>> = {},
): WirePublishedBilan {
  return {
    id: text(row.id),
    year: count(row.year),
    month: count(row.month),
    monthLabel: text(row.month_label),
    title: text(row.title),
    mood: optionalText(row.mood),
    avis: [],
    counts,
    views: count(row.views),
    likes: count(row.likes),
    status: 'published',
    publishedAt: text(row.published_at),
  };
}

/** `[{bilan_id, medium, count}]` → the `Partial<Record<Medium, number>>` a bilan carries. */
export function groupCounts(rows: Row[]): Map<string, Partial<Record<Medium, number>>> {
  const grouped = new Map<string, Partial<Record<Medium, number>>>();
  for (const row of rows) {
    const id = text(row.bilan_id);
    const entry = grouped.get(id) ?? {};
    entry[text(row.medium) as Medium] = count(row.count);
    grouped.set(id, entry);
  }
  return grouped;
}

/**
 * One comment, without its reply. `comment_date` is nullable on purpose — the
 * author's answers wear a badge instead of a date — and stays absent rather than
 * becoming `''`: the client is the one that decides how "no date" renders.
 */
function rowToComment(row: Row): WireComment {
  return {
    id: text(row.id),
    author: text(row.author),
    date: optionalText(row.comment_date),
    body: text(row.body),
    isAuthor: row.is_author === 1 ? true : undefined,
    likes: count(row.likes),
  };
}

/**
 * A flat result set → the thread the page renders: roots in order, each with at
 * most one reply attached.
 *
 * An orphan reply — a `parent_id` pointing at a comment the query did not return
 * — is dropped rather than promoted to a root. It would otherwise appear as a
 * top-level comment answering nothing, which reads as a bug in the thread rather
 * than as missing data.
 */
export function nestComments(rows: Row[]): WireComment[] {
  const roots: WireComment[] = [];
  const byId = new Map<string, WireComment>();

  for (const row of rows) {
    if (row.parent_id) continue;
    const comment = rowToComment(row);
    byId.set(comment.id, comment);
    roots.push(comment);
  }

  for (const row of rows) {
    if (!row.parent_id) continue;
    const parent = byId.get(text(row.parent_id));
    // Only the first reply is kept: the type holds one, and the trigger in
    // migration 0001 stops a second level, not a second sibling.
    if (parent && !parent.reply) parent.reply = rowToComment(row);
  }

  return roots;
}
