import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../components/layout/Header';

const css = readFileSync(
  resolve(__dirname, '../components/layout/Layout.module.css'),
  'utf8',
);

/** Extract the declaration block for an exact rule selector head. */
function ruleBlock(pattern: RegExp): string {
  const match = css.match(pattern);
  if (!match) throw new Error(`rule not found: ${pattern}`);
  return match[1];
}

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

  it('styles the medium tabs as underline tabs, not filled pills', () => {
    // .mediumTab (idle): plain muted text, no pill radius or filled fill.
    const idle = ruleBlock(/\.mediumTab\s*\{([^}]*)\}/);
    expect(idle).not.toContain('border-radius');
    expect(idle).not.toContain('--radius-pill');
    expect(idle).toContain('var(--faint)');

    // .mediumTabActive: terracotta underline, ink text, no filled --ink fill.
    const active = ruleBlock(/\.mediumTabActive[^{]*\{([^}]*)\}/);
    expect(active).toContain('border-bottom: 2px solid var(--accent)');
    expect(active).not.toContain('background: var(--ink)');

    // The strip keeps its hairline bottom border.
    const strip = ruleBlock(/\.mediumTabs\s*\{([^}]*)\}/);
    expect(strip).toContain('border-bottom: 1px solid var(--border)');
  });
});