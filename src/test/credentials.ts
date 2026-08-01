/**
 * The credentials the test suite signs in with.
 *
 * Deliberately independent of `.dev.vars`: `npm test` and `npm run build` must
 * work on a fresh clone and in CI, with no secret anywhere. Only `npm run dev`
 * needs the real thing. `src/test/api-server.ts` serves exactly these values,
 * deriving the hash at load time so the password and its digest cannot drift.
 *
 * Not a `*.test.ts` file, so vitest does not collect it.
 */
export const TEST_USERNAME = 'marie-zoe';
export const TEST_PASSWORD = 'mot-de-passe-de-test';
export const TEST_JWT_SECRET = 'secret-de-signature-reserve-aux-tests';
