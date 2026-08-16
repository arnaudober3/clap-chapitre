/** Hashing helpers, on the platform WebCrypto only — no Node, no npm. */

/** SHA-256 of `input`, lowercase hex. */
export async function sha256Hex(input: string): Promise<string> {
  return sha256HexBytes(new TextEncoder().encode(input));
}

/**
 * Same digest over raw bytes — what an uploaded image needs.
 *
 * Content-addressed keys fall out of this: two uploads of the same file land on
 * the same object, and changing an image always produces a new key. That is what
 * makes `/api/media/:key` safe to cache for a year.
 */
export async function sha256HexBytes(bytes: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * HMAC-SHA256 of `message` keyed by `key`, lowercase hex.
 *
 * Used for the unsubscribe token: keyed on a secret rather than a plain
 * digest, so knowing an address alone is not enough to derive its token.
 */
export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time comparison of two hex digests.
 *
 * Returning early on a length mismatch is fine: digest length is fixed and
 * public, it leaks nothing about the secret. Hand-rolled rather than
 * `crypto.subtle.timingSafeEqual`, which is a Cloudflare extension absent from
 * Node and jsdom — the test suite runs this exact code.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
