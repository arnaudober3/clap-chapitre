import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { aproposFormValues } from '../content/apropos';
import { anApropos } from './fixtures';

const apropos = anApropos();
/** The derivation takes its content now that the content is fetched. */
const formValues = () => aproposFormValues(apropos);

const root = resolve(__dirname, '../..');
const source = readFileSync(resolve(root, 'src/content/apropos.ts'), 'utf8');

describe('AAP-1 admin À propos form values', () => {
  it('joins the greeting and the name into the single "Titre" field', () => {
    expect(formValues().title).toBe(`${apropos.greeting} ${apropos.name}`);
    expect(formValues().intro).toBe(apropos.intro);
  });

  it('folds the bio paragraphs into one text, blank line between them', () => {
    const { bio } = formValues();
    expect(bio.split('\n\n')).toEqual(apropos.bio);
    // Nothing is lost on the way in.
    for (const paragraph of apropos.bio) {
      expect(bio).toContain(paragraph);
    }
  });

  it('strips the guillemets from the pull-quote — the page adds them back', () => {
    const { quote } = formValues();
    expect(quote).not.toMatch(/^«/);
    expect(quote).not.toMatch(/»$/);
    expect(apropos.quote).toContain(quote);
    expect(quote.trim()).toBe(quote);
  });

  it('carries every "Cette année" row with its value as a string', () => {
    const { stats } = formValues();
    expect(stats).toEqual(
      apropos.stats.map((stat) => ({ label: stat.label, value: String(stat.value) })),
    );
    for (const row of stats) {
      expect(typeof row.value).toBe('string');
    }
  });

  // The editor edits this object in place through its state, so it must never
  // be a window onto the mock the public page renders.
  it('returns a fresh, detached object on every call', () => {
    const first = formValues();
    const second = formValues();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.stats[0]).not.toBe(second.stats[0]);

    first.title = 'modifié';
    first.stats[0].value = '999';
    expect(formValues().title).toBe(second.title);
    expect(formValues().stats[0].value).toBe(second.stats[0].value);
  });

  it('stays a pure data module: no React, no network, no Date/random', () => {
    expect(source).not.toMatch(/from ['"]react['"]/);
    expect(source).not.toMatch(/\burl\(/);
    expect(source).not.toMatch(/\bfetch\(|new Date\(|Math\.random\(/);
  });
});
