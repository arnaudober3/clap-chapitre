/**
 * Case- and accent-insensitive folding, server side.
 *
 * A deliberate copy of `fold()` in `src/format.ts`, for the same reason
 * `base64url.ts` is a copy: `functions/_lib/` is not imported by client code.
 * The duplication is three lines and is pinned by a test that runs both
 * implementations over the same strings.
 *
 * What matters far more than the duplication is that this function and the SQL
 * expression in `sql.ts` agree character for character. The search term is
 * folded here, in JavaScript; the column is folded there, in SQLite. If one
 * strips a diacritic the other keeps, "été" stops matching "Ete" and nobody can
 * see why.
 */

/** Lowercased and stripped of diacritics, so "ete" matches "été". */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    // Written as escapes, like the separators in src/format.ts: combining marks
    // are invisible in a source file, and an editor that eats one turns this
    // into a silent no-op.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
