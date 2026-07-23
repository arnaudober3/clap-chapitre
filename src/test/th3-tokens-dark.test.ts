import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const root = resolve(__dirname, '../..');
const tokens = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');
const global = readFileSync(resolve(root, 'src/styles/global.css'), 'utf8');

describe('TH-3 dark theme tokens', () => {
  it('tokens.css defines a :root[data-theme="dark"] override block', () => {
    expect(tokens).toMatch(/:root\[data-theme=['"]dark['"]\]/);
  });

  it('the dark block redefines the core surface/text/border/accent tokens', () => {
    const match = tokens.match(
      /:root\[data-theme=['"]dark['"]\]\s*\{([\s\S]*?)\}/,
    );
    expect(match).not.toBeNull();
    const block = match![1];
    for (const token of ['--bg', '--surface', '--ink', '--body', '--border', '--accent']) {
      expect(block).toContain(`${token}:`);
    }
  });

  it('global.css switches color-scheme to dark under the dark theme', () => {
    expect(global).toMatch(/:root\[data-theme=['"]dark['"]\]\s*\{[\s\S]*color-scheme:\s*dark/);
  });
});
