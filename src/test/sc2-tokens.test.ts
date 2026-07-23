import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const root = resolve(__dirname, '../..');
const tokens = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');
const global = readFileSync(resolve(root, 'src/styles/global.css'), 'utf8');

describe('SC-2 design tokens', () => {
  it('tokens.css defines --bg, --ink, --accent and --gold with Salon values', () => {
    expect(tokens).toMatch(/--bg:\s*#fdf8f0/);
    expect(tokens).toMatch(/--ink:\s*#3f2e20/);
    expect(tokens).toMatch(/--accent:\s*#b0502f/);
    expect(tokens).toMatch(/--gold:\s*#d8a24a/);
  });

  it('tokens.css defines the shell/rail sizes and breakpoints', () => {
    expect(tokens).toMatch(/--rail-width:\s*240px/);
    expect(tokens).toMatch(/--shell-max/);
    expect(tokens).toMatch(/--bp-sm/);
    expect(tokens).toMatch(/--bp-md/);
    expect(tokens).toMatch(/--bp-lg/);
  });

  it('global.css uses tokens for body background/color and IBM Plex Sans', () => {
    expect(global).toMatch(/background:\s*var\(--bg\)/);
    expect(global).toMatch(/color:\s*var\(--ink\)/);
    expect(global).toContain('IBM Plex Sans');
    expect(global).toContain('Newsreader');
  });
});
