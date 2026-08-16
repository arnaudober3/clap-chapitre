import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import AdminDashboardPage from '../pages/AdminDashboard';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

/**
 * Seven views and six likes across the last 30 days, three views and two
 * likes of which fall inside the last 7 — enough for the two periods to show
 * genuinely different KPI figures when the menu switches between them.
 */
const WITH_EVENTS = `${SEED}
INSERT INTO view_hits (target_type, target_id, viewed_at) VALUES
  ('article', 'un-dernier-ete', datetime('now', '-1 days')),
  ('article', 'un-dernier-ete', datetime('now', '-2 days')),
  ('bilan', '2026-07', datetime('now', '-3 days')),
  ('article', 'l-annee-de-la-pluie', datetime('now', '-10 days')),
  ('bilan', '2026-07', datetime('now', '-12 days')),
  ('article', 'un-dernier-ete', datetime('now', '-15 days')),
  ('article', 'l-annee-de-la-pluie', datetime('now', '-25 days'));

INSERT INTO likes (target_type, target_id, ip_hash, created_at) VALUES
  ('article', 'un-dernier-ete', 'tb5-1', datetime('now', '-1 days')),
  ('bilan', '2026-07', 'tb5-2', datetime('now', '-4 days')),
  ('article', 'l-annee-de-la-pluie', 'tb5-3', datetime('now', '-9 days')),
  ('bilan', '2026-07', 'tb5-4', datetime('now', '-14 days')),
  ('article', 'un-dernier-ete', 'tb5-5', datetime('now', '-18 days')),
  ('article', 'l-annee-de-la-pluie', 'tb5-6', datetime('now', '-28 days'));
`;

beforeEach(() => {
  useTestDb(WITH_EVENTS);
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

/**
 * The stat card for `label`: its value and delta live in the same cell.
 *
 * A period switch re-fetches, and the page's own `loading`/`error` branches
 * render the same `<section data-testid="admin-dashboard-page">` React
 * reconciles in place — so between the click and the second batch landing,
 * that section briefly holds a spinner with no "Vues"/"Likes"/… label at
 * all. `findByText` (not `getByText`) is what makes this wait the update out
 * instead of throwing on that transient frame.
 */
async function statCell(page: HTMLElement, label: string): Promise<HTMLElement> {
  return (await within(page).findByText(label)).parentElement as HTMLElement;
}

describe('TB-5 dashboard actions', () => {
  it('period menu opens and switching the window updates the KPIs', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const page = await screen.findByTestId('admin-dashboard-page');
    // Default = 30 days → all 7 view_hits fall inside the window.
    expect(await within(await statCell(page, 'Vues')).findByText('7')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /30 derniers jours/ }));
    const listbox = screen.getByRole('listbox', { name: 'Période' });
    await user.click(within(listbox).getByRole('button', { name: '7 derniers jours' }));

    // Pill relabelled, and the KPI band recomputed to the 3 view_hits inside
    // 7 days once that second fetch resolves; menu closed.
    expect(
      await screen.findByRole('button', { name: /7 derniers jours/ }),
    ).toBeInTheDocument();
    expect(await within(await statCell(page, 'Vues')).findByText('3')).toBeInTheDocument();
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

  it('publishing an incomplete avis stays put and says what is missing', async () => {
    const user = userEvent.setup();
    renderApp('/admin/articles/nouveau');

    // The form used to navigate away on any click, because it stored nothing.
    // Now a save that cannot happen must keep the editor's work on screen.
    await user.click(await screen.findByRole('button', { name: 'Publier' }));
    expect(await screen.findByText('Il manque le titre.')).toBeInTheDocument();
    expect(screen.getByTestId('admin-new-article-page')).toBeInTheDocument();
  });
});
