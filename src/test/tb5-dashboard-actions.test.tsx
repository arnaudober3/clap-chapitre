import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import AdminDashboardPage from '../pages/AdminDashboard';

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
    expect(screen.getByText('8 940')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /30 derniers jours/ }));
    const listbox = screen.getByRole('listbox', { name: 'Période' });
    await user.click(within(listbox).getByRole('button', { name: '7 derniers jours' }));

    // Pill relabelled, KPI band recomputed, menu closed. (74 = 7-day Likes, a
    // value unique to the KPI band; 8 940 was the 30-day Vues figure.)
    expect(screen.getByRole('button', { name: /7 derniers jours/ })).toBeInTheDocument();
    expect(screen.getByText('74')).toBeInTheDocument();
    expect(screen.queryByText('8 940')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('the "+ Nouvel article" action and the FAB link to the new-article form', () => {
    renderDashboard();
    const links = screen.getAllByRole('link', { name: 'Nouvel article' });
    expect(links.length).toBe(2); // header button + mobile FAB
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/admin/articles/nouveau');
    }
  });

  it('the newsletter "Envoyer" links to the newsletter page', () => {
    renderDashboard();
    expect(screen.getByRole('link', { name: 'Envoyer' })).toHaveAttribute(
      'href',
      '/admin/newsletter',
    );
  });

  it('renders the Nouvel article form at /admin/articles/nouveau with Articles active', () => {
    renderApp('/admin/articles/nouveau');
    const page = screen.getByTestId('admin-new-article-page');
    expect(page).toBeInTheDocument();
    // Prefilled title + category chip pressed.
    expect(within(page).getByLabelText('Titre')).toHaveValue('Un dernier été');
    expect(within(page).getByRole('button', { name: 'Film' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The rail keeps "Articles" selected on the deeper route.
    const articlesLinks = screen.getAllByRole('link', { name: /^Articles/ });
    expect(articlesLinks.some((l) => l.getAttribute('aria-current') === 'page')).toBe(true);
  });

  it('publishing returns to the dashboard (mock)', async () => {
    const user = userEvent.setup();
    renderApp('/admin/articles/nouveau');
    await user.click(screen.getByRole('button', { name: 'Publier' }));
    expect(screen.getByTestId('admin-dashboard-page')).toBeInTheDocument();
  });
});
