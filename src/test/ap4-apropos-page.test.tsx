import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AProposPage, { emphasize } from '../pages/APropos';
import App from '../App';
import { anApropos, SEED } from './fixtures';
import { useTestDb } from './api-server';

const apropos = anApropos();

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
  beforeEach(() => {
    useTestDb(SEED);
  });

  it('renders the hero, the bio, the pull-quote and the aside', async () => {
    renderPage();
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading.textContent).toContain(apropos.greeting);
    expect(heading.textContent).toContain(apropos.name);

    const paragraphs = screen.getAllByTestId('bio-paragraph');
    expect(paragraphs).toHaveLength(apropos.bio.length);

    expect(screen.getByTestId('a-propos-quote').textContent).toBe(apropos.quote);

    const stats = screen.getByTestId('year-stats');
    expect(within(stats).getByText('Cette année')).toBeInTheDocument();
    expect(within(stats).getAllByTestId('year-stat-row')).toHaveLength(apropos.stats.length);

    const link = screen.getByRole('link', { name: 'Me suivre →' });
    expect(link).toHaveAttribute('href', '/me-suivre');
  });

  it('bolds every bioEmphasis term without dropping or duplicating text', async () => {
    renderPage();
    await screen.findByTestId('a-propos-hero');
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

  it('keeps the routing test id and renders at /a-propos in the App router', async () => {
    render(
      <MemoryRouter initialEntries={['/a-propos']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('a-propos-page')).toBeInTheDocument();
    expect(await screen.findByTestId('a-propos-hero')).toBeInTheDocument();
  });

  it('uses tokens only — no raw hex color literal in the page or its CSS module', () => {
    expect(pageSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('AP-4 À propos page empty content', () => {
  it('renders the hero and does not throw with empty bio and stats', async () => {
    // A row with no bio and no stats — reachable by hand, so the page has to
    // survive it. No module stubbing needed: it is just a different row.
    useTestDb(`
      INSERT INTO page_apropos (id,eyebrow,greeting,name,intro,portrait_label,bio,bio_emphasis,quote,stats_title,follow_title,follow_copy,follow_cta,follow_to)
      VALUES (1,'À propos','Bonjour, moi c’est','Marie-Zoé','J’écris.','Portrait','','','','Cette année','On garde le contact ?','Le bilan du mois.','Me suivre','/me-suivre');
    `);
    expect(() =>
      render(
        <MemoryRouter>
          <AProposPage />
        </MemoryRouter>,
      ),
    ).not.toThrow();

    expect(await screen.findByTestId('a-propos-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('bio-paragraph')).not.toBeInTheDocument();
    expect(screen.queryByTestId('year-stat-row')).not.toBeInTheDocument();
    expect(screen.getByText('Cette année')).toBeInTheDocument();
  });
});
