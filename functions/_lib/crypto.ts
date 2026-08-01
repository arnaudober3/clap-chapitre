/** Hashing helpers, on the platform WebCrypto only — no Node, no npm. */

/** SHA-256 of `input`, lowercase hex. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
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
