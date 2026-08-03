/**
 * The SQL fragments that vary with a query parameter — built here, never spliced
 * together at the call site.
 *
 * Sorting and folding are the two places where a request has to reach into the
 * shape of a statement rather than into a bound value, so they are the two places
 * where a mistake becomes an injection. Both are expressed as lookups in a frozen
 * table: an unrecognised sort is a 400, not a string concatenation.
 */

/**
 * Fold a column the way `fold()` folds a search term: lowercased, diacritics
 * removed.
 *
 * SQLite has no `unaccent`, and its `lower()` only touches ASCII — 'É' comes out
 * of it unchanged. So the accented letters are rewritten one by one, upper and
 * lower case alike, before `lower()` handles the rest.
 *
 * The list covers French. It deliberately leaves 'œ' and 'æ' alone, because NFD
 * does not decompose them either: `fold('œuvre')` is 'œuvre', and the column has
 * to agree. Same for the typographic apostrophe — folding one side only would
 * make "l'année" unsearchable.
 *
 * This runs over every row of a scan. That is acceptable at the scale of a
 * personal review site and not much beyond it; the exit is an FTS5 table with
 * `unicode61 remove_diacritics 2`, at the cost of prefix-token matching instead
 * of substring matching.
 */
export function folded(column: string): string {
  const pairs: Array<[string, string]> = [
    ['à', 'a'], ['â', 'a'], ['ä', 'a'], ['á', 'a'], ['ã', 'a'], ['å', 'a'],
    ['ç', 'c'],
    ['é', 'e'], ['è', 'e'], ['ê', 'e'], ['ë', 'e'],
    ['î', 'i'], ['ï', 'i'], ['í', 'i'], ['ì', 'i'],
    ['ô', 'o'], ['ö', 'o'], ['ó', 'o'], ['ò', 'o'], ['õ', 'o'],
    ['ù', 'u'], ['û', 'u'], ['ü', 'u'], ['ú', 'u'],
    ['ÿ', 'y'], ['ý', 'y'],
    ['ñ', 'n'],
  ];

  // Upper case first, mapped to the same lowercase letter: `lower()` at the end
  // would never have reached them.
  let expression = column;
  for (const [accented, plain] of pairs) {
    expression = `replace(${expression}, '${accented.toUpperCase()}', '${plain}')`;
    expression = `replace(${expression}, '${accented}', '${plain}')`;
  }
  return `lower(${expression})`;
}

/**
 * Escape a folded search term for `LIKE … ESCAPE '\'`.
 *
 * Without this, a title containing '%' would be searchable but a search *for*
 * '%' would return the whole catalogue.
 */
export function likeTerm(folded: string): string {
  return `%${folded.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** The sorts the avis listing accepts, and the ORDER BY each one means. */
const ARTICLE_SORTS = {
  // `id` breaks ties so pagination cannot show the same row on two pages, or
  // skip one — two avis published the same day are otherwise ordered by whim.
  recent: 'published_at DESC, id DESC',
  oldest: 'published_at ASC, id ASC',
  views: 'views DESC, id ASC',
} as const;

/** Same, for the bilans listing. */
const BILAN_SORTS = {
  recent: 'published_at DESC, id DESC',
  oldest: 'published_at ASC, id ASC',
  views: 'views DESC, id ASC',
} as const;

export type ArticleSort = keyof typeof ARTICLE_SORTS;
export type BilanSort = keyof typeof BILAN_SORTS;

export function isArticleSort(value: string): value is ArticleSort {
  return value in ARTICLE_SORTS;
}

export function isBilanSort(value: string): value is BilanSort {
  return value in BILAN_SORTS;
}

export function articleOrderBy(sort: ArticleSort): string {
  return ARTICLE_SORTS[sort];
}

export function bilanOrderBy(sort: BilanSort): string {
  return BILAN_SORTS[sort];
}

/**
 * Drafts first, whatever the sort — the admin listing puts what is being written
 * above what is already online, and sorting by date must not bury it.
 */
export const DRAFTS_FIRST = "(status = 'draft') DESC";
