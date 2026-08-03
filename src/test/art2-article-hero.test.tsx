import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ArticleHero from '../pages/Article/ArticleHero';
import type { PublishedArticle } from '../../shared/content';
import type { BilanCrumb } from '../api/content';
import { aBilan, anArticle } from './fixtures';

const root = resolve(__dirname, '../..');
const heroSource = readFileSync(
  resolve(root, 'src/pages/Article/ArticleHero.tsx'),
  'utf8',
);
const css = readFileSync(
  resolve(root, 'src/pages/Article/Article.module.css'),
  'utf8',
);

const feedAvis = anArticle();
// The breadcrumb only ever shows a month and a link, so the crumb is all the
// hero is given — see BilanCrumb.
const juillet: BilanCrumb = (({ id, monthLabel, year, title }) => ({ id, monthLabel, year, title }))(
  aBilan(),
);
const bilanAvis = anArticle({ id: 'la-lumiere-du-nord', title: 'La lumière du Nord' });

function renderHero(article: PublishedArticle, bilan?: BilanCrumb) {
  return render(
    <MemoryRouter>
      <ArticleHero article={article} bilan={bilan} />
    </MemoryRouter>,
  );
}

function breadcrumb() {
  return screen.getByRole('navigation', { name: 'Fil d’Ariane' });
}

describe('ART-2 breadcrumb', () => {
  it('renders the three-crumb form for a bilan-owned avis', () => {
    renderHero(bilanAvis, juillet);
    const nav = breadcrumb();

    const lead = within(nav).getByRole('link', { name: 'Bilan culturel' });
    expect(lead).toHaveAttribute('href', '/bilan-culturel');

    const month = within(nav).getByRole('link', {
      name: `${juillet.monthLabel} ${juillet.year}`,
    });
    expect(month).toHaveAttribute('href', `/bilan-culturel?mois=${juillet.id}`);

    // The medium crumb is plain text, not a link.
    const current = within(nav).getByText('Films');
    expect(current.tagName).toBe('SPAN');
    expect(within(nav).getAllByRole('link')).toHaveLength(2);
  });

  it('collapses to a single medium crumb linking to the medium archive for a feed-only avis', () => {
    renderHero(feedAvis);
    const nav = breadcrumb();
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('Films');
    expect(links[0]).toHaveAttribute('href', '/archives/films');
    expect(within(nav).queryByText('Bilan culturel')).toBeNull();
  });

  it('points the mobile back link at the same target as the month crumb', () => {
    const { unmount } = renderHero(bilanAvis, juillet);
    expect(
      screen.getByRole('link', { name: `‹ ${juillet.monthLabel} ${juillet.year}` }),
    ).toHaveAttribute('href', `/bilan-culturel?mois=${juillet.id}`);
    unmount();

    renderHero(feedAvis);
    expect(screen.getByRole('link', { name: '‹ Films' })).toHaveAttribute(
      'href',
      '/archives/films',
    );
  });
});

describe('ART-2 hero', () => {
  it('renders one h1, the medium eyebrow, the meta line, the hook and the byline', () => {
    const { container } = renderHero(feedAvis);

    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(feedAvis.title);

    expect(screen.getByText('Film')).toBeInTheDocument();
    expect(screen.getByText(feedAvis.genreMeta!)).toBeInTheDocument();
    expect(screen.getByText(feedAvis.hook!)).toBeInTheDocument();
    expect(screen.getByText('Marie-Zoé')).toBeInTheDocument();
    expect(
      screen.getByText(
        `Publié le ${feedAvis.date} · ${feedAvis.readingTime}`,
      ),
    ).toBeInTheDocument();

    // The cover is a CSS gradient, never an image.
    const cover = screen.getByTestId('article-cover');
    expect(cover.getAttribute('style')).toContain('gradient');
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('url(');
  });

  it('degrades without genreMeta, hook or readingTime — no empty blocks, no dangling separator', () => {
    const bare: PublishedArticle = {
      ...feedAvis,
      genreMeta: undefined,
      hook: undefined,
      readingTime: undefined,
    };
    expect(() => renderHero(bare)).not.toThrow();

    expect(screen.queryByText(feedAvis.genreMeta!)).toBeNull();
    expect(screen.queryByText(feedAvis.hook!)).toBeNull();
    const byline = screen.getByText(`Publié le ${feedAvis.date}`);
    expect(byline.textContent).toBe(`Publié le ${feedAvis.date}`);
    expect(byline.textContent).not.toContain('·');
    // The meta row holds the medium eyebrow alone — no orphan dot.
    const medium = screen.getByText('Film');
    expect(medium.parentElement?.textContent).toBe('Film');
  });
});

describe('ART-2 responsive rules', () => {
  /* jsdom applies no media queries — assert the rules on the CSS text. */
  const LG = '@media (min-width: 1024px)';
  const mobileCss = css.slice(0, css.indexOf(LG));
  const desktopCss = css.slice(css.indexOf(LG));
  const ruleOf = (source: string, selector: string) => {
    const matches = [
      ...source.matchAll(
        new RegExp(`${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`, 'g'),
      ),
    ];
    return matches.length ? matches[matches.length - 1][1] : '';
  };

  it('keeps the genre meta line off the mobile cover band', () => {
    // 4b's band carries the medium eyebrow alone — no genre, no separator dot.
    expect(ruleOf(mobileCss, '.metaDot,\n.genreMeta')).toMatch(
      /display:\s*none/,
    );
    expect(ruleOf(desktopCss, '.metaDot,\n  .genreMeta')).toMatch(
      /display:\s*inline/,
    );
  });

  it('pins the desktop hero rows so the byline sits under the headline', () => {
    // Without an explicit first row the cover (spanning both) splits the
    // leftover height and pushes the foot down its middle.
    const heroMain = ruleOf(desktopCss, '.heroMain');
    expect(heroMain).toMatch(/grid-template-rows:\s*auto 1fr/);
    expect(heroMain).toMatch(/["']cover foot["']/);
    expect(ruleOf(desktopCss, '.heroFoot')).toMatch(/grid-area:\s*foot/);
  });
});

describe('ART-2 tokens', () => {
  it('uses no raw Salon hex colour literal', () => {
    expect(heroSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
