/// <reference types="vite/client" />

/**
 * Admin credentials injected at build time from `.dev.vars` (see the `define`
 * block in vite.config.ts). JWT_SECRET is intentionally absent: it must never
 * reach the client.
 *
 * `__ADMIN_PASSWORD__` is the plaintext, and is only populated under `vitest`
 * so the suite can perform a real sign-in — it is an empty string in every
 * other mode. Read it through `src/test/credentials.ts`, never directly.
 */
declare const __ADMIN_USERNAME__: string;
declare const __ADMIN_PASSWORD_HASH__: string;
declare const __ADMIN_PASSWORD__: string;
