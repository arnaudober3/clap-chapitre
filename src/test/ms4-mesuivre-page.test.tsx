import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MeSuivrePage from '../pages/MeSuivre';
import App from '../App';
import { meSuivre } from '../mock/mesuivre';

const root = resolve(__dirname, '../..');
const pageDir = resolve(root, 'src/pages/MeSuivre');

/**
 * Source scans below look for real code, so comments are stripped first —
 * otherwise a doc comment that *describes* a rule ("never href='#'") trips the
 * assertion that enforces it.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

const pageSource = stripComments(readFileSync(resolve(pageDir, 'index.tsx'), 'utf8'));
const css = stripComments(
  readFileSync(resolve(pageDir, 'MeSuivre.module.css'), 'utf8'),
);

function renderPage() {
  return render(
    <MemoryRouter>
      <MeSuivrePage />
    </MemoryRouter>,
  );
}

describe('MS-4 Me suivre page', () => {
  it('renders the head, the newsletter feature and the four social links', () => {
    renderPage();
    expect(screen.getByText(meSuivre.eyebrow)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'On garde le contact' }),
    ).toBeInTheDocument();
    expect(screen.getByText(meSuivre.intro)).toBeInTheDocument();

    expect(screen.getByText('Le courrier du mois')).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse e-mail')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: meSuivre.newsletter.cta }),
    ).toBeInTheDocument();

    expect(screen.getAllByTestId('social-card')).toHaveLength(4);
  });

  it('keeps the routing test id and renders at /me-suivre in the App router', () => {
    render(
      <MemoryRouter initialEntries={['/me-suivre']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('me-suivre-page')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'On garde le contact' }),
    ).toBeInTheDocument();
  });

  it('is where the À propos follow CTA lands', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/a-propos']}>
        <App />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('link', { name: 'Me suivre →' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'On garde le contact' }),
    ).toBeInTheDocument();
  });

  it('renders head and newsletter without throwing when socials is empty', async () => {
    vi.resetModules();
    vi.doMock('../mock/mesuivre', () => ({
      meSuivre: { ...meSuivre, socials: [] },
    }));
    const { default: EmptyPage } = await import('../pages/MeSuivre');
    expect(() =>
      render(
        <MemoryRouter>
          <EmptyPage />
        </MemoryRouter>,
      ),
    ).not.toThrow();

    expect(
      screen.getByRole('heading', { level: 1, name: 'On garde le contact' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Le courrier du mois')).toBeInTheDocument();
    expect(screen.queryAllByTestId('social-card')).toHaveLength(0);
  });

  it('renders nothing remote: no dangerouslySetInnerHTML, no <img>, no url()', () => {
    for (const file of readdirSync(pageDir).filter((name) => name.endsWith('.tsx'))) {
      const source = stripComments(readFileSync(resolve(pageDir, file), 'utf8'));
      expect(source).not.toContain('dangerouslySetInnerHTML');
      expect(source).not.toContain('<img');
    }
    expect(css).not.toContain('url(');
  });

  it('uses tokens only — no raw hex colour literal in the page or its CSS module', () => {
    expect(pageSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

afterEach(() => {
  vi.doUnmock('../mock/mesuivre');
  vi.resetModules();
});
