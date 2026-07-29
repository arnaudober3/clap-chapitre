/**
 * Mock credentials store — stands in for the future Cloudflare Pages Functions
 * `/api/login` and `/api/verify`.
 *
 * Like every other file in `src/mock/`, this is data plus pure functions: no
 * React, no module-level mutable state. The two entry points mimic the shape of
 * the HTTP responses the real endpoints will return, so `src/auth/auth.ts` can
 * swap `mockLogin`/`mockVerify` for `fetch` without any caller noticing.
 *
 * ⚠️ This is a prototype gate, not a security boundary. The reference hash is
 * inlined into the client bundle at build time, so anyone can read it and replay
 * a token from the console. Real verification arrives when the Functions read
 * ADMIN_USERNAME, ADMIN_PASSWORD_HASH and JWT_SECRET from `.dev.vars`
 * server-side (see `.dev.vars.example`).
 */

/**
 * The expected identity, injected at build time from `.dev.vars` — the very
 * file the Functions will read, so there is one source of truth and no
 * credential lives in the repo. See the `define` block in vite.config.ts.
 */
/* Normalised here rather than at every comparison: `.dev.vars` is hand-edited,
   so it may carry stray case or spacing. This is the canonical form the token's
   `sub` claim carries. */
export const ADMIN_USERNAME = __ADMIN_USERNAME__.trim().toLowerCase();
export const ADMIN_PASSWORD_HASH = __ADMIN_PASSWORD_HASH__.trim().toLowerCase();

/** Session lifetime handed to a freshly issued token: 12 hours. */
export const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

/** The claims the real JWT will carry — subject, issued-at, expiry (seconds). */
export interface TokenClaims {
  sub: string;
  iat: number;
  exp: number;
}

/** Success/failure envelope mirroring what the Functions will send back. */
export type MockResponse<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

/** SHA-256 of `input`, lowercase hex. Uses the platform WebCrypto. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** base64url of a UTF-8 string, without padding (JWT segment encoding). */
function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Inverse of `base64UrlEncode`; throws on malformed input (callers catch). */
function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Forge a token with the shape of a JWT: `header.payload.signature`.
 *
 * The third segment is the literal `mock`, never a signature: signing needs
 * JWT_SECRET, which lives server-side only. A real HS256 signature appears the
 * day `/api/login` issues the token.
 */
export function issueMockToken(username: string, ttlMs = TOKEN_TTL_MS): string {
  const issuedAt = Date.now();
  const header = base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: username,
      iat: Math.floor(issuedAt / 1000),
      exp: Math.floor((issuedAt + ttlMs) / 1000),
    }),
  );
  return `${header}.${payload}.mock`;
}

/**
 * Read the claims out of a token without validating anything but its shape.
 * Synchronous on purpose: the auth context uses it to know, on the very first
 * render, whether a session exists — see `readStoredSession`.
 */
export function decodeToken(token: string | null): TokenClaims | null {
  if (!token) return null;
  const segments = token.split('.');
  if (segments.length !== 3) return null;
  try {
    const claims = JSON.parse(base64UrlDecode(segments[1])) as Partial<TokenClaims>;
    if (typeof claims.sub !== 'string' || typeof claims.exp !== 'number') {
      return null;
    }
    return {
      sub: claims.sub,
      iat: typeof claims.iat === 'number' ? claims.iat : 0,
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}

/** True when the token is well-formed and not past its `exp`. */
export function isTokenValid(token: string | null): boolean {
  const claims = decodeToken(token);
  return claims !== null && claims.exp * 1000 > Date.now();
}

/** Stands in for `POST /api/login`. */
export async function mockLogin(credentials: {
  username: string;
  password: string;
}): Promise<MockResponse<{ token: string }>> {
  const hash = await sha256Hex(credentials.password);
  const matches =
    credentials.username.trim().toLowerCase() === ADMIN_USERNAME &&
    hash === ADMIN_PASSWORD_HASH;
  if (!matches) {
    return { ok: false, status: 401, error: 'Identifiants incorrects.' };
  }
  return { ok: true, data: { token: issueMockToken(ADMIN_USERNAME) } };
}

/** Stands in for `POST /api/verify` with an `Authorization: Bearer` header. */
export async function mockVerify(
  token: string | null,
): Promise<MockResponse<{ username: string }>> {
  const claims = decodeToken(token);
  if (!claims) {
    return { ok: false, status: 401, error: 'Session invalide.' };
  }
  if (claims.exp * 1000 <= Date.now()) {
    return { ok: false, status: 401, error: 'Session expirée.' };
  }
  return { ok: true, data: { username: claims.sub } };
}
