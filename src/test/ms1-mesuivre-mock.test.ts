import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { meSuivre } from '../mock/mesuivre';

const root = resolve(__dirname, '../..');
const source = readFileSync(resolve(root, 'src/mock/mesuivre.ts'), 'utf8');
const tokens = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');

describe('MS-1 mesuivre mock content', () => {
  it('exposes the non-empty head strings from design 3c', () => {
    for (const value of [meSuivre.eyebrow, meSuivre.title, meSuivre.intro]) {
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
    }
    expect(meSuivre.eyebrow).toBe('Me suivre');
    expect(meSuivre.title).toBe('On garde le contact');
    expect(meSuivre.intro).toBe(
      'Choisissez votre endroit préféré — je poste au fil de l’eau sur les réseaux, et je résume tout une fois par mois dans la newsletter.',
    );
  });

  it('carries the five newsletter design strings', () => {
    expect(meSuivre.newsletter).toEqual({
      eyebrow: 'La newsletter',
      title: 'Le courrier du mois',
      copy: 'Le bilan complet, les coups de cœur et une reco rien que pour vous. Une fois par mois, jamais plus.',
      placeholder: 'votre@email.fr',
      cta: 'S’abonner',
    });
  });

  it('lists exactly the four socials, in order, with unique keys and full content', () => {
    expect(meSuivre.socials).toHaveLength(4);
    const keys = meSuivre.socials.map((social) => social.key);
    expect(keys).toEqual(['threads', 'letterboxd', 'babelio', 'linkedin']);
    expect(new Set(keys).size).toBe(keys.length);

    expect(meSuivre.socials.map((social) => social.name)).toEqual([
      'Threads',
      'Letterboxd',
      'Babelio',
      'LinkedIn',
    ]);
    expect(meSuivre.socials.map((social) => social.handle)).toEqual([
      '@mariezoe · réactions à chaud',
      '@mariezoe · tous mes films',
      '@mariezoe · ma bibliothèque',
      'Marie-Zoé · le côté pro',
    ]);
    expect(meSuivre.socials.map((social) => social.glyph)).toEqual([
      '@',
      '▶',
      'B',
      'in',
    ]);

    for (const social of meSuivre.socials) {
      expect(social.name.length).toBeGreaterThan(0);
      expect(social.handle.length).toBeGreaterThan(0);
      expect(social.glyph.length).toBeGreaterThan(0);
      expect(social.cta).toBe('Suivre');
    }
  });

  it('links every social to an absolute https URL, never "#" or empty', () => {
    for (const social of meSuivre.socials) {
      expect(social.url.startsWith('https://')).toBe(true);
      expect(social.url).not.toBe('#');
      expect(social.url.length).toBeGreaterThan('https://'.length);
    }
  });

  it('is a pure data module — no React, no network, no Date/random', () => {
    expect(source).not.toMatch(/from ['"]react['"]/);
    expect(source).not.toMatch(/\bfetch\(|Date\.now\(|new Date\(|Math\.random\(/);
    expect(source).not.toMatch(/\burl\(/);
  });

  it('tokens.css adds the four social swatches and keeps every previous token', () => {
    for (const token of [
      '--social-threads',
      '--social-letterboxd',
      '--social-babelio',
      '--social-linkedin',
    ]) {
      expect(tokens).toContain(`${token}:`);
    }
    expect(tokens).toContain('--social-threads: #221a14');
    expect(tokens).toContain('--social-letterboxd: #2b6a4a');
    expect(tokens).toContain('--social-babelio: #9a3b2a');
    expect(tokens).toContain('--social-linkedin: #1f5079');

    for (const token of [
      '--bg',
      '--surface',
      '--surface-alt',
      '--ink',
      '--accent',
      '--gold',
      '--dark-grad',
      '--portrait-grad',
      '--font-serif',
      '--font-sans',
    ]) {
      expect(tokens).toContain(`${token}:`);
    }
  });
});
