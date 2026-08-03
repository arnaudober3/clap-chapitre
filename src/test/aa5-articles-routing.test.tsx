import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { SEED } from './fixtures';
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

/** The rail keeps "Articles" (badge included) current across the whole section. */
function articlesIsCurrent() {
  return screen
    .getAllByRole('link', { name: /^Articles/ })
    .some((link) => link.getAttribute('aria-current') === 'page');
}

describe('AA-5 admin articles routing', () => {
  it('renders the listing at /admin/articles inside the admin shell', async () => {
    renderAt('/admin/articles');
    expect(await screen.findByTestId('admin-articles-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-not-found-page')).toBeNull();
    expect(articlesIsCurrent()).toBe(true);
  });

  it('renders the creation form at /admin/articles/nouveau, not the :id route', async () => {
    renderAt('/admin/articles/nouveau');
    expect(await screen.findByTestId('admin-new-article-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toHaveValue('');
    expect(articlesIsCurrent()).toBe(true);
  });

  it('renders the editor at /admin/articles/:id', async () => {
    // An avis the shared seed does not carry — the route resolves whatever id it
    // is given, so the test brings its own.
    useTestDb(`${SEED}
      INSERT INTO articles (id,title,medium,excerpt,cover,author,status,published_at,likes,views)
      VALUES ('les-nuits-blanches','Les nuits blanches','serie','Un excerpt.','grad','Marie-Zoé','published','2026-05-02',0,0);
    `);
    renderAt('/admin/articles/les-nuits-blanches');
    expect(await screen.findByTestId('admin-new-article-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toHaveValue('Les nuits blanches');
    expect(articlesIsCurrent()).toBe(true);
  });

  it('walks from the listing to an avis editor and back through the breadcrumb', async () => {
    const user = userEvent.setup();
    renderAt('/admin/articles');

    await user.click(await screen.findByRole('link', { name: 'Un dernier été' }));
    expect(await screen.findByTestId('admin-new-article-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toHaveValue('Un dernier été');

    await user.click(screen.getByRole('link', { name: 'Articles' }));
    expect(await screen.findByTestId('admin-articles-page')).toBeInTheDocument();
  });

  it('keeps unknown /admin/articles/** ids inside the admin shell', async () => {
    renderAt('/admin/articles/zzz');
    expect(await screen.findByTestId('admin-articles-page')).toBeInTheDocument();
    expect(screen.queryByTestId('not-found-page')).toBeNull();
  });
});
