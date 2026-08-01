/**
 * Admin session client — the ONE module that knows how credentials travel.
 *
 *   POST /api/login   { username, password }
 *                     → 200 { token }  |  401 { error }
 *   POST /api/verify  Authorization: Bearer <token>
 *                     → 200 { username }  |  401 { error }
 *
 * Both are Cloudflare Pages Functions (`functions/api/`), reading the admin
 * credentials from the server environment. The password never leaves this
 * function, and nothing derived from it ships in the bundle.
 *
 * The token lives in localStorage (key TOKEN_KEY), mirroring how the theme
 * preference is persisted in `src/theme/ThemeContext.tsx`.
 *
 * One rule worth stating out loud: **only a 401 drops the token.** A network
 * failure or a 5xx keeps the optimistic session, because the alternative — a
 * misconfigured deployment silently signing the editor out on a loop, with no
 * message — is worse than a session that outlives its server by a few minutes.
 */
import { decodeToken, isTokenValid } from './token';

export const TOKEN_KEY = 'cc-admin-token';

/** The signed-in identity, as far as the UI is concerned. */
export interface AuthUser {
  username: string;
}

/** What the login form gets back: either a user, or a message to display. */
export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

/** Shown when `fetch` itself fails — offline, DNS, dev server down. */
const NETWORK_ERROR = 'Serveur injoignable. Réessaie dans un instant.';
/** Fallback when the server answers an error without a usable body. */
const GENERIC_ERROR = 'Identifiants incorrects.';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

/**
 * The session as it can be known *synchronously*, from the stored token alone.
 *
 * This is what lets the route guard decide on the very first render instead of
 * flashing the login page while an async check resolves. `checkAuth` then
 * confirms (or revokes) it against the server.
 */
export function readStoredSession(): AuthUser | null {
  const token = getToken();
  if (!isTokenValid(token)) return null;
  const claims = decodeToken(token);
  return claims ? { username: claims.sub } : null;
}

/** Sign in, persisting the token on success. */
export async function login(
  username: string,
  password: string,
): Promise<AuthResult> {
  let response: Response;
  try {
    response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    clearToken();
    return { ok: false, error: NETWORK_ERROR };
  }

  const payload = (await response.json().catch(() => null)) as
    | { token?: string; error?: string }
    | null;

  if (!response.ok || typeof payload?.token !== 'string') {
    clearToken();
    // The wording comes from the server, so there is one source of truth for it.
    return { ok: false, error: payload?.error ?? GENERIC_ERROR };
  }

  setToken(payload.token);
  // The identity comes from the token, not from what was typed: the server
  // canonicalises it (trim, lowercase), and a reload reads it back the same way.
  const claims = decodeToken(payload.token);
  return { ok: true, user: { username: claims?.sub ?? username } };
}

/**
 * Ask the server whether the stored token is still good. Returns null — and
 * drops the token — only when the server actually rejects it.
 */
export async function checkAuth(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;

  let response: Response;
  try {
    response = await fetch('/api/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Offline: keep whatever the token itself claims, subject to its own exp.
    return readStoredSession();
  }

  if (response.status === 401) {
    clearToken();
    return null;
  }
  // 5xx means the server is broken, not that the session is.
  if (!response.ok) return readStoredSession();

  const payload = (await response.json().catch(() => null)) as
    | { username?: string }
    | null;
  if (typeof payload?.username !== 'string') {
    clearToken();
    return null;
  }
  return { username: payload.username };
}

/** Sign out. Purely local: the token is stateless, there is nothing to revoke. */
export function logout(): void {
  clearToken();
}
