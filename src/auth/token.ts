/**
 * Reading a session token in the browser.
 *
 * This is an *optimistic* read: it decodes the claims and checks `exp`, but it
 * cannot check the signature — that needs JWT_SECRET, which only exists
 * server-side. `POST /api/verify` is the authority; this module exists so the
 * route guard can decide on the very first render instead of flashing the login
 * page while an async check resolves.
 *
 * A forged token therefore buys someone one render of an admin shell full of
 * mock data, then `checkAuth` gets its 401 and the session is dropped. Nothing
 * behind it is protected by this file.
 */

/** Subject, issued-at, expiry (seconds), as carried by the HS256 token. */
export interface TokenClaims {
  sub: string;
  iat: number;
  exp: number;
}

/** Inverse of base64url; throws on malformed input (callers catch). */
function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Read the claims out of a token without validating anything but its shape.
 * Synchronous on purpose — see the note at the top of this file.
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
