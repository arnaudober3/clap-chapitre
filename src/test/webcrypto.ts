/**
 * jsdom ships no WebCrypto, and the auth code is built on `crypto.subtle`.
 *
 * A module of its own, imported first by `setup.ts`, because ES modules
 * evaluate all their imports before their own body: a polyfill written inline
 * would run *after* `api-server.ts` had already tried to hash the test password
 * at import time.
 */
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}
