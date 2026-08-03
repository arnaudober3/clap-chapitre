import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from '../pages/AdminDashboard';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

/**
 * The dashboard's figures: the KPI band and the trend are stored, the palmarès
 * and the drafts list are derived from the content tables — so the seed's own
 * avis and bilan are what the ranking ranks.
 */
const DASHBOARD = `${SEED}
INSERT INTO stat_kpis (period_id,key,label,value,delta_pct,position)
VALUES ('30j','comments','Commentaires',46,12,3),('30j','shares','Partages',105,23,4);
`;

beforeEach(() => {
  useTestDb(DASHBOARD);
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminDashboardPage />
    </MemoryRouter>,
  );
}

describe('TB-3 dashboard page', () => {
  it('renders the title, KPIs and primary action', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Tableau de bord' });
    const page = screen.getByTestId('admin-dashboard-page');
    for (const label of ['Vues', 'Likes', 'Commentaires', 'Partages']) {
      expect(within(page).getByText(label)).toBeInTheDocument();
    }
    expect(within(page).getByText('8 940')).toBeInTheDocument();
    // The header's primary action carries the visible label (the FAB only has an
    // aria-label), so match on visible text to target it unambiguously.
    expect(within(page).getByText('Nouvel article')).toBeInTheDocument();
  });

  it('lists every leaderboard publication', async () => {
    renderPage();
    await screen.findByText('Palmarès des publications');
    // Ranked by views: the bilan leads, then the two published avis. The draft
    // is not ranked — it has no audience yet.
    for (const title of ['Les longues soirées', 'Un dernier été', 'L’année de la pluie']) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }
  });

  it('shows the drafts to finish and the newsletter status', async () => {
    renderPage();
    expect(await screen.findByText('À terminer')).toBeInTheDocument();
    expect(screen.getAllByText('Contre-champs').length).toBeGreaterThan(0);
    // The newsletter card is the one figure still coming from the mock: sending
    // e-mail is outside this change's scope.
    expect(screen.getByText(/1 284 abonnés/)).toBeInTheDocument();
  });
});
