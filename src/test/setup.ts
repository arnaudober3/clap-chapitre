import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach } from 'vitest';
import { issueMockToken, ADMIN_USERNAME } from '../mock/auth';
import { TOKEN_KEY } from '../auth/auth';

// jsdom ships no WebCrypto; sha256Hex in src/mock/auth.ts needs crypto.subtle.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

/**
 * Every admin test predates the auth guard and renders /admin/** directly, so
 * the suite runs signed in by default. Tests that need an anonymous visitor
 * clear the token themselves (see the al* files).
 */
beforeEach(() => {
  window.localStorage.setItem(TOKEN_KEY, issueMockToken(ADMIN_USERNAME));
});

afterEach(() => {
  window.localStorage.clear();
});
