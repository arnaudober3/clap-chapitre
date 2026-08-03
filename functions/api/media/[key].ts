/**
 * GET /api/media/:key — the bytes of a cover or the portrait.
 *
 * Public: these images are what the site shows to everyone, and putting them
 * behind the admin gate would only mean the public pages could not render them.
 *
 * Cached for a year, immutably. Keys are the SHA-256 of their own content
 * (`_lib/media.ts`), so an object under a given key can never change — editing
 * an affiche produces a different key and the page requests a different URL.
 * This is the one route in the project that is not `no-store`.
 */
import { requireBucket } from '../../_lib/env';
import { getOnly, misconfigured, notFound, storageUnavailable } from '../../_lib/http';
import { contentTypeFor, isMediaKey } from '../../_lib/media';
import type { Handler, R2Bucket, R2Object } from '../../types';

export const onRequestGet: Handler = async ({ env, params }) => {
  let bucket: R2Bucket;
  try {
    bucket = requireBucket(env);
  } catch {
    return misconfigured();
  }

  const key = typeof params?.key === 'string' ? params.key : '';
  // Validated before it reaches R2: this parameter is the only thing between a
  // caller and the bucket's namespace.
  if (!isMediaKey(key)) return notFound();

  let object: R2Object | null;
  try {
    object = await bucket.get(key);
  } catch {
    // R2 answers null for a missing key rather than throwing, so a throw here
    // means the bucket itself is unreachable. Reporting that as a 404 would say
    // the image does not exist, and send everyone looking in the wrong place.
    return storageUnavailable();
  }
  if (!object) return notFound();

  return new Response(object.body, {
    headers: {
      // The stored metadata when R2 has it, the key's own extension otherwise —
      // objects written before the metadata was set still serve correctly.
      'content-type': object.httpMetadata?.contentType ?? contentTypeFor(key),
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
};

export const onRequest = getOnly(onRequestGet);
