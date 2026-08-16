/**
 * Shared by page/component tests that scan a component's own source for a
 * banned pattern — a raw hex color, `dangerouslySetInnerHTML`, `<img>`,
 * `url()`... Comments are stripped first so a doc comment that *describes* a
 * rule (e.g. "never via dangerouslySetInnerHTML") doesn't trip the very
 * assertion meant to enforce it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');

export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

/** Reads a file at a repo-root-relative path, comments already stripped. */
export function readSource(path: string): string {
  return stripComments(readFileSync(resolve(ROOT, path), 'utf8'));
}

/** Same, for a list of paths — the `for (const [path, code] of sources)` shape. */
export function readSources(paths: string[]): Array<readonly [string, string]> {
  return paths.map((path) => [path, readSource(path)] as const);
}
