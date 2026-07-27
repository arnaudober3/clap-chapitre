import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

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
  it('renders the listing at /admin/articles inside the admin shell', () => {
    renderAt('/admin/articles');
    expect(screen.getByTestId('admin-articles-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-placeholder-page')).toBeNull();
    expect(articlesIsCurrent()).toBe(true);
  });

  it('renders the creation form at /admin/articles/nouveau, not the :id route', () => {
    renderAt('/admin/articles/nouveau');
    expect(screen.getByTestId('admin-new-article-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toHaveValue('');
    expect(articlesIsCurrent()).toBe(true);
  });

  it('renders the editor at /admin/articles/:id', () => {
    renderAt('/admin/articles/les-nuits-blanches');
    expect(screen.getByTestId('admin-new-article-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toHaveValue('Les nuits blanches');
    expect(articlesIsCurrent()).toBe(true);
  });

  it('walks from the listing to an avis editor and back through the breadcrumb', async () => {
    const user = userEvent.setup();
    renderAt('/admin/articles');

    await user.click(screen.getByRole('link', { name: 'Un dernier été' }));
    expect(screen.getByTestId('admin-new-article-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toHaveValue('Un dernier été');

    await user.click(screen.getByRole('link', { name: 'Articles' }));
    expect(screen.getByTestId('admin-articles-page')).toBeInTheDocument();
  });

  it('keeps unknown /admin/articles/** ids inside the admin shell', () => {
    renderAt('/admin/articles/zzz');
    expect(screen.getByTestId('admin-articles-page')).toBeInTheDocument();
    expect(screen.queryByTestId('not-found-page')).toBeNull();
  });
});
