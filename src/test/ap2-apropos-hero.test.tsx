import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Hero from '../pages/APropos/Hero';
import { anApropos } from './fixtures';
import { readSource } from './sourceScan';

const apropos = anApropos();

const heroSource = readSource('src/pages/APropos/Hero.tsx');
const css = readSource('src/pages/APropos/APropos.module.css');

function renderHero(overrides: Partial<Parameters<typeof Hero>[0]> = {}) {
  return render(
    <Hero
      eyebrow={apropos.eyebrow}
      greeting={apropos.greeting}
      name={apropos.name}
      intro={apropos.intro}
      portraitImage=""
      {...overrides}
    />,
  );
}

describe('AP-2 À propos hero band', () => {
  it('renders the H1 with the greeting and the name in its own element', () => {
    renderHero();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('Bonjour, moi c’est');
    expect(heading.textContent).toContain('Marie-Zoé');
    // The name sits in a dedicated (italic --accent) element, not bare text.
    const name = within(heading).getByText('Marie-Zoé');
    expect(name.tagName).toBe('SPAN');
  });

  it('renders the eyebrow and the intro', () => {
    renderHero();
    expect(screen.getByText(apropos.eyebrow)).toBeInTheDocument();
    expect(screen.getByText(apropos.intro)).toBeInTheDocument();
  });

  it('renders without image: portrait is the gradient token, no url() in style', () => {
    const { container } = renderHero();
    expect(container.querySelector('img')).toBeNull();
    for (const el of Array.from(container.querySelectorAll('[style]'))) {
      expect(el.getAttribute('style')).not.toContain('url(');
    }
    expect(heroSource).not.toContain('<img');
    // The portrait uses backgroundImage inline when portraitImage is set, but
    // the source template itself has no hardcoded url() — it runs at render time.
    expect(css).toContain('var(--portrait-grad)');
  });

  it('renders with portrait image: style contains background-image url()', () => {
    const { container } = renderHero({ portraitImage: 'portrait-abc123.jpg' });
    expect(container.querySelector('img')).toBeNull();
    const portrait = container.querySelector('[data-testid="a-propos-portrait"]');
    expect(portrait).toHaveStyle({
      backgroundImage: 'url(/api/media/portrait-abc123.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    });
  });

  it('gives the portrait a fixed accessible label, not one derived from a prop', () => {
    renderHero();
    // No `portraitLabel`/alt prop exists anymore — the label is a constant
    // inside Hero.tsx, so it survives whether a portrait is uploaded.
    expect(screen.getByRole('img', { name: 'Portrait de Marie-Zoé' })).toBeInTheDocument();
  });

  it('uses tokens only — no raw hex color literal in Hero.tsx or the CSS module', () => {
    expect(heroSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('renders without throwing and omits the intro paragraph when intro is empty', () => {
    const { container } = renderHero({ intro: '' });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    const paragraphs = Array.from(container.querySelectorAll('p'));
    // Only the eyebrow paragraph remains; no empty <p> for the intro.
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].textContent).toBe(apropos.eyebrow);
  });
});
