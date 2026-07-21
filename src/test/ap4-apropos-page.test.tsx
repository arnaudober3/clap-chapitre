import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AProposPage, { emphasize } from '../pages/APropos';
import App from '../App';
import { apropos } from '../mock/apropos';

const root = resolve(__dirname, '../..');

/**
 * Source scans below look for real code, so comments are stripped first —
 * otherwise a doc comment that *describes* the rule ("never via
 * dangerouslySetInnerHTML") trips the assertion that enforces it.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

const pageSource = stripComments(
  readFileSync(resolve(root, 'src/pages/APropos/index.tsx'), 'utf8'),
);
const heroSource = stripComments(
  readFileSync(resolve(root, 'src/pages/APropos/Hero.tsx'), 'utf8'),
);
const css = stripComments(
  readFileSync(resolve(root, 'src/pages/APropos/APropos.module.css'), 'utf8'),
);

function renderPage() {
  return render(
    <MemoryRouter>
      <AProposPage />
    </MemoryRouter>,
  );
}

describe('AP-4 À propos page', () => {
  it('renders the hero, the bio, the pull-quote and the aside', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain(apropos.greeting);
    expect(heading.textContent).toContain(apropos.name);

    const paragraphs = screen.getAllByTestId('bio-paragraph');
    expect(paragraphs).toHaveLength(apropos.bio.length);

    expect(screen.getByTestId('a-propos-quote').textContent).toBe(apropos.quote);

    const stats = screen.getByTestId('year-stats');
    expect(within(stats).getByText('Cette année')).toBeInTheDocument();
    expect(within(stats).getAllByTestId('year-stat-row')).toHaveLength(3);

    const link = screen.getByRole('link', { name: 'Me suivre →' });
    expect(link).toHaveAttribute('href', '/me-suivre');
  });

  it('bolds every bioEmphasis term without dropping or duplicating text', () => {
    renderPage();
    const paragraphs = screen.getAllByTestId('bio-paragraph');

    paragraphs.forEach((paragraph, index) => {
      // Nothing dropped or duplicated.
      expect(paragraph.textContent).toBe(apropos.bio[index]);
      // No empty emphasis element.
      for (const strong of Array.from(paragraph.querySelectorAll('b'))) {
        expect(strong.textContent?.length).toBeGreaterThan(0);
      }
    });

    for (const term of apropos.bioEmphasis) {
      const owner = paragraphs.find((p) => p.textContent?.includes(term));
      expect(owner).toBeDefined();
      const bolded = Array.from(
        (owner as HTMLElement).querySelectorAll('b'),
      ).map((b) => b.textContent);
      expect(bolded).toContain(term);
    }
  });

  it('emphasises whole words only, never a prefix inside a longer word', () => {
    const render_ = (nodes: ReturnType<typeof emphasize>) =>
      render(<p data-testid="frag">{nodes}</p>);

    // Standalone occurrence is bolded.
    const { unmount } = render_(emphasize('dans un bilan : voilà', ['bilan']));
    let frag = screen.getByTestId('frag');
    expect(Array.from(frag.querySelectorAll('b')).map((b) => b.textContent)).toEqual([
      'bilan',
    ]);
    expect(frag.textContent).toBe('dans un bilan : voilà');
    unmount();

    // Same term inside a longer word is left alone — no "<b>bilan</b>s".
    render_(emphasize('les bilans publiés et rebilan', ['bilan']));
    frag = screen.getByTestId('frag');
    expect(frag.querySelectorAll('b')).toHaveLength(0);
    expect(frag.textContent).toBe('les bilans publiés et rebilan');
  });

  it('never uses dangerouslySetInnerHTML', () => {
    expect(pageSource).not.toContain('dangerouslySetInnerHTML');
    expect(heroSource).not.toContain('dangerouslySetInnerHTML');
  });

  it('keeps the routing test id and renders at /a-propos in the App router', () => {
    render(
      <MemoryRouter initialEntries={['/a-propos']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('a-propos-page')).toBeInTheDocument();
    expect(screen.getByTestId('a-propos-hero')).toBeInTheDocument();
  });

  it('uses tokens only — no raw hex color literal in the page or its CSS module', () => {
    expect(pageSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('AP-4 À propos page empty content', () => {
  afterEach(() => {
    vi.doUnmock('../mock/apropos');
    vi.resetModules();
  });

  it('renders the hero and does not throw with empty bio and stats', async () => {
    vi.resetModules();
    vi.doMock('../mock/apropos', () => ({
      apropos: { ...apropos, bio: [], stats: [] },
    }));
    const { default: EmptyPage } = await import('../pages/APropos');
    expect(() =>
      render(
        <MemoryRouter>
          <EmptyPage />
        </MemoryRouter>,
      ),
    ).not.toThrow();

    expect(screen.getByTestId('a-propos-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('bio-paragraph')).not.toBeInTheDocument();
    expect(screen.queryByTestId('year-stat-row')).not.toBeInTheDocument();
    expect(screen.getByText('Cette année')).toBeInTheDocument();
  });
});
