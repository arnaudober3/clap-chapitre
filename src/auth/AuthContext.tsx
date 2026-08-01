import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  checkAuth,
  login as requestLogin,
  logout as clearSession,
  readStoredSession,
  type AuthResult,
  type AuthUser,
} from './auth';

/**
 * Admin session state for the whole app.
 *
 * The status is resolved *synchronously* on mount from the stored token
 * (`readStoredSession`), so the route guard never flashes the login page for an
 * already-signed-in visitor. A background `checkAuth()` then asks the server —
 * the mock, for now — and downgrades to `anonymous` if the token is rejected.
 *
 * Mounted in `App.tsx` rather than `main.tsx` (where ThemeProvider lives),
 * because routing depends on it: tests render `<App />` and must see the real
 * guard, not a default.
 */
export type AuthStatus = 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signOut: () => void;
}

/**
 * Default value so components that read the context outside a provider — the
 * public Header mounted directly in a unit test, say — render as signed out
 * instead of crashing. Real behavior comes from the provider.
 */
const DEFAULT_VALUE: AuthContextValue = {
  status: 'anonymous',
  user: null,
  signIn: async () => ({ ok: false, error: 'Session indisponible.' }),
  signOut: () => {},
};

const AuthContext = createContext<AuthContextValue>(DEFAULT_VALUE);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredSession);

  // Confirm the optimistic session against the server; drop it if it is stale.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    checkAuth().then((verified) => {
      if (!cancelled && !verified) setUser(null);
    });
    return () => {
      cancelled = true;
    };
    // Runs once per sign-in: re-verifying on every user object would loop.
  }, [user?.username]);

  const signIn = async (username: string, password: string) => {
    const result = await requestLogin(username, password);
    setUser(result.ok ? result.user : null);
    return result;
  };

  const signOut = () => {
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        status: user ? 'authenticated' : 'anonymous',
        user,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
