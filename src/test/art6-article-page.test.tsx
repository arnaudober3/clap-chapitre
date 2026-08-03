import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ArticlePage from '../pages/Article';
import { anArticle, SEED } from './fixtures';
import { useTestDb } from './api-server';

const root = resolve(__dirname, '../..');
const articleDir = resolve(root, 'src/pages/Article');

const avis = anArticle();
/** The month the seed attaches both avis to. */
const juillet = { id: '2026-07', monthLabel: 'Juillet', year: 2026 };
/** The seed's second avis, the one the month also holds. */
const bilanAvis = anArticle({ id: 'l-annee-de-la-pluie', title: 'L’année de la pluie' });

beforeEach(() => {
  useTestDb(SEED);
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/article/:id" element={<ArticlePage />} />
        <Route path="/films" element={<p>Derniers avis</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ART-6 ArticlePage', () => {
  it('assembles the whole avis at /article/un-dernier-ete', async () => {
    const { container } = renderAt(`/article/${avis.id}`);
    // Queried after the wait: the page swaps its loading shell for the article.
    await screen.findByRole('heading', { level: 1, name: avis.title });
    const page = screen.getByTestId('article-page');

    expect(
      within(page).getByRole('navigation', { name: 'Fil d’Ariane' }),
    ).toBeInTheDocument();

    // Body + pull quote.
    expect(screen.getAllByTestId('article-paragraph').length).toBeGreaterThan(1);
    expect(screen.getByTestId('drop-cap')).toBeInTheDocument();
    expect(screen.getByTestId('article-pull-quote')).toHaveTextContent(
      avis.pullQuote!,
    );

    // Related, verdict, social, prev/next, comments. The seed gives this avis
    // one neighbour to point at.
    expect(screen.getAllByTestId('related-card')).toHaveLength(1);
    expect(screen.getByTestId('article-for-those-who')).toHaveTextContent(
      avis.forThoseWho!,
    );
    expect(screen.getByTestId('article-social')).toBeInTheDocument();

    // The seed's newest avis has no newer neighbour, so only "précédent" shows.
    expect(screen.queryByTestId('next-card')).toBeNull();
    expect(screen.getByTestId('prev-card')).toHaveAttribute(
      'href',
      '/article/l-annee-de-la-pluie',
    );

    // Two entries and one reply.
    expect(
      screen.getByRole('heading', { name: 'Commentaires · 2' }),
    ).toBeInTheDocument();

    expect(container.querySelector('img')).toBeNull();
  });

  it('renders the Salon not-found state for an unknown id, with no article title', async () => {
    expect(() => renderAt('/article/ceci-nexiste-pas')).not.toThrow();
    expect(await screen.findByText('Cet avis n’existe pas.')).toBeInTheDocument();
    expect(screen.getByTestId('article-page')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/films');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.queryByTestId('article-body')).toBeNull();
  });

  it('resolves a bilan-owned avis and derives its breadcrumb through the owning month', async () => {
    renderAt(`/article/${bilanAvis.id}`);
    expect(
      await screen.findByRole('heading', { level: 1, name: bilanAvis.title }),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Fil d’Ariane' });
    expect(
      within(nav).getByRole('link', { name: 'Bilan culturel' }),
    ).toHaveAttribute('href', '/bilan-culturel');
    expect(
      within(nav).getByRole('link', {
        name: `${juillet.monthLabel} ${juillet.year}`,
      }),
    ).toHaveAttribute('href', `/bilan-culturel?mois=${juillet.id}`);
  });

  it('re-renders in place when a related card is clicked', async () => {
    renderAt(`/article/${avis.id}`);
    await screen.findAllByTestId('related-card');
    fireEvent.click(screen.getAllByTestId('related-card')[0]);

    expect(
      await screen.findByRole('heading', { level: 1, name: bilanAvis.title }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('article-page')).toBeInTheDocument();
  });
});

describe('ART-6 tokens', () => {
  it('has no raw hex colour and no image cover anywhere under src/pages/Article', () => {
    const files = readdirSync(articleDir);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(resolve(articleDir, file), 'utf8');
      expect(source, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source, file).not.toMatch(/<img|url\(/);
    }
  });
});
