import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import SocialCard from '../pages/MeSuivre/SocialCard';
import SocialGrid from '../pages/MeSuivre/SocialGrid';
import { aMeSuivre } from './fixtures';

const meSuivre = aMeSuivre();
import type { SocialLink } from '../content/mesuivre';

const root = resolve(__dirname, '../..');
const cardSource = readFileSync(
  resolve(root, 'src/pages/MeSuivre/SocialCard.tsx'),
  'utf8',
);
const gridSource = readFileSync(
  resolve(root, 'src/pages/MeSuivre/SocialGrid.tsx'),
  'utf8',
);

describe('MS-3 socials grid', () => {
  it('renders one external link per social, safely targeted', () => {
    render(<SocialGrid socials={meSuivre.socials} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(meSuivre.socials.length);

    meSuivre.socials.forEach((social, index) => {
      const link = links[index];
      expect(link.textContent).toContain(social.name);
      expect(link).toHaveAttribute('href', social.url);
      expect(link).toHaveAttribute('target', '_blank');
      const rel = link.getAttribute('rel') ?? '';
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    });
  });

  it('shows each name, handle, glyph and the Suivre cta', () => {
    render(<SocialGrid socials={meSuivre.socials} />);
    const cards = screen.getAllByTestId('social-card');
    meSuivre.socials.forEach((social, index) => {
      const card = cards[index];
      expect(within(card).getByText(social.name)).toBeInTheDocument();
      expect(within(card).getByText(social.handle)).toBeInTheDocument();
      expect(within(card).getByText(social.glyph)).toBeInTheDocument();
      // Each card words its own call to action — "Suivre" on a social account,
      // "Voir mes films" on a film log.
      expect(within(card).getByText(social.cta)).toBeInTheDocument();
    });
  });

  it('never renders a dead or relative href', () => {
    render(<SocialGrid socials={meSuivre.socials} />);
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? '';
      expect(href).not.toBe('#');
      expect(href).not.toBe('');
      expect(href.startsWith('https://')).toBe(true);
    }
  });

  it('survives an empty list and an empty glyph', () => {
    const { unmount } = render(<SocialGrid socials={[]} />);
    expect(screen.getByTestId('social-grid')).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    unmount();

    const glyphless: SocialLink = { ...meSuivre.socials[0], glyph: '' };
    expect(() => render(<SocialGrid socials={[glyphless]} />)).not.toThrow();
    expect(screen.getByTestId('social-swatch').textContent).toBe('');
  });

  it('falls back to a defined token for an unrecognised key', () => {
    const unknown = {
      ...meSuivre.socials[0],
      key: 'myspace',
      name: 'MySpace',
    } as unknown as SocialLink;
    render(<SocialCard social={unknown} />);
    const swatch = screen.getByTestId('social-swatch');
    const background = swatch.style.background || swatch.style.backgroundColor;
    expect(background).toMatch(/^var\(--[a-z-]+\)$/);
    expect(background).not.toContain('undefined');
  });

  it('uses tokens only — no raw hex colour literal in either component', () => {
    expect(cardSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(gridSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
