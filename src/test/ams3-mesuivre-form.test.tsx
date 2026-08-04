import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminMeSuivrePage from '../pages/AdminMeSuivre';
import { mesuivreFormValues } from '../content/mesuivre';
import { aMeSuivre, SEED } from './fixtures';
import { useTestDb } from './api-server';

const meSuivre = aMeSuivre();

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

/** The editor fetches its content, so every test starts from a seeded database. */
beforeEach(() => {
  useTestDb(SEED);
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/me-suivre']}>
      <AdminMeSuivrePage />
    </MemoryRouter>,
  );
}

const initial = mesuivreFormValues(meSuivre);
const INTRO_LABEL = /Petit mot d/;

afterEach(() => {
  vi.doUnmock('../mock/mesuivre');
  vi.resetModules();
});

describe('AMS-3 admin Me suivre form', () => {
  it('prefills every field from the public page content', async () => {
    renderPage();
    await screen.findByTestId('admin-mesuivre-page');
    expect(screen.getByTestId('admin-mesuivre-page')).toBeInTheDocument();
    expect(screen.getByLabelText(INTRO_LABEL)).toHaveValue(initial.intro);
    initial.links.forEach((row, index) => {
      expect(screen.getByLabelText(`Nom du lien ${index + 1}`)).toHaveValue(row.name);
      expect(screen.getByLabelText(`Adresse du lien ${index + 1}`)).toHaveValue(row.url);
    });
  });

  it('names the page and its purpose in the header', async () => {
    renderPage();
    await screen.findByTestId('admin-mesuivre-page');
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
    await screen.findByTestId('admin-mesuivre-page');
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
    await screen.findByTestId('admin-mesuivre-page');

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
    await screen.findByTestId('admin-mesuivre-page');

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
    // A page row with no links: reachable by removing them all, so the editor
    // has to survive it. A different row rather than a stubbed module.
    useTestDb(`
      INSERT INTO page_mesuivre (id,eyebrow,title,intro,newsletter_eyebrow,newsletter_title,newsletter_copy,newsletter_placeholder,newsletter_cta)
      VALUES (1,'Me suivre','On garde le contact','Choisissez votre endroit préféré.','La newsletter','Le courrier du mois','Le bilan complet.','votre@email.fr','S’abonner');
    `);
    expect(() => renderPage()).not.toThrow();

    expect(await screen.findByTestId('add-link')).toBeInTheDocument();
    expect(screen.queryByTestId('link-rows')).toBeNull();
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

  it('blocks submit if a named link has no URL, showing an error on the line', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('admin-mesuivre-page');

    // Fixture has 4 links; adding one makes it the 5th.
    await user.click(screen.getByTestId('add-link'));
    const nameInput = screen.getByLabelText('Nom du lien 5');
    const urlInput = screen.getByLabelText('Adresse du lien 5');

    await user.type(nameInput, 'GitHub');
    // Leave URL empty and try to save.
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    // The error should appear on the line, tied to both fields via aria-invalid.
    expect(
      screen.getByText('Une adresse est nécessaire pour enregistrer ce lien.'),
    ).toBeInTheDocument();
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(urlInput).toHaveAttribute('aria-invalid', 'true');
    // No "Enregistré" message (the network was never called).
    expect(screen.queryByText('Enregistré')).toBeNull();
  });

  it('blocks submit if a link has a URL but no name', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('admin-mesuivre-page');

    await user.click(screen.getByTestId('add-link'));
    const nameInput = screen.getByLabelText('Nom du lien 5');
    const urlInput = screen.getByLabelText('Adresse du lien 5');

    // Type only a URL, leave name empty.
    await user.type(urlInput, 'github.com/mariezoe');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      screen.getByText('Un nom est nécessaire pour enregistrer ce lien.'),
    ).toBeInTheDocument();
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(urlInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Enregistré')).toBeNull();
  });

  it('clears the error as soon as either field changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('admin-mesuivre-page');

    // Fixture has 4 links; adding one makes it the 5th.
    await user.click(screen.getByTestId('add-link'));
    const nameInput = screen.getByLabelText('Nom du lien 5');
    const urlInput = screen.getByLabelText('Adresse du lien 5');

    await user.type(nameInput, 'GitHub');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      screen.getByText('Une adresse est nécessaire pour enregistrer ce lien.'),
    ).toBeInTheDocument();

    // Typing in either field should clear the error.
    await user.type(urlInput, 'github.com/mariezoe');

    expect(
      screen.queryByText('Une adresse est nécessaire pour enregistrer ce lien.'),
    ).toBeNull();
    expect(nameInput).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('persists a newly added link with full details', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('admin-mesuivre-page');

    // Fixture has 4 links; adding one makes it the 5th.
    await user.click(screen.getByTestId('add-link'));
    const newNameInput = screen.getByLabelText('Nom du lien 5');
    const newUrlInput = screen.getByLabelText('Adresse du lien 5');
    const newHandleInput = screen.getByLabelText('Pseudo du lien 5');

    await user.type(newNameInput, 'GitHub');
    await user.type(newUrlInput, 'github.com/mariezoe');
    await user.type(newHandleInput, '@mariezoe');

    // Save should succeed this time.
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Enregistré')).toBeInTheDocument();

    // Verify the new link is still showing on screen (state was persisted).
    expect(screen.getByLabelText('Nom du lien 5')).toHaveValue('GitHub');
    expect(screen.getByLabelText('Adresse du lien 5')).toHaveValue('github.com/mariezoe');
    expect(screen.getByLabelText('Pseudo du lien 5')).toHaveValue('@mariezoe');
  });
});
