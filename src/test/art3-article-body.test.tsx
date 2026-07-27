import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ArticleBody, { ForThoseWho } from '../pages/Article/ArticleBody';
import RelatedGrid from '../pages/Article/RelatedGrid';
import { articleById } from '../mock/articles';
import type { PublishedArticle } from '../mock/types';

const root = resolve(__dirname, '../..');
const bodySource = readFileSync(
  resolve(root, 'src/pages/Article/ArticleBody.tsx'),
  'utf8',
);
const relatedSource = readFileSync(
  resolve(root, 'src/pages/Article/RelatedGrid.tsx'),
  'utf8',
);
const css = readFileSync(
  resolve(root, 'src/pages/Article/Article.module.css'),
  'utf8',
);

const avis = articleById('un-dernier-ete')!;
const paragraphs = avis.body!.split('\n\n');

describe('ART-3 ArticleBody', () => {
  it('renders every paragraph, the drop cap and the pull quote', () => {
    render(<ArticleBody article={avis} />);

    const rendered = screen.getAllByTestId('article-paragraph');
    expect(rendered).toHaveLength(paragraphs.length);
    expect(paragraphs.length).toBeGreaterThanOrEqual(5);

    const dropCap = screen.getByTestId('drop-cap');
    expect(dropCap).toHaveTextContent(paragraphs[0].charAt(0));
    expect(rendered[0]).toContainElement(dropCap);
    expect(rendered[0].textContent).toBe(paragraphs[0]);

    const quote = screen.getByTestId('article-pull-quote');
    expect(quote.tagName).toBe('BLOCKQUOTE');
    expect(quote).toHaveTextContent(avis.pullQuote!);
  });

  it('falls back to the excerpt when there is no body, and skips empty paragraphs', () => {
    const noBody: PublishedArticle = { ...avis, body: undefined, pullQuote: undefined };
    expect(() => render(<ArticleBody article={noBody} />)).not.toThrow();

    const rendered = screen.getAllByTestId('article-paragraph');
    expect(rendered).toHaveLength(1);
    expect(rendered[0].textContent).toBe(avis.excerpt);
    expect(screen.getByTestId('drop-cap')).toHaveTextContent(
      avis.excerpt.charAt(0),
    );
    expect(screen.queryByTestId('article-pull-quote')).toBeNull();
  });

  it('falls back to the excerpt for an empty or whitespace-only body too', () => {
    for (const body of ['', '   \n\n  ']) {
      const { unmount } = render(<ArticleBody article={{ ...avis, body }} />);
      const rendered = screen.getAllByTestId('article-paragraph');
      expect(rendered).toHaveLength(1);
      expect(rendered[0].textContent).toBe(avis.excerpt);
      expect(screen.getByTestId('drop-cap')).toBeInTheDocument();
      unmount();
    }
  });

  it('renders no blockquote when the avis carries no pull quote', () => {
    render(<ArticleBody article={{ ...avis, pullQuote: undefined }} />);
    expect(screen.queryByTestId('article-pull-quote')).toBeNull();
  });
});

describe('ART-3 RelatedGrid', () => {
  it('renders the two related cards with their links, notes, media and gradient thumbs', () => {
    const { container } = render(
      <MemoryRouter>
        <RelatedGrid article={avis} />
      </MemoryRouter>,
    );

    expect(screen.getByText('À rapprocher de')).toBeInTheDocument();
    const cards = screen.getAllByTestId('related-card');
    expect(cards).toHaveLength(2);

    expect(cards[0]).toHaveAttribute('href', '/article/l-annee-de-la-pluie');
    expect(cards[1]).toHaveAttribute('href', '/article/les-nuits-blanches');
    expect(cards[0]).toHaveTextContent(avis.related![0].note);
    expect(cards[1]).toHaveTextContent(avis.related![1].note);
    expect(cards[0]).toHaveTextContent('Livre');
    expect(cards[1]).toHaveTextContent('Série');

    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('url(');
  });

  it('renders nothing — eyebrow included — when nothing resolves', () => {
    const { container: empty } = render(
      <MemoryRouter>
        <RelatedGrid article={{ ...avis, related: [] }} />
      </MemoryRouter>,
    );
    expect(empty).toBeEmptyDOMElement();

    const { container: unknown } = render(
      <MemoryRouter>
        <RelatedGrid
          article={{ ...avis, related: [{ id: 'nope', note: 'nope' }] }}
        />
      </MemoryRouter>,
    );
    expect(unknown).toBeEmptyDOMElement();
    expect(screen.queryByText('À rapprocher de')).toBeNull();
  });
});

describe('ART-3 ForThoseWho', () => {
  it('renders the verdict panel, and nothing when the line is missing', () => {
    const { unmount } = render(<ForThoseWho article={avis} />);
    expect(screen.getByTestId('article-for-those-who')).toHaveTextContent(
      avis.forThoseWho!,
    );
    expect(screen.getByText('Pour ceux qui…')).toBeInTheDocument();
    unmount();

    const { container } = render(
      <ForThoseWho article={{ ...avis, forThoseWho: undefined }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ART-3 tokens', () => {
  it('uses no raw Salon hex colour literal', () => {
    expect(bodySource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(relatedSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
