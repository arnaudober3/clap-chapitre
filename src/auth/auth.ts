/**
 * Admin session client — the ONE module that knows how credentials travel.
 *
 * Target contract (Cloudflare Pages Functions, not written yet):
 *
 *   POST /api/login   { username, password }
 *                     → 200 { token }  |  401 { error }
 *   POST /api/verify  Authorization: Bearer <token>
 *                     → 200 { username }  |  401 { error }
 *
 * Until those exist, both calls are served by `src/mock/auth.ts`. Switching to
 * the real backend means replacing the two `mock*` calls below with `fetch` —
 * every component, context and test keeps working untouched, because they only
 * ever see `login` / `checkAuth` / `logout`.
 *
 * The token lives in localStorage (key TOKEN_KEY), mirroring how the theme
 * preference is persisted in `src/theme/ThemeContext.tsx`.
 */
import { mockLogin, mockVerify, decodeToken, isTokenValid } from '../mock/auth';

export const TOKEN_KEY = 'cc-admin-token';

/** The signed-in identity, as far as the UI is concerned. */
export interface AuthUser {
  username: string;
}

/** What the login form gets back: either a user, or a message to display. */
export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

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
 * confirms (or revokes) it in the background.
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
  // → fetch('/api/login', { method: 'POST', body: JSON.stringify(…) })
  const response = await mockLogin({ username, password });
  if (!response.ok) {
    clearToken();
    return { ok: false, error: response.error };
  }
  setToken(response.data.token);
  // The identity comes from the token, not from what was typed: the server
  // canonicalises it (trim, lowercase), and a reload reads it back the same way.
  const claims = decodeToken(response.data.token);
  return { ok: true, user: { username: claims?.sub ?? username } };
}

/**
 * Ask the server whether the stored token is still good. Returns null — and
 * drops the token — as soon as it is not.
 */
export async function checkAuth(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  // → fetch('/api/verify', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  const response = await mockVerify(token);
  if (!response.ok) {
    clearToken();
    return null;
  }
  return { username: response.data.username };
}

/** Sign out. Purely local: the token is stateless, there is nothing to revoke. */
export function logout(): void {
  clearToken();
}
