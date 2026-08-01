/**
 * base64url codecs for JWT segments (RFC 7515), padding stripped.
 *
 * Knowingly duplicated with the decoder half of `src/auth/token.ts`: nothing
 * that touches JWT_SECRET should be one import away from client code, and the
 * two sides do not share a contract anyway — the browser can only *decode*,
 * never verify. Fifteen lines is the price of that boundary.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(binary: string): string {
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
}

export function base64UrlEncode(value: string): string {
  return base64UrlEncodeBytes(encoder.encode(value));
}

export function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return toBase64Url(binary);
}

/** Throws on malformed input; every caller treats that as "invalid token". */
export function base64UrlDecode(value: string): string {
  return decoder.decode(base64UrlDecodeBytes(value));
}

/**
 * Throws on malformed input; every caller treats that as "invalid token".
 *
 * Allocated rather than built with `Uint8Array.from`, whose inferred
 * `ArrayBufferLike` backing store is not assignable to the `BufferSource` that
 * `crypto.subtle.verify` expects.
 */
export function base64UrlDecodeBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = fromBase64Url(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
