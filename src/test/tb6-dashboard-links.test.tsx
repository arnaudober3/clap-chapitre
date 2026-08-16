import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import AdminDashboardPage from '../pages/AdminDashboard';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

/**
 * The seed has one draft avis and no draft bilan, and the palmarès would only
 * ever show avis links without one — so "À terminer" gets a month in progress,
 * which is the row that has to land in the *bilan* editor rather than the avis
 * one.
 */
const DASHBOARD = `${SEED}
INSERT INTO bilans (id,year,month,month_label,title,mood,status,published_at,views,likes)
VALUES ('2026-08',2026,8,'Août','Le mois qui vient','En cours.','draft',NULL,0,0);
`;

beforeEach(() => {
  useTestDb(DASHBOARD);
});

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminDashboardPage />
    </MemoryRouter>,
  );
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('TB-6 dashboard rows link to their editor', () => {
  it('links a palmarès avis to the avis editor', async () => {
    renderDashboard();
    expect(await screen.findByRole('link', { name: 'Un dernier été' })).toHaveAttribute(
      'href',
      '/admin/articles/un-dernier-ete',
    );
    expect(screen.getByRole('link', { name: 'L’année de la pluie' })).toHaveAttribute(
      'href',
      '/admin/articles/l-annee-de-la-pluie',
    );
  });

  it('links a palmarès bilan to the bilan editor, not the avis one', async () => {
    renderDashboard();
    // The row that proves the kind is read: an avis and a bilan sit in the same
    // ranking, and only the kind tells them apart.
    expect(await screen.findByRole('link', { name: 'Les longues soirées' })).toHaveAttribute(
      'href',
      '/admin/bilans/2026-07',
    );
  });

  it('links each draft to the editor it is a draft of', async () => {
    renderDashboard();
    const card = (await screen.findByText('À terminer')).closest('section') as HTMLElement;
    expect(within(card).getByRole('link', { name: 'Contre-champs' })).toHaveAttribute(
      'href',
      '/admin/articles/contre-champs',
    );
    expect(within(card).getByRole('link', { name: 'Le mois qui vient' })).toHaveAttribute(
      'href',
      '/admin/bilans/2026-08',
    );
  });

  it('walks from a palmarès row to the avis editor, loaded with that avis', async () => {
    const user = userEvent.setup();
    renderApp('/admin');

    await user.click(await screen.findByRole('link', { name: 'Un dernier été' }));
    expect(await screen.findByTestId('admin-new-article-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toHaveValue('Un dernier été');
  });
});
