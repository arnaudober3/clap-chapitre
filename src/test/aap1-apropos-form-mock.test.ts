import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { apropos, aproposFormValues } from '../mock/apropos';

const root = resolve(__dirname, '../..');
const source = readFileSync(resolve(root, 'src/mock/apropos.ts'), 'utf8');

describe('AAP-1 admin À propos form values', () => {
  it('joins the greeting and the name into the single "Titre" field', () => {
    expect(aproposFormValues().title).toBe(`${apropos.greeting} ${apropos.name}`);
    expect(aproposFormValues().intro).toBe(apropos.intro);
  });

  it('folds the bio paragraphs into one text, blank line between them', () => {
    const { bio } = aproposFormValues();
    expect(bio.split('\n\n')).toEqual(apropos.bio);
    // Nothing is lost on the way in.
    for (const paragraph of apropos.bio) {
      expect(bio).toContain(paragraph);
    }
  });

  it('strips the guillemets from the pull-quote — the page adds them back', () => {
    const { quote } = aproposFormValues();
    expect(quote).not.toMatch(/^«/);
    expect(quote).not.toMatch(/»$/);
    expect(apropos.quote).toContain(quote);
    expect(quote.trim()).toBe(quote);
  });

  it('carries every "Cette année" row with its value as a string', () => {
    const { stats } = aproposFormValues();
    expect(stats).toEqual(
      apropos.stats.map((stat) => ({ label: stat.label, value: String(stat.value) })),
    );
    for (const row of stats) {
      expect(typeof row.value).toBe('string');
    }
  });

  it('returns a fresh, detached object on every call (that is what "Annuler" needs)', () => {
    const first = aproposFormValues();
    const second = aproposFormValues();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.stats[0]).not.toBe(second.stats[0]);

    first.title = 'modifié';
    first.stats[0].value = '999';
    expect(aproposFormValues().title).toBe(second.title);
    expect(aproposFormValues().stats[0].value).toBe(second.stats[0].value);
  });

  it('stays a pure data module: no React, no network, no Date/random', () => {
    expect(source).not.toMatch(/from ['"]react['"]/);
    expect(source).not.toMatch(/\burl\(/);
    expect(source).not.toMatch(/\bfetch\(|new Date\(|Math\.random\(/);
  });
});
