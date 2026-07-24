import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from '../pages/AdminDashboard';
import { leaderboardRanked, drafts } from '../mock/dashboard';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminDashboardPage />
    </MemoryRouter>,
  );
}

describe('TB-3 dashboard page', () => {
  it('renders the title, KPIs and primary action', () => {
    renderPage();
    const page = screen.getByTestId('admin-dashboard-page');
    expect(within(page).getByRole('heading', { level: 1 })).toHaveTextContent('Tableau de bord');
    for (const label of ['Vues', 'Likes', 'Commentaires', 'Partages']) {
      expect(within(page).getByText(label)).toBeInTheDocument();
    }
    expect(within(page).getByText('8 940')).toBeInTheDocument();
    // The header's primary action carries the visible label (the FAB only has an
    // aria-label), so match on visible text to target it unambiguously.
    expect(within(page).getByText('Nouvel article')).toBeInTheDocument();
  });

  it('lists every leaderboard publication', () => {
    renderPage();
    for (const entry of leaderboardRanked()) {
      // Fragments also appears as a draft, so allow multiple occurrences.
      expect(screen.getAllByText(entry.title).length).toBeGreaterThan(0);
    }
  });

  it('shows the drafts to finish and the newsletter status', () => {
    renderPage();
    expect(screen.getByText('À terminer')).toBeInTheDocument();
    for (const draft of drafts()) {
      expect(screen.getAllByText(draft.title).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/1 284 abonnés/)).toBeInTheDocument();
  });
});
