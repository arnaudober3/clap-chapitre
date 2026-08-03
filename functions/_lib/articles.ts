/**
 * The SELECT lists the avis queries share.
 *
 * Every endpoint that returns an avis needs the same columns plus the same
 * comment count, and a listing that forgets the count renders "0 commentaires"
 * under a busy thread. Naming the fragment once is what keeps the four callers
 * honest.
 */

/**
 * The comment count, as a scalar subquery rather than a stored column.
 *
 * A counter kept alongside the rows it counts is a counter that drifts — and
 * with no write endpoints yet, nothing would ever be there to keep it in step.
 */
const COMMENT_COUNT = `(
  SELECT count(*) FROM comments c
   WHERE c.target_type = 'article' AND c.target_id = a.id
)`;

/** Everything an avis card or hero reads, minus the body-length fields. */
export const ARTICLE_COLUMNS = `
  a.id, a.title, a.medium, a.excerpt, a.cover, a.author, a.status,
  a.published_at, a.updated_at, a.likes, a.views,
  a.hook, a.for_those_who, a.genre_meta, a.reading_time,
  ${COMMENT_COUNT} AS comment_count
`;

/** The article view additionally renders the full text. */
export const ARTICLE_COLUMNS_FULL = `
  ${ARTICLE_COLUMNS},
  a.body, a.pull_quote, a.related_to_title, a.related_to_note
`;
