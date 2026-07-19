import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../components/layout/Header';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  );
}

/**
 * The mobile medium tab strip is the only <nav aria-label="Médias"> that is a
 * direct child of <header>; the rail and drawer copies are nested deeper.
 */
function tabStrip(container: HTMLElement): HTMLElement {
  const strip = container.querySelector('header > nav[aria-label="Médias"]');
  if (!strip) throw new Error('medium tab strip not found');
  return strip as HTMLElement;
}

describe('HM-5 mobile medium tab strip', () => {
  const routes: Array<[string, string]> = [
    ['Films', '/films'],
    ['Séries', '/series'],
    ['Livres', '/livres'],
    ['Docs', '/docs'],
  ];

  it('renders the four medium tabs as links to their routes', () => {
    const { container } = renderAt('/');
    const strip = within(tabStrip(container));
    for (const [label, to] of routes) {
      expect(strip.getByRole('link', { name: label })).toHaveAttribute('href', to);
    }
  });

  it("marks the Séries tab active with aria-current on /series", () => {
    const { container } = renderAt('/series');
    const strip = within(tabStrip(container));
    expect(strip.getByRole('link', { name: 'Séries' })).toHaveAttribute('aria-current', 'page');
    expect(strip.getByRole('link', { name: 'Films' })).not.toHaveAttribute('aria-current', 'page');
  });
});