/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Admin credentials come from `.dev.vars` — the same file the future Cloudflare
 * Pages Functions will read, so there is a single source of truth and nothing
 * credential-shaped is committed. There is no fallback: a missing or incomplete
 * file fails the build loudly rather than silently swapping in demo values.
 *
 * JWT_SECRET is deliberately never read here. `define` is a build-time text
 * substitution, so anything injected lands in the client bundle — which is also
 * why the hash is not a secret in this state of the project: the gate stays
 * symbolic until `/api/login` does the checking server-side.
 */
const DEV_VARS = new URL('.dev.vars', import.meta.url);

const MISSING_FILE = [
  '.dev.vars introuvable.',
  'Copier .dev.vars.example en .dev.vars, puis renseigner ADMIN_USERNAME,',
  'ADMIN_PASSWORD, ADMIN_PASSWORD_HASH et JWT_SECRET.',
].join(' ');

/** Minimal dotenv reader for `.dev.vars`; throws when the file is absent. */
function readDevVars(): Record<string, string> {
  let raw: string;
  try {
    raw = readFileSync(DEV_VARS, 'utf8');
  } catch {
    throw new Error(MISSING_FILE);
  }
  const vars: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    vars[trimmed.slice(0, separator).trim()] = trimmed
      .slice(separator + 1)
      .trim();
  }
  return vars;
}

function required(vars: Record<string, string>, key: string): string {
  const value = vars[key];
  if (!value) throw new Error(`.dev.vars : ${key} manquant ou vide.`);
  return value;
}

function adminCredentials(mode: string): Record<string, string> {
  const vars = readDevVars();
  const username = required(vars, 'ADMIN_USERNAME');
  const passwordHash = required(vars, 'ADMIN_PASSWORD_HASH').toLowerCase();

  const define = {
    __ADMIN_USERNAME__: JSON.stringify(username),
    __ADMIN_PASSWORD_HASH__: JSON.stringify(passwordHash),
    // The plaintext exists only for the test suite, which has to perform a real
    // sign-in; every other mode gets an empty string, so it never ships.
    __ADMIN_PASSWORD__: JSON.stringify(''),
  };

  if (mode !== 'test') return define;

  const password = required(vars, 'ADMIN_PASSWORD');
  const derived = createHash('sha256').update(password).digest('hex');
  if (derived !== passwordHash) {
    throw new Error(
      '.dev.vars : ADMIN_PASSWORD ne correspond pas à ADMIN_PASSWORD_HASH ' +
        `(sha256 attendu ${derived}).`,
    );
  }
  return { ...define, __ADMIN_PASSWORD__: JSON.stringify(password) };
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: adminCredentials(mode),
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
}));
