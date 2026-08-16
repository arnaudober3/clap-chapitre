// First, before anything imports code that hashes at module load.
import './webcrypto';
import '@testing-library/jest-dom';
import { beforeEach, afterEach } from 'vitest';
import { TOKEN_KEY } from '../auth/auth';
import { installApiStub, resetTestDb, signTestToken } from './api-server';

// /api/login and /api/verify are served by the real Functions, in-process.
installApiStub();

/**
 * Every admin test predates the auth guard and renders /admin/** directly, so
 * the suite runs signed in by default. Tests that need an anonymous visitor
 * clear the token themselves (see the al* files).
 *
 * Signed once per test file rather than per test: the TTL is twelve hours, and
 * this keeps `beforeEach` synchronous.
 */
const ADMIN_TOKEN = await signTestToken();

beforeEach(() => {
  window.localStorage.setItem(TOKEN_KEY, ADMIN_TOKEN);
});

afterEach(() => {
  window.localStorage.clear();
  // The content database, if the test asked for one. Dropped here so a test
  // never inherits rows another one inserted.
  resetTestDb();
});
