import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('SC-1 project setup', () => {
  it('package.json parses and lists react-router-dom and vitest', () => {
    const pkg = JSON.parse(read('package.json'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps['react-router-dom']).toBeTruthy();
    expect(deps['react-router-dom']).toMatch(/6/);
    expect(deps['vitest']).toBeTruthy();
    expect(pkg.scripts.test).toContain('vitest run');
  });

  it('index.html references the Newsreader and IBM Plex Sans font families', () => {
    const html = read('index.html');
    expect(html).toContain('Newsreader');
    expect(html).toContain('IBM+Plex+Sans');
    expect(html).toContain('rel="preconnect"');
    expect(html).toContain('id="root"');
  });
});
