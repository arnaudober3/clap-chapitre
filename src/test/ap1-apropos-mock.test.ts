import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { apropos } from '../mock/apropos';

const root = resolve(__dirname, '../..');
const source = readFileSync(resolve(root, 'src/mock/apropos.ts'), 'utf8');
const tokens = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');

describe('AP-1 apropos mock content', () => {
  it('exposes the non-empty headline strings and three bio paragraphs', () => {
    for (const value of [
      apropos.eyebrow,
      apropos.greeting,
      apropos.name,
      apropos.intro,
      apropos.portraitLabel,
      apropos.quote,
      apropos.statsTitle,
    ]) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
    expect(apropos.eyebrow).toBe('À propos');
    expect(apropos.greeting).toBe('Bonjour, moi c’est');
    expect(apropos.name).toBe('Marie-Zoé');
    expect(apropos.statsTitle).toBe('Cette année');
    expect(apropos.quote).toMatch(/^« /);
    expect(apropos.quote).toMatch(/ »$/);
    expect(apropos.bio).toHaveLength(3);
    for (const paragraph of apropos.bio) {
      expect(paragraph.trim().length).toBeGreaterThan(0);
    }
  });

  it('lists exactly the three "Cette année" rows with finite values 63 / 28 / 6', () => {
    expect(apropos.stats).toEqual([
      { label: 'Films & séries', value: 63 },
      { label: 'Livres', value: 28 },
      { label: 'Bilans publiés', value: 6 },
    ]);
    for (const stat of apropos.stats) {
      expect(Number.isFinite(stat.value)).toBe(true);
    }
  });

  it('carries the design follow CTA pointing at /me-suivre', () => {
    expect(apropos.follow).toEqual({
      title: 'On se suit ?',
      copy: 'Le bilan du mois directement dans votre boîte mail.',
      cta: 'Me suivre →',
      to: '/me-suivre',
    });
  });

  it('is pure data and every bioEmphasis term appears in a bio paragraph', () => {
    expect(apropos.bioEmphasis.length).toBeGreaterThan(0);
    for (const term of apropos.bioEmphasis) {
      expect(apropos.bio.some((paragraph) => paragraph.includes(term))).toBe(true);
    }
    // Pure data module: no React, no network/image, no Date/random.
    expect(source).not.toMatch(/from ['"]react['"]/);
    expect(source).not.toMatch(/\burl\(/);
    expect(source).not.toMatch(/\bfetch\(|new Date\(|Math\.random\(/);
  });

  it('tokens.css adds --portrait-grad and keeps every previously defined token', () => {
    expect(tokens).toMatch(/--portrait-grad:\s*linear-gradient\(/);
    for (const token of [
      '--bg',
      '--surface',
      '--ink',
      '--accent',
      '--gold',
      '--dark-grad',
      '--font-serif',
      '--font-sans',
    ]) {
      expect(tokens).toContain(`${token}:`);
    }
  });
});
