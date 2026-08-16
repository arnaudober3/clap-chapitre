import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from '../pages/AdminDashboard';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

/**
 * The dashboard's figures are all computed now: the palmarès and the drafts
 * list from the content tables (unchanged), and the KPI band and the trend
 * from real audience events — `view_hits`, `share_hits`, `likes.created_at`
 * and `comments.created_at`. This fixture plants exactly enough of each,
 * split between the default period's window (30 days) and the one before
 * it, so the KPI values and their deltas are known numbers rather than
 * whatever the seed happened to contain.
 *
 * `WITH RECURSIVE` generates the bulk counts (18/9/6 current, 6/3/2
 * previous) instead of eighteen near-identical `INSERT` lines each — the
 * exact day offset never matters, only which side of the 30-day boundary a
 * row lands on.
 */
const DASHBOARD = `${SEED}
WITH RECURSIVE day(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM day WHERE n < 17)
INSERT INTO view_hits (target_type, target_id, viewed_at)
SELECT CASE n % 3 WHEN 0 THEN 'article' WHEN 1 THEN 'article' ELSE 'bilan' END,
       CASE n % 3 WHEN 0 THEN 'un-dernier-ete' WHEN 1 THEN 'l-annee-de-la-pluie' ELSE '2026-07' END,
       datetime('now', '-' || n || ' days')
  FROM day;

WITH RECURSIVE day(n) AS (SELECT 31 UNION ALL SELECT n + 1 FROM day WHERE n < 36)
INSERT INTO view_hits (target_type, target_id, viewed_at)
SELECT 'article', 'un-dernier-ete', datetime('now', '-' || n || ' days')
  FROM day;

WITH RECURSIVE day(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM day WHERE n < 8)
INSERT INTO likes (target_type, target_id, ip_hash, created_at)
SELECT 'article', 'un-dernier-ete', 'dash-like-' || n, datetime('now', '-' || n || ' days')
  FROM day;

WITH RECURSIVE day(n) AS (SELECT 40 UNION ALL SELECT n + 1 FROM day WHERE n < 42)
INSERT INTO likes (target_type, target_id, ip_hash, created_at)
SELECT 'bilan', '2026-07', 'dash-like-prev-' || n, datetime('now', '-' || n || ' days')
  FROM day;

WITH RECURSIVE day(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM day WHERE n < 5)
INSERT INTO share_hits (target_type, target_id, channel, created_at)
SELECT 'article', 'un-dernier-ete',
       CASE n % 3 WHEN 0 THEN 'facebook' WHEN 1 THEN 'x' ELSE 'copy' END,
       datetime('now', '-' || n || ' days')
  FROM day;

INSERT INTO share_hits (target_type, target_id, channel, created_at) VALUES
  ('bilan', '2026-07', 'whatsapp', datetime('now', '-50 days')),
  ('bilan', '2026-07', 'email', datetime('now', '-52 days'));

-- Four approved comments in the current window, two in the previous one, and
-- one pending in the current window that must not be counted either side.
INSERT INTO comments (id, target_type, target_id, parent_id, author, is_author, body, comment_date, likes, position, status, created_at) VALUES
  ('c-dash-cur-1', 'article', 'un-dernier-ete', NULL, 'Nadia', 0, 'Un.', '2026-08-05', 0, 2, 'approved', datetime('now', '-1 days')),
  ('c-dash-cur-2', 'article', 'un-dernier-ete', NULL, 'Omar', 0, 'Deux.', '2026-08-05', 0, 3, 'approved', datetime('now', '-2 days')),
  ('c-dash-cur-3', 'bilan', '2026-07', NULL, 'Sami', 0, 'Trois.', '2026-08-05', 0, 2, 'approved', datetime('now', '-3 days')),
  ('c-dash-cur-4', 'bilan', '2026-07', NULL, 'Yara', 0, 'Quatre.', '2026-08-05', 0, 3, 'approved', datetime('now', '-4 days')),
  ('c-dash-prev-1', 'article', 'l-annee-de-la-pluie', NULL, 'Farid', 0, 'Cinq.', '2026-07-01', 0, 2, 'approved', datetime('now', '-45 days')),
  ('c-dash-prev-2', 'bilan', '2026-07', NULL, 'Inès', 0, 'Six.', '2026-07-01', 0, 3, 'approved', datetime('now', '-46 days')),
  ('c-dash-pending', 'article', 'un-dernier-ete', NULL, 'Bot', 0, 'Spam potentiel.', '2026-08-06', 0, 4, 'pending', datetime('now', '-1 days'));
`;

beforeEach(async () => {
  await useTestDb(DASHBOARD);
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminDashboardPage />
    </MemoryRouter>,
  );
}

/** The stat card for `label`: its value and delta live in the same cell. */
function statCell(page: HTMLElement, label: string): HTMLElement {
  return within(page).getByText(label).parentElement as HTMLElement;
}

describe('TB-3 dashboard page', () => {
  it('renders the title, KPIs and primary action', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Tableau de bord' });
    const page = screen.getByTestId('admin-dashboard-page');

    // 18 view_hits in the last 30 days, 6 in the 30 days before that:
    // (18 - 6) / 6 = +200%.
    const views = statCell(page, 'Vues');
    expect(within(views).getByText('18')).toBeInTheDocument();
    expect(within(views).getByText('↑200%')).toBeInTheDocument();

    // 9 likes current, 3 previous: (9 - 3) / 3 = +200%.
    const likes = statCell(page, 'Likes');
    expect(within(likes).getByText('9')).toBeInTheDocument();
    expect(within(likes).getByText('↑200%')).toBeInTheDocument();

    // 4 approved comments current, 2 previous — the pending one counts on
    // neither side: (4 - 2) / 2 = +100%.
    const comments = statCell(page, 'Commentaires');
    expect(within(comments).getByText('4')).toBeInTheDocument();
    expect(within(comments).getByText('↑100%')).toBeInTheDocument();

    // 6 shares current, 2 previous: (6 - 2) / 2 = +200%.
    const shares = statCell(page, 'Partages');
    expect(within(shares).getByText('6')).toBeInTheDocument();
    expect(within(shares).getByText('↑200%')).toBeInTheDocument();

    // The header's primary action carries the visible label (the FAB only has an
    // aria-label), so match on visible text to target it unambiguously.
    expect(within(page).getByText('Nouvel article')).toBeInTheDocument();
  });

  it('lists every leaderboard publication', async () => {
    renderPage();
    await screen.findByText('Palmarès des publications');
    // Ranked by the stored `views` counter, unaffected by `view_hits`: the
    // bilan leads, then the two published avis. The draft is not ranked — it
    // has no audience yet.
    for (const title of ['Les longues soirées', 'Un dernier été', 'L’année de la pluie']) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }
  });

  it('shows the drafts to finish and the newsletter status', async () => {
    renderPage();
    expect(await screen.findByText('À terminer')).toBeInTheDocument();
    expect(screen.getAllByText('Contre-champs').length).toBeGreaterThan(0);
    // The newsletter card now reads real figures from the database: no
    // subscriber has ever been seeded here, so the count is honestly zero.
    expect(await screen.findByText(/0 abonnés/)).toBeInTheDocument();
    expect(screen.getByText(/prête à partir/)).toBeInTheDocument();
  });
});
