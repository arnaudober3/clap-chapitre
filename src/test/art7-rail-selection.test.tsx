import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../components/layout/Header';

/** Render the desktop rail Header at a given path. */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  );
}

/** The rail's medium nav (the mobile tab strip shares the label but only shows on feed routes). */
function mediaNav() {
  return within(screen.getByRole('navigation', { name: 'Médias' }));
}

describe('ART-7 rail selection on the article view', () => {
  it("marks the article's medium feed active — a film article activates Films", () => {
    renderAt('/article/un-dernier-ete');
    expect(mediaNav().getByRole('link', { name: 'Films' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(mediaNav().getByRole('link', { name: 'Séries' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('activates the matching feed for each medium', () => {
    const cases: Array<[string, string]> = [
      ['/article/les-nuits-blanches', 'Séries'],
      ['/article/l-annee-de-la-pluie', 'Livres'],
      ['/article/fragments', 'Docs'],
    ];
    for (const [path, label] of cases) {
      const { unmount } = renderAt(path);
      expect(mediaNav().getByRole('link', { name: label })).toHaveAttribute(
        'aria-current',
        'page',
      );
      unmount();
    }
  });

  it('leaves the rail unselected for an unknown article id', () => {
    renderAt('/article/ceci-nexiste-pas');
    for (const label of ['Films', 'Séries', 'Livres', 'Docs']) {
      expect(mediaNav().getByRole('link', { name: label })).not.toHaveAttribute(
        'aria-current',
      );
    }
  });
});
