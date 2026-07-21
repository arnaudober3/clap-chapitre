import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CardGrid, PosterThumb, SectionHeader } from '../components/ui';
import gridStyles from '../components/ui/ui.module.css';

describe('AR-1 CardGrid', () => {
  it('renders all provided children and its container carries the grid class', () => {
    render(
      <CardGrid>
        <div>one</div>
        <div>two</div>
        <div>three</div>
      </CardGrid>,
    );
    const grid = screen.getByTestId('card-grid');
    // The container carries the grid class from the module.
    expect(grid.className).toContain(gridStyles.grid);
    // Providing N children renders N grid cells.
    expect(grid.children).toHaveLength(3);
    expect(within(grid).getByText('one')).toBeInTheDocument();
    expect(within(grid).getByText('two')).toBeInTheDocument();
    expect(within(grid).getByText('three')).toBeInTheDocument();
  });
});

describe('AR-1 PosterThumb', () => {
  it('applies the passed gradient as its background and renders no <img>', () => {
    const cover = 'linear-gradient(150deg,#d18a5a,#9a4d2c)';
    render(<PosterThumb cover={cover} />);
    const tile = screen.getByTestId('poster-thumb');
    expect(tile.style.background).toContain('linear-gradient');
    expect(tile.querySelector('img')).toBeNull();
    expect(tile.tagName).not.toBe('IMG');
  });

  it('renders a fallback tile (no crash, no inline gradient) for an empty cover', () => {
    expect(() => render(<PosterThumb cover="" />)).not.toThrow();
    const tile = screen.getByTestId('poster-thumb');
    expect(tile).toHaveAttribute('data-empty', 'true');
    // No inline background gradient is emitted for the fallback tile.
    expect(tile.style.background).toBe('');
    expect(tile.querySelector('img')).toBeNull();
  });
});

describe('AR-1 SectionHeader', () => {
  it('renders eyebrow + heading + trailing when all three are provided', () => {
    render(
      <SectionHeader
        eyebrow="Bilan culturel"
        heading="Tous les bilans"
        trailing="3 bilans"
      />,
    );
    expect(screen.getByText('Bilan culturel')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Tous les bilans' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3 bilans')).toBeInTheDocument();
  });

  it('renders only the heading and omits eyebrow/trailing without error', () => {
    expect(() =>
      render(<SectionHeader heading="Seul titre" />),
    ).not.toThrow();
    const header = screen.getByTestId('section-header');
    expect(
      within(header).getByRole('heading', { name: 'Seul titre' }),
    ).toBeInTheDocument();
    // No eyebrow paragraph and no trailing slot were emitted.
    expect(header.querySelectorAll('p')).toHaveLength(0);
    expect(within(header).queryByText('3 bilans')).not.toBeInTheDocument();
  });
});

describe('AR-1 tokens only', () => {
  const root = resolve(__dirname, '../..');
  const files = [
    'src/components/ui/CardGrid.tsx',
    'src/components/ui/PosterThumb.tsx',
    'src/components/ui/SectionHeader.tsx',
    'src/components/ui/index.ts',
    'src/components/ui/ui.module.css',
  ];

  it('no src/components/ui file contains a raw hex color literal', () => {
    for (const file of files) {
      const source = readFileSync(resolve(root, file), 'utf8');
      expect(source, `${file} should contain no raw hex color`).not.toMatch(
        /#[0-9a-fA-F]{3,8}\b/,
      );
    }
  });
});
