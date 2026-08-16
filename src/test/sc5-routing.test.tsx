import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { anArticle, SEED } from './fixtures';

const avis = anArticle();
import { useTestDb } from './api-server';

// The pages these routes render read the API, so the suite needs content.
beforeEach(() => {
  useTestDb(SEED);
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('SC-5 routing', () => {
  // The seed publishes one film and one livre; the other two media hold nothing,
  // which is a state the route has to render just as well.
  const cases: Array<[string, string | null]> = [
    ['/films', 'Un dernier été'],
    ['/livres', 'L’année de la pluie'],
    ['/series', null],
    ['/docs', null],
  ];

  it.each(cases)('renders the feed for %s inside the Layout', async (path, hero) => {
    renderAt(path);
    // Layout chrome present (brand "et"), plus the page's own content.
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    if (hero) {
      expect(await screen.findByRole('heading', { name: hero })).toBeInTheDocument();
    } else {
      expect(
        await screen.findByText('Aucun avis pour ce médium pour l’instant.'),
      ).toBeInTheDocument();
    }
  });

  it('renders the article page inside the Layout for /article/:id', async () => {
    // DEV-19-03 replaced the placeholder: a known id renders the real avis,
    // an unknown one the Salon not-found state (no article heading).
    renderAt(`/article/${avis.id}`);
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    // Queried after the wait, not before: the page swaps its loading shell for
    // the article itself, so the container found first is no longer on screen.
    const heading = await screen.findByRole('heading', { level: 1, name: avis.title });
    expect(within(screen.getByTestId('article-page')).getByRole('heading', { level: 1 })).toBe(
      heading,
    );
  });

  it('renders the not-found state for an unknown /article/:id', async () => {
    renderAt('/article/42');
    const page = screen.getByTestId('article-page');
    expect(await within(page).findByText(/n’existe pas/)).toBeInTheDocument();
    expect(within(page).queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('renders the Bilan culturel page inside the Layout for /bilan-culturel', async () => {
    renderAt('/bilan-culturel');
    // Layout chrome present (brand "et"), plus the real design-2a page. Per the
    // design, "Bilan culturel" is an eyebrow (not a heading) — the H1 is the month.
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    const page = screen.getByTestId('bilan-culturel-page');
    // "Bilan culturel" also appears as a nav link in the Layout — scope to the page eyebrow.
    expect(await within(page).findByText('Bilan culturel')).toBeInTheDocument();
  });

  it('renders the AvisArchives archive inside the Layout for /archives', async () => {
    renderAt('/archives');
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    const page = screen.getByTestId('avis-archives-page');
    expect(
      within(page).getByRole('heading', { level: 1, name: 'Tous les avis' }),
    ).toBeInTheDocument();
  });

  it('renders the BilanCulturelArchives page inside the Layout for /bilan-culturel/archives', async () => {
    renderAt('/bilan-culturel/archives');
    // Layout chrome present (brand "et"), plus the real design-2b page. Per the
    // design, "Bilan culturel" is an eyebrow — the H1 is "Tous les bilans".
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    const page = screen.getByTestId('bilan-culturel-archives-page');
    expect(
      within(page).getByRole('heading', { level: 1, name: 'Tous les bilans' }),
    ).toBeInTheDocument();
  });

  it('renders the À propos page inside the Layout for /a-propos', async () => {
    renderAt('/a-propos');
    // Layout chrome present (brand "et"), plus the real design-3b page. Per the
    // design, "À propos" is an eyebrow (and a nav link) — the H1 is the greeting.
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    // Queried after the wait: the page replaces its loading shell wholesale.
    await screen.findByTestId('a-propos-hero');
    const page = screen.getByTestId('a-propos-page');
    expect(within(page).getByText('À propos')).toBeInTheDocument();
    expect(
      within(page).getByRole('heading', { level: 1, name: /Marie-Zoé/ }),
    ).toBeInTheDocument();
  });

  it('renders the Me suivre page inside the Layout for /me-suivre', async () => {
    renderAt('/me-suivre');
    // Layout chrome present (brand "et"), plus the real design-3c page. Per the
    // design, "Me suivre" is an eyebrow (and a nav link) — the H1 is the title.
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    const page = screen.getByTestId('me-suivre-page');
    expect(await within(page).findByText('Me suivre')).toBeInTheDocument();
    expect(
      within(page).getByRole('heading', { level: 1, name: 'On garde le contact' }),
    ).toBeInTheDocument();
  });

  it('redirects / to /films with the Films nav item active', async () => {
    renderAt('/');
    // The rail and the mobile medium tab strip both render a "Films" link, so
    // assert that at least one of them carries the active state.
    const filmsLinks = screen.getAllByRole('link', { name: 'Films' });
    expect(filmsLinks.some((link) => link.getAttribute('aria-current') === 'page')).toBe(true);
  });

  it('renders NotFound for an unknown route', async () => {
    renderAt('/n-existe-pas');
    const page = screen.getByTestId('not-found-page');
    expect(
      within(page).getByRole('heading', { name: /Ce chapitre reste à écrire/ }),
    ).toBeInTheDocument();
    expect(
      within(page).getByRole('link', { name: /Retour à l'accueil/ }),
    ).toBeInTheDocument();
  });

  it('marks the Home page with the "livre" medium on /livres', async () => {
    renderAt('/livres');
    expect(screen.getByTestId('home-page')).toHaveAttribute('data-medium', 'livre');
  });
});
