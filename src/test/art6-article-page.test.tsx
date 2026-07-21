import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ArticlePage from '../pages/Article';
import { articleById, articleNeighbours } from '../mock/articles';
import { bilans } from '../mock/bilans';

const root = resolve(__dirname, '../..');
const articleDir = resolve(root, 'src/pages/Article');

const avis = articleById('un-dernier-ete')!;
const juin = bilans[0];
const bilanAvis = juin.avis[0];

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
  it('assembles the whole avis at /article/un-dernier-ete', () => {
    const { container } = renderAt(`/article/${avis.id}`);
    const page = screen.getByTestId('article-page');

    expect(within(page).getByRole('heading', { level: 1 })).toHaveTextContent(
      avis.title,
    );
    expect(
      within(page).getByRole('navigation', { name: 'Fil d’Ariane' }),
    ).toBeInTheDocument();

    // Body + pull quote.
    expect(screen.getAllByTestId('article-paragraph').length).toBeGreaterThan(1);
    expect(screen.getByTestId('drop-cap')).toBeInTheDocument();
    expect(screen.getByTestId('article-pull-quote')).toHaveTextContent(
      avis.pullQuote!,
    );

    // Related, verdict, social, prev/next, comments.
    expect(screen.getAllByTestId('related-card')).toHaveLength(2);
    expect(screen.getByTestId('article-for-those-who')).toHaveTextContent(
      avis.forThoseWho!,
    );
    expect(screen.getByTestId('article-social')).toBeInTheDocument();

    const { next } = articleNeighbours(avis.id);
    expect(screen.getByTestId('next-card')).toHaveAttribute(
      'href',
      `/article/${next!.id}`,
    );

    expect(
      screen.getByRole('heading', { name: 'Commentaires · 3' }),
    ).toBeInTheDocument();

    expect(container.querySelector('img')).toBeNull();
  });

  it('renders the Salon not-found state for an unknown id, with no article title', () => {
    expect(() => renderAt('/article/ceci-nexiste-pas')).not.toThrow();
    expect(screen.getByTestId('article-page')).toBeInTheDocument();
    expect(screen.getByText('Cet avis n’existe pas.')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/films');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.queryByTestId('article-body')).toBeNull();
  });

  it('resolves a bilan-owned avis and derives its breadcrumb through the owning month', () => {
    renderAt(`/article/${bilanAvis.id}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      bilanAvis.title,
    );
    const nav = screen.getByRole('navigation', { name: 'Fil d’Ariane' });
    expect(
      within(nav).getByRole('link', { name: 'Bilan culturel' }),
    ).toHaveAttribute('href', '/bilan-culturel');
    expect(
      within(nav).getByRole('link', {
        name: `${juin.monthLabel} ${juin.year}`,
      }),
    ).toHaveAttribute('href', `/bilan-culturel?mois=${juin.id}`);
  });

  it('re-renders in place when a related card is clicked', () => {
    renderAt(`/article/${avis.id}`);
    const card = screen.getAllByTestId('related-card')[0];
    const target = articleById('l-annee-de-la-pluie')!;

    fireEvent.click(card);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      target.title,
    );
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
