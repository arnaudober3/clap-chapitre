/**
 * Covers and the portrait, as files.
 *
 * They used to be CSS gradient strings, which kept the prototype network-free
 * and made every avis look deliberately unfinished. They are images now, stored
 * in R2 and served by `/api/media/:key`, and `articles.cover` holds the key.
 * An empty string still means "no image yet" — that is why the column did not
 * need to become nullable.
 *
 * Keys are content-addressed and flat: `cover-<sha256>.webp`, no slash. Flat
 * because `vite/routeMatch.ts` matches segments, and a `covers/` prefix would
 * force a catch-all route on it for no gain. Content-addressed because it makes
 * an object immutable — replacing an image produces a new key, never new bytes
 * under an old one — which is what justifies the year-long cache.
 */
import type { D1Database, R2Bucket } from '../types';

/**
 * What the editor is allowed to upload.
 *
 * A closed list rather than a `image/*` prefix test: SVG is an image by that
 * measure and also a script host, and serving one from our own origin would
 * hand it our cookies. These four are all raster, all understood by every
 * browser the site targets.
 */
const TYPES: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** 5 MB. Generous for a poster, far below what would make an isolate struggle. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** The extension for a content type, or undefined when we refuse to store it. */
export function extensionFor(contentType: string): string | undefined {
  // `image/jpeg; charset=binary` is unusual but legal — compare the type alone.
  return TYPES[contentType.split(';')[0]?.trim().toLowerCase() ?? ''];
}

/** The content type to serve a key back with, derived from its own extension. */
export function contentTypeFor(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase() ?? '';
  const found = Object.entries(TYPES).find(([, value]) => value === extension);
  return found?.[0] ?? 'application/octet-stream';
}

/**
 * Rejects anything that is not a key we minted.
 *
 * The parameter reaches R2 directly, so this is the boundary that keeps a
 * caller from probing the bucket with paths of their own. Anchored, flat, and
 * exact about the digest length — no `..`, no slash, no prefix games.
 */
export function isMediaKey(value: string): boolean {
  return /^(cover|portrait)-[0-9a-f]{64}\.(jpg|png|webp|avif)$/.test(value);
}

/**
 * Drops an image nothing points at any more.
 *
 * Called after every write that replaces or removes a `cover`, with the key that
 * was there before. The check matters because keys are content-addressed: two
 * avis that were given the same file share one object, so "this row stopped
 * using it" is not the same as "nobody uses it". Both tables are consulted —
 * an image can perfectly well be a cover and the portrait.
 *
 * Best-effort by design. A failed delete leaves an unreferenced object in the
 * bucket, which costs a fraction of a cent; failing the editor's save over it
 * would cost her the write.
 */
export async function forget(
  db: D1Database,
  bucket: R2Bucket,
  key: string | null | undefined,
  replacement: string,
): Promise<void> {
  if (!key || key === replacement || !isMediaKey(key)) return;

  try {
    const [articles, portrait] = await db.batch<{ used: number }>([
      db.prepare('SELECT count(*) AS used FROM articles WHERE cover = ?').bind(key),
      db.prepare('SELECT count(*) AS used FROM page_apropos WHERE portrait_image = ?').bind(key),
    ]);
    const used =
      (articles?.results[0]?.used ?? 0) + (portrait?.results[0]?.used ?? 0);
    if (used === 0) await bucket.delete(key);
  } catch {
    // See above: an orphan is cheaper than a failed save.
  }
}
