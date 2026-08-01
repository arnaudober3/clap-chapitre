import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminMeSuivrePage from '../pages/AdminMeSuivre';
import { meSuivre, mesuivreFormValues } from '../mock/mesuivre';

const root = resolve(__dirname, '../..');

/** Source scans below look for real code, so comments are stripped first. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

const sources = [
  'src/pages/AdminMeSuivre/index.tsx',
  'src/pages/AdminMeSuivre/LinkRows.tsx',
  'src/pages/AdminMeSuivre/LinkRow.tsx',
  'src/pages/AdminMeSuivre/AdminMeSuivre.module.css',
].map(
  (path) => [path, stripComments(readFileSync(resolve(root, path), 'utf8'))] as const,
);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/me-suivre']}>
      <AdminMeSuivrePage />
    </MemoryRouter>,
  );
}

const initial = mesuivreFormValues();
const INTRO_LABEL = /Petit mot d/;

afterEach(() => {
  vi.doUnmock('../mock/mesuivre');
  vi.resetModules();
});

describe('AMS-3 admin Me suivre form', () => {
  it('prefills every field from the public page content', () => {
    renderPage();
    expect(screen.getByTestId('admin-mesuivre-page')).toBeInTheDocument();
    expect(screen.getByLabelText(INTRO_LABEL)).toHaveValue(initial.intro);
    initial.links.forEach((row, index) => {
      expect(screen.getByLabelText(`Nom du lien ${index + 1}`)).toHaveValue(row.name);
      expect(screen.getByLabelText(`Adresse du lien ${index + 1}`)).toHaveValue(row.url);
    });
  });

  it('names the page and its purpose in the header', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Page « Me suivre »',
    );
    expect(
      screen.getByText('Les liens affichés sur la page Me suivre'),
    ).toBeInTheDocument();
  });

  it('saves in place — the state line appears and the page never navigates', async () => {
    const user = userEvent.setup();
    renderPage();
    const before = window.location.href;

    expect(screen.queryByText('Enregistré')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(screen.getByText('Enregistré')).toBeInTheDocument();
    expect(screen.getByTestId('admin-mesuivre-page')).toBeInTheDocument();
    expect(window.location.href).toBe(before);
  });

  it('drops the state line as soon as anything changes again', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Enregistré')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Adresse du lien 1'), '/photos');
    expect(screen.queryByText('Enregistré')).toBeNull();

    // Adding a row is an edit too, not just typing.
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await user.click(screen.getByTestId('add-link'));
    expect(screen.queryByText('Enregistré')).toBeNull();
  });

  it('carries every edit through, "Enregistrer" being the only action', async () => {
    const user = userEvent.setup();
    renderPage();

    const intro = screen.getByLabelText(INTRO_LABEL);
    await user.clear(intro);
    await user.type(intro, 'Autre chose');
    await user.click(screen.getByRole('button', { name: 'Supprimer « Threads »' }));
    await user.click(screen.getByTestId('add-link'));

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByLabelText(INTRO_LABEL)).toHaveValue('Autre chose');
    expect(screen.getAllByTestId('link-row')).toHaveLength(initial.links.length);
    expect(screen.queryByLabelText('Nom du lien 4')).toHaveValue('');
  });

  it('renders without a single link and still offers to add one', async () => {
    vi.resetModules();
    vi.doMock('../mock/mesuivre', async () => {
      const actual =
        await vi.importActual<typeof import('../mock/mesuivre')>('../mock/mesuivre');
      return {
        ...actual,
        meSuivre: { ...meSuivre, socials: [] },
        mesuivreFormValues: () => ({ intro: meSuivre.intro, links: [] }),
      };
    });

    const { default: EmptyPage } = await import('../pages/AdminMeSuivre');
    expect(() =>
      render(
        <MemoryRouter>
          <EmptyPage />
        </MemoryRouter>,
      ),
    ).not.toThrow();

    expect(screen.queryByTestId('link-rows')).toBeNull();
    expect(screen.getByTestId('add-link')).toBeInTheDocument();
  });

  it('asks nothing of the network and injects no raw HTML', () => {
    for (const [path, code] of sources) {
      expect(code, path).not.toMatch(/dangerouslySetInnerHTML/);
      expect(code, path).not.toMatch(/<img\b/);
      expect(code, path).not.toMatch(/\burl\(/);
      expect(code, path).not.toMatch(/\bfetch\(/);
    }
  });

  it('uses tokens only — no raw hex color literal anywhere in the page', () => {
    for (const [path, code] of sources) {
      expect(code, path).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
