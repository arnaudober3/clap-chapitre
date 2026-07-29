/**
 * The admin password in plaintext, for the tests that sign in for real.
 *
 * It comes from `.dev.vars` via the `define` block in vite.config.ts, which
 * only populates it under `mode === 'test'` and checks it against
 * ADMIN_PASSWORD_HASH — so the two can never drift apart unnoticed.
 *
 * Not a `*.test.ts` file, so vitest does not collect it.
 */
export const TEST_PASSWORD: string = __ADMIN_PASSWORD__;

if (!TEST_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD absent de .dev.vars — la suite ne peut pas tester la connexion.',
  );
}
