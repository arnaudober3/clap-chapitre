/**
 * The document head per route — same rendering convention as `sc5-routing.test.tsx`,
 * asserting on `document.title`/meta/link/script instead of on-screen content.
 */
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { anArticle, SEED } from './fixtures';
import { useTestDb } from './api-server';
import { SITE_URL } from '../seo/constants';

const avis = anArticle();

beforeEach(() => {
  useTestDb(SEED);
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function metaContent(selector: string): string | null {
  return document.head.querySelector(selector)?.getAttribute('content') ?? null;
}

describe('SEO-3 document head per route', () => {
  it('sets the avis title, description, canonical and Review JSON-LD, no image', async () => {
    renderAt(`/article/${avis.id}`);
    await screen.findByRole('heading', { level: 1, name: avis.title });

    expect(document.title).toBe(`${avis.title} · Clap et chapitre`);
    expect(metaContent('meta[name="description"]')).toBe(avis.excerpt);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE_URL}/article/${avis.id}`,
    );
    // The seed's cover is '' — no image, so no og:image tag at all.
    expect(document.querySelector('meta[property="og:image"]')).toBeNull();

    const jsonLd = document.querySelector('script#seo-jsonld');
    expect(jsonLd).not.toBeNull();
    const data = JSON.parse(jsonLd!.textContent ?? '[]') as Array<{ '@type': string }>;
    expect(data[0]['@type']).toBe('Review');
    expect(data[1]['@type']).toBe('BreadcrumbList');
  });

  it('sets a stable per-medium title and canonical on the home feed', async () => {
    renderAt('/films');
    expect(document.title).toBe('Films · Clap et chapitre');
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE_URL}/films`,
    );
  });

  it('marks the admin shell noindex, with no canonical link', async () => {
    renderAt('/admin');
    expect(document.title).toBe('Espace admin · Clap et chapitre');
    expect(metaContent('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('marks an unknown route noindex too', async () => {
    renderAt('/n-existe-pas');
    await screen.findByTestId('not-found-page');
    expect(document.title).toBe('Page introuvable · Clap et chapitre');
    expect(metaContent('meta[name="robots"]')).toBe('noindex, nofollow');
  });
});
