import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const root = resolve(__dirname, '../..');

const bilanCss = readFileSync(
  resolve(root, 'src/pages/BilanCulturel/BilanCulturel.module.css'),
  'utf8',
);
const articleCss = readFileSync(
  resolve(root, 'src/pages/Article/Article.module.css'),
  'utf8',
);

/** Return the body of the last rule named `.${name}` in `source`. */
const ruleOf = (source: string, name: string) => {
  const matches = [
    ...source.matchAll(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`, 'g')),
  ];
  return matches.length ? matches[matches.length - 1][1] : '';
};

/**
 * Trims the line box to the cap-height/baseline edges so flex centres the
 * actual letter block instead of the leaded line box. Metric-based, so it
 * holds for any initial — and it acts on the glyph, not the whole badge (a
 * `transform` on the flex container would just move the entire circle).
 */
const TEXT_BOX_TRIM = /text-box:\s*trim-both\s+cap\s+alphabetic/;
/** The glyph correction must not sit on a transform of the whole badge. */
const NO_TRANSFORM = /transform:/;

describe('DEV-54 Bilan Culturel comment avatar', () => {
  const rule = ruleOf(bilanCss, 'commentAvatar');

  it('optically centres the glyph by trimming the line box, not moving the badge', () => {
    expect(rule).toMatch(TEXT_BOX_TRIM);
    expect(rule).not.toMatch(NO_TRANSFORM);
  });

  it('preserves its flex centering and geometry', () => {
    expect(rule).toMatch(/display:\s*flex/);
    expect(rule).toMatch(/align-items:\s*center/);
    expect(rule).toMatch(/justify-content:\s*center/);
    expect(rule).toMatch(/width:\s*38px/);
    expect(rule).toMatch(/height:\s*38px/);
    expect(rule).toMatch(/border-radius:\s*var\(--radius-pill\)/);
    expect(rule).toMatch(/line-height:\s*1/);
  });
});

describe('DEV-54 Article comment avatar', () => {
  /* The mobile override lives inside the @media (min-width: 1024px) block;
     slice on that marker and read the base rule from the mobile slice. */
  const LG = '@media (min-width: 1024px)';
  const mobileCss = articleCss.slice(0, articleCss.indexOf(LG));
  const rule = ruleOf(mobileCss, 'commentAvatar');

  it('optically centres the glyph by trimming the line box, not moving the badge', () => {
    expect(rule).toMatch(TEXT_BOX_TRIM);
    expect(rule).not.toMatch(NO_TRANSFORM);
  });

  it('preserves its flex centering and geometry', () => {
    expect(rule).toMatch(/display:\s*flex/);
    expect(rule).toMatch(/align-items:\s*center/);
    expect(rule).toMatch(/justify-content:\s*center/);
    expect(rule).toMatch(/width:\s*32px/);
    expect(rule).toMatch(/height:\s*32px/);
    expect(rule).toMatch(/border-radius:\s*50%/);
    expect(rule).toMatch(/line-height:\s*1/);
  });
});
