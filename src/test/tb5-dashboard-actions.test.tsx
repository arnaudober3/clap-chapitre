import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import AdminDashboardPage from '../pages/AdminDashboard';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

beforeEach(() => {
  useTestDb(SEED);
});

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminDashboardPage />
    </MemoryRouter>,
  );
}

describe('TB-5 dashboard actions', () => {
  it('period menu opens and switching the window updates the KPIs', async () => {
    const user = userEvent.setup();
    renderDashboard();
    // Default = 30 days → the design headline figure.
    expect(await screen.findByText('8 940')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /30 derniers jours/ }));
    const listbox = screen.getByRole('listbox', { name: 'Période' });
    await user.click(within(listbox).getByRole('button', { name: '7 derniers jours' }));

    // Pill relabelled, KPI band recomputed, menu closed. (74 = 7-day Likes, a
    // value unique to the KPI band; 8 940 was the 30-day Vues figure.)
    expect(
      await screen.findByRole('button', { name: /7 derniers jours/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText('74')).toBeInTheDocument();
    expect(screen.queryByText('8 940')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('the "+ Nouvel article" action and the FAB link to the new-article form', async () => {
    renderDashboard();
    const links = await screen.findAllByRole('link', { name: 'Nouvel article' });
    expect(links.length).toBe(2); // header button + mobile FAB
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/admin/articles/nouveau');
    }
  });

  it('the newsletter "Envoyer" links to the newsletter page', async () => {
    renderDashboard();
    expect(await screen.findByRole('link', { name: 'Envoyer' })).toHaveAttribute(
      'href',
      '/admin/newsletter',
    );
  });

  it('renders the Nouvel article form at /admin/articles/nouveau with Articles active', async () => {
    renderApp('/admin/articles/nouveau');
    const page = await screen.findByTestId('admin-new-article-page');
    expect(page).toBeInTheDocument();
    // A real creation form: empty title, no category picked yet.
    expect(within(page).getByLabelText('Titre')).toHaveValue('');
    expect(within(page).getByRole('button', { name: 'Film' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // The rail keeps "Articles" selected on the deeper route.
    const articlesLinks = screen.getAllByRole('link', { name: /^Articles/ });
    expect(articlesLinks.some((l) => l.getAttribute('aria-current') === 'page')).toBe(true);
  });

  it('publishing returns to the dashboard (mock)', async () => {
    const user = userEvent.setup();
    renderApp('/admin/articles/nouveau');
    await user.click(await screen.findByRole('button', { name: 'Publier' }));
    expect(await screen.findByTestId('admin-dashboard-page')).toBeInTheDocument();
  });
});
