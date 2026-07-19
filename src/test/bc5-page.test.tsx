import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import BilanCulturelPage from '../pages/BilanCulturel';
import { bilans, latestBilan } from '../mock/bilans';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/bilan-culturel" element={<BilanCulturelPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** A month older than the latest (guaranteed by the >= 3-bilan model). */
const olderMonth = bilans[bilans.length - 1];

describe('BC-5 BilanCulturelPage', () => {
  it('shows the latest month H1 and its medium sections at /bilan-culturel', () => {
    renderAt('/bilan-culturel');
    const page = screen.getByTestId('bilan-culturel-page');
    const latest = latestBilan();
    const h1 = within(page).getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(`${latest.monthLabel} ${latest.year}`);
    // At least one medium section header from the latest bilan renders.
    const sectionHeaders = within(page)
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(
      sectionHeaders.some((t) =>
        ['Films', 'Séries', 'Livres', 'Docs'].includes(t ?? ''),
      ),
    ).toBe(true);
  });

  it('shows an older month H1 and its reviews at ?mois=<older id>, not the latest', () => {
    renderAt(`/bilan-culturel?mois=${olderMonth.id}`);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(`${olderMonth.monthLabel} ${olderMonth.year}`);
    expect(h1).not.toHaveTextContent(
      `${latestBilan().monthLabel} ${latestBilan().year}`,
    );
    // A review from the older month is present.
    expect(
      screen.getByRole('heading', { name: olderMonth.avis[0].title }),
    ).toBeInTheDocument();
  });

  it('falls back to the latest bilan on an unknown/malformed mois without throwing', () => {
    expect(() => renderAt('/bilan-culturel?mois=2099-13')).not.toThrow();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(
      `${latestBilan().monthLabel} ${latestBilan().year}`,
    );
  });

  it('shows the Salon empty state and no month sections when bilans is empty', async () => {
    vi.resetModules();
    vi.doMock('../mock/bilans', () => ({
      bilans: [],
      latestBilan: () => {
        throw new Error('should not be called when bilans is empty');
      },
      bilanById: () => undefined,
      bilansByYear: () => [],
    }));
    const { default: EmptyPage } = await import('../pages/BilanCulturel');
    render(
      <MemoryRouter initialEntries={['/bilan-culturel']}>
        <Routes>
          <Route path="/bilan-culturel" element={<EmptyPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Aucun bilan pour l’instant.')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Films' }),
    ).not.toBeInTheDocument();
    vi.doUnmock('../mock/bilans');
    vi.resetModules();
  });
});
