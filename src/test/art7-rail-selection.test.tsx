import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ArticlePage from '../pages/Article';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

/**
 * On `/article/:id` no feed route matches the URL, so the rail would lose its
 * selection. It used to resolve the avis itself; the page now publishes the
 * medium it is showing and the header reads it — which is why these tests mount
 * the shell *and* the page rather than the header alone. The header on its own
 * has nothing to go on, and that is the point: it never fetches.
 */
const MORE = `
INSERT INTO articles (id,title,medium,excerpt,cover,author,status,published_at,likes,views)
VALUES ('les-nuits-blanches','Les nuits blanches','serie','Un excerpt.','grad','Marie-Zoé','published','2026-05-02',0,0),
       ('fragments','Fragments','doc','Un excerpt.','grad','Marie-Zoé','published','2026-04-02',0,0);
`;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/article/:id" element={<ArticlePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** The rail's medium nav (the mobile tab strip shares the label but only shows on feed routes). */
function mediaNav() {
  return within(screen.getByRole('navigation', { name: 'Médias' }));
}

describe('ART-7 rail selection on the article view', () => {
  beforeEach(() => {
    useTestDb(SEED + MORE);
  });

  it("marks the article's medium feed active — a film article activates Films", async () => {
    renderAt('/article/un-dernier-ete');
    // The selection lights up once the avis has landed *and* published its
    // medium — an effect, so it settles one tick after the article renders.
    await waitFor(() =>
      expect(mediaNav().getByRole('link', { name: 'Films' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
    expect(mediaNav().getByRole('link', { name: 'Séries' })).not.toHaveAttribute('aria-current');
  });

  it('activates the matching feed for each medium', async () => {
    const cases: Array<[string, string, string]> = [
      ['/article/les-nuits-blanches', 'Séries', 'Les nuits blanches'],
      ['/article/l-annee-de-la-pluie', 'Livres', 'L’année de la pluie'],
      ['/article/fragments', 'Docs', 'Fragments'],
    ];
    for (const [path, label, title] of cases) {
      const { unmount } = renderAt(path);
      await screen.findByRole('heading', { level: 1, name: title });
      await waitFor(() =>
        expect(mediaNav().getByRole('link', { name: label })).toHaveAttribute(
          'aria-current',
          'page',
        ),
      );
      unmount();
    }
  });

  it('leaves the rail unselected for an unknown article id', async () => {
    renderAt('/article/ceci-nexiste-pas');
    await screen.findByText('Cet avis n’existe pas.');
    for (const label of ['Films', 'Séries', 'Livres', 'Docs']) {
      expect(mediaNav().getByRole('link', { name: label })).not.toHaveAttribute('aria-current');
    }
  });

  it('leaves the rail unselected while the avis is still loading', () => {
    renderAt('/article/un-dernier-ete');
    // Before the answer, the header knows nothing — and asks nobody.
    for (const label of ['Films', 'Séries', 'Livres', 'Docs']) {
      expect(mediaNav().getByRole('link', { name: label })).not.toHaveAttribute('aria-current');
    }
  });
});
