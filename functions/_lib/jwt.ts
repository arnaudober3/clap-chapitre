/**
 * HS256 session tokens.
 *
 * This replaces the `alg: 'none'` placeholder of the mock era: the signature is
 * now a real HMAC over `header.payload`, so a token cannot be forged without
 * JWT_SECRET — which only ever exists server-side.
 */
import {
  base64UrlDecode,
  base64UrlDecodeBytes,
  base64UrlEncode,
  base64UrlEncodeBytes,
} from './base64url';

/** Session lifetime handed to a freshly issued token: 12 hours. */
export const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

/** Subject, issued-at, expiry (seconds, as JWT mandates). */
export interface TokenClaims {
  sub: string;
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Issue a signed token for `sub`.
 *
 * A negative `ttlMs` yields an already-expired token — the test suite relies on
 * that to exercise the expiry path without waiting twelve hours.
 */
export async function signToken(
  sub: string,
  secret: string,
  ttlMs: number = TOKEN_TTL_MS,
): Promise<string> {
  const issuedAt = Date.now();
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub,
      iat: Math.floor(issuedAt / 1000),
      exp: Math.floor((issuedAt + ttlMs) / 1000),
    }),
  );
  const data = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    encoder.encode(data),
  );
  return `${data}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

/**
 * Verify signature *and* expiry. Returns null on anything suspect — malformed
 * shape, unexpected algorithm, bad signature, past `exp`.
 *
 * The `alg` check is not ceremonial: DEV-28 tokens have the exact shape
 * `header.payload.mock` with `alg: 'none'`, and some are still sitting in
 * browsers' localStorage. Rejecting them here is what makes this a real gate.
 */
export async function verifyToken(
  token: string,
  secret: string,
): Promise<TokenClaims | null> {
  const segments = token.split('.');
  if (segments.length !== 3) return null;
  const [header, payload, signature] = segments;

  let algorithm: unknown;
  try {
    algorithm = (JSON.parse(base64UrlDecode(header)) as { alg?: unknown }).alg;
  } catch {
    return null;
  }
  if (algorithm !== 'HS256') return null;

  let signatureBytes: Uint8Array<ArrayBuffer>;
  try {
    signatureBytes = base64UrlDecodeBytes(signature);
  } catch {
    return null;
  }

  const authentic = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    signatureBytes,
    encoder.encode(`${header}.${payload}`),
  );
  if (!authentic) return null;

  let claims: Partial<TokenClaims>;
  try {
    claims = JSON.parse(base64UrlDecode(payload)) as Partial<TokenClaims>;
  } catch {
    return null;
  }
  if (typeof claims.sub !== 'string' || typeof claims.exp !== 'number') {
    return null;
  }
  if (claims.exp * 1000 <= Date.now()) return null;

  return {
    sub: claims.sub,
    iat: typeof claims.iat === 'number' ? claims.iat : 0,
    exp: claims.exp,
  };
}
