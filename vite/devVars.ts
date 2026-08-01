/**
 * Reading `.dev.vars` — the file `wrangler pages dev` reads too, so local
 * development and the Cloudflare preview share one source of truth and nothing
 * credential-shaped is ever committed.
 *
 * `root` is a parameter rather than derived from `import.meta.url`: Vite bundles
 * the config into a temporary module at the project root, so `import.meta.url`
 * would not point at this directory. The plugin passes the resolved root.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MISSING_FILE = [
  '.dev.vars introuvable.',
  'Copier .dev.vars.example en .dev.vars, puis renseigner ADMIN_USERNAME,',
  'ADMIN_PASSWORD_HASH et JWT_SECRET.',
].join(' ');

/** The keys the Functions require; a missing one fails the request loudly. */
const REQUIRED_KEYS = [
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH',
  'JWT_SECRET',
] as const;

/** Minimal dotenv reader; throws when the file is absent. */
export function readDevVars(root: string): Record<string, string> {
  let raw: string;
  try {
    raw = readFileSync(join(root, '.dev.vars'), 'utf8');
  } catch {
    throw new Error(MISSING_FILE);
  }

  const vars: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    vars[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }
  return vars;
}

/** The `env` object handed to a Function, validated up front. */
export function readFunctionsEnv(root: string): Record<string, string> {
  const vars = readDevVars(root);
  for (const key of REQUIRED_KEYS) {
    if (!vars[key]) throw new Error(`.dev.vars : ${key} manquant ou vide.`);
  }
  return vars;
}
