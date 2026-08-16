import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import BilanCulturelPage from '../pages/BilanCulturel';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

/** A second, older month, so "the latest" is a choice and not the only option. */
const OLDER = `
INSERT INTO bilans (id,year,month,month_label,title,mood,status,published_at,views,likes)
VALUES ('2026-05',2026,5,'Mai','Le mois des seuils','Un mois en demi-teinte.','published','2026-06-02',900,20);
INSERT INTO bilan_avis (bilan_id,article_id,position) VALUES ('2026-05','l-annee-de-la-pluie',1);
`;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/bilan-culturel" element={<BilanCulturelPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BC-5 BilanCulturelPage', () => {
  beforeEach(() => {
    useTestDb(SEED + OLDER);
  });

  it('shows the latest month H1 and its medium sections at /bilan-culturel', async () => {
    renderAt('/bilan-culturel');
    const page = await screen.findByTestId('bilan-culturel-page');
    const h1 = await within(page).findByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Juillet 2026');
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

  it('shows an older month H1 and its reviews at ?mois=<older id>, not the latest', async () => {
    renderAt('/bilan-culturel?mois=2026-05');
    const h1 = await screen.findByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Mai 2026');
    expect(h1).not.toHaveTextContent('Juillet 2026');
    // A review from the older month is present.
    expect(
      await screen.findByRole('heading', { name: 'L’année de la pluie' }),
    ).toBeInTheDocument();
  });

  it('falls back to the latest bilan on an unknown/malformed mois without throwing', async () => {
    // The endpoint answers 404 for a month that is not there; the page asks for
    // the newest one rather than showing a dead end, since ?mois= comes from a
    // link that may simply have aged.
    expect(() => renderAt('/bilan-culturel?mois=2099-13')).not.toThrow();
    const h1 = await screen.findByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Juillet 2026');
  });

  it('shows the Salon empty state and no month sections when there is no bilan', async () => {
    // An empty database — which is what the site ships with — rather than a
    // stubbed module.
    useTestDb();
    renderAt('/bilan-culturel');
    expect(await screen.findByText('Aucun bilan pour l’instant.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Films' })).not.toBeInTheDocument();
  });
});
