/**
 * POST /api/admin/uploads — raw image bytes → 201 { key }
 *
 * Deliberately not multipart. The client sends the file as the body with its own
 * `content-type`, which means no boundary parsing, no `FormData` in a Worker,
 * and a `content-length` that is the file's actual size — so an oversized upload
 * is refused before a single byte is buffered.
 *
 * Behind the admin gate: an open upload endpoint is a free file host.
 */
import { requireAdmin } from '../../_lib/admin';
import { sha256HexBytes } from '../../_lib/crypto';
import { requireBucket } from '../../_lib/env';
import { badRequest, created, misconfigured, postOnly } from '../../_lib/http';
import { extensionFor, MAX_UPLOAD_BYTES } from '../../_lib/media';
import type { Handler, R2Bucket } from '../../types';

/** `?kind=portrait` picks the key prefix; covers are the default. */
const KINDS = ['cover', 'portrait'] as const;

export const onRequestPost: Handler = async ({ request, env }) => {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;

  let bucket: R2Bucket;
  try {
    bucket = requireBucket(env);
  } catch {
    return misconfigured();
  }

  const kind = new URL(request.url).searchParams.get('kind') ?? 'cover';
  if (!KINDS.includes(kind as (typeof KINDS)[number])) return badRequest('kind');

  const extension = extensionFor(request.headers.get('content-type') ?? '');
  if (!extension) return badRequest('content-type');

  // Checked twice on purpose: the header first, so a large upload is refused
  // before it is read, and the buffer after, because the header is the caller's
  // claim rather than a measurement.
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) return badRequest('taille');

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_UPLOAD_BYTES) {
    return badRequest('taille');
  }

  const key = `${kind}-${await sha256HexBytes(bytes)}.${extension}`;

  // Unconditional: re-uploading the same file writes identical bytes to the same
  // key, so there is nothing to check for and nothing a race could corrupt.
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: request.headers.get('content-type')?.split(';')[0]?.trim() },
  });

  return created({ key });
};

export const onRequest = postOnly(onRequestPost);
