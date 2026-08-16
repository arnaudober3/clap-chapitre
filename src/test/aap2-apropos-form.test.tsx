import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminAProposPage from '../pages/AdminAPropos';
import { aproposFormValues } from '../content/apropos';
import { anApropos, SEED } from './fixtures';
import { useTestDb } from './api-server';
import { readSources } from './sourceScan';

const sources = readSources([
  'src/pages/AdminAPropos/index.tsx',
  'src/pages/AdminAPropos/PortraitField.tsx',
  'src/pages/AdminAPropos/YearStatsFields.tsx',
  'src/pages/AdminAPropos/AdminAPropos.module.css',
]);

/** The editor fetches the page content, so every test starts from a seeded database. */
beforeEach(async () => {
  await useTestDb(SEED);
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/a-propos']}>
      <AdminAProposPage />
    </MemoryRouter>,
  );
}

const initial = aproposFormValues(anApropos());

describe('AAP-2 admin À propos form', () => {
  it('prefills every field from the public page content', async () => {
    renderPage();
    await screen.findByTestId('admin-apropos-page');
    expect(screen.getByTestId('admin-apropos-page')).toBeInTheDocument();

    expect(screen.getByLabelText('Titre')).toHaveValue(initial.title);
    expect(screen.getByLabelText('Accroche')).toHaveValue(initial.intro);
    expect(screen.getByLabelText('Présentation')).toHaveValue(initial.bio);
    expect(screen.getByLabelText('Citation mise en avant')).toHaveValue(initial.quote);

    initial.stats.forEach((row, index) => {
      expect(screen.getByLabelText(`Libellé de la ligne ${index + 1}`)).toHaveValue(row.label);
      expect(screen.getByLabelText(`Valeur de la ligne ${index + 1}`)).toHaveValue(row.value);
    });
  });

  it('names the page and its purpose in the header', async () => {
    renderPage();
    await screen.findByTestId('admin-apropos-page');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page « À propos »');
    expect(
      screen.getByText('Ce que voient les visiteurs sur la page À propos'),
    ).toBeInTheDocument();
  });

  it('types into a text field and into a "Cette année" row', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('admin-apropos-page');

    const quote = screen.getByLabelText('Citation mise en avant');
    await user.clear(quote);
    await user.type(quote, 'Une phrase plus courte.');
    expect(quote).toHaveValue('Une phrase plus courte.');

    const value = screen.getByLabelText('Valeur de la ligne 2');
    await user.clear(value);
    await user.type(value, '29');
    expect(value).toHaveValue('29');
    // The row keeps its label while only the counter moves.
    expect(screen.getByLabelText('Libellé de la ligne 2')).toHaveValue(initial.stats[1].label);
  });

  it('saves in place — the state line appears and the page never navigates', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('admin-apropos-page');
    const before = window.location.href;

    expect(screen.queryByText('Enregistré')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(screen.getByText('Enregistré')).toBeInTheDocument();
    expect(screen.getByTestId('admin-apropos-page')).toBeInTheDocument();
    expect(window.location.href).toBe(before);
  });

  it('drops the state line as soon as a field changes again', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('admin-apropos-page');

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Enregistré')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Titre'), ' !');
    expect(screen.queryByText('Enregistré')).toBeNull();
  });

  it('offers a portrait upload, with no alt-text field beside it', async () => {
    renderPage();
    await screen.findByTestId('admin-apropos-page');

    // The control used to be a button with no onClick, over a CSS gradient —
    // the portrait is a real file now, so the field has to accept one.
    expect(screen.getByTestId('apropos-portrait-field')).toBeInTheDocument();
    expect(screen.getByLabelText('Portrait de la page À propos')).toHaveAttribute(
      'type',
      'file',
    );
    // The public page never read this field dynamically — the alt text is
    // fixed in `Hero.tsx` now, so there is nothing to edit here.
    expect(screen.queryByLabelText('Texte alternatif')).not.toBeInTheDocument();
  });

  it('uses tokens only — no raw hex color literal anywhere in the page', () => {
    for (const [path, code] of sources) {
      expect(code, path).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});

describe('AAP-2 admin À propos form, row never written', () => {
  it('mounts a blank, editable form instead of the load-error panel', async () => {
    // A fresh database — the row doesn't exist yet, so the editor is exactly
    // where a first-time save has to happen, not somewhere blocked by a retry
    // button.
    await useTestDb();
    renderPage();

    await screen.findByTestId('admin-apropos-page');
    expect(screen.queryByTestId('page-error')).not.toBeInTheDocument();

    // The greeting prefix is a helpful starting point, not fetched content —
    // there is no name typed after it yet.
    const title = screen.getByLabelText('Titre');
    expect(title).toHaveValue('Bonjour, moi c’est ');
    expect(screen.getByLabelText('Présentation')).toHaveValue('');

    const user = userEvent.setup();
    await user.type(title, 'Marie');
    expect(title).toHaveValue('Bonjour, moi c’est Marie');
  });
});
