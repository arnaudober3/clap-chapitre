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
  it('paints the stored key from /api/media, framed, and still emits no <img>', () => {
    // The cover used to be the CSS gradient itself. It is an R2 key now, and
    // the tile stays a painted <div> — an <img> would need a width and a
    // height the grid does not want to think about.
    const cover = `cover-${'b'.repeat(64)}.webp`;
    render(<PosterThumb cover={cover} />);
    const tile = screen.getByTestId('poster-thumb');

    expect(tile.style.backgroundImage).toContain(`/api/media/${cover}`);
    // Without these the tile would show one corner of the poster.
    expect(tile.style.backgroundSize).toBe('cover');
    expect(tile.style.backgroundPosition).toBe('center');
    expect(tile.querySelector('img')).toBeNull();
    expect(tile.tagName).not.toBe('IMG');
  });

  it('renders a fallback tile (no crash, no inline image) for an empty cover', () => {
    expect(() => render(<PosterThumb cover="" />)).not.toThrow();
    const tile = screen.getByTestId('poster-thumb');
    expect(tile).toHaveAttribute('data-empty', 'true');
    // Nothing inline: the stylesheet's neutral tile shows through, which is
    // what an avis with no affiche yet should look like.
    expect(tile.style.backgroundImage).toBe('');
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
    'src/components/ui/Pagination/index.tsx',
    'src/components/ui/Pagination/Pagination.module.css',
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
