import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminAProposPage from '../pages/AdminAPropos';
import { aproposFormValues } from '../mock/apropos';

const root = resolve(__dirname, '../..');

/** Source scans below look for real code, so comments are stripped first. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

const sources = [
  'src/pages/AdminAPropos/index.tsx',
  'src/pages/AdminAPropos/PortraitField.tsx',
  'src/pages/AdminAPropos/YearStatsFields.tsx',
  'src/pages/AdminAPropos/AdminAPropos.module.css',
].map((path) => [path, stripComments(readFileSync(resolve(root, path), 'utf8'))] as const);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/a-propos']}>
      <AdminAProposPage />
    </MemoryRouter>,
  );
}

const initial = aproposFormValues();

describe('AAP-2 admin À propos form', () => {
  it('prefills every field from the public page content', () => {
    renderPage();
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

  it('names the page and its purpose in the header', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page « À propos »');
    expect(
      screen.getByText('Ce que voient les visiteurs sur la page À propos'),
    ).toBeInTheDocument();
  });

  it('types into a text field and into a "Cette année" row', async () => {
    const user = userEvent.setup();
    renderPage();

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

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Enregistré')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Titre'), ' !');
    expect(screen.queryByText('Enregistré')).toBeNull();
  });

  it('restores the mock content when "Annuler" is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    const title = screen.getByLabelText('Titre');
    await user.clear(title);
    await user.type(title, 'Autre chose');
    const firstValue = screen.getByLabelText('Valeur de la ligne 1');
    await user.clear(firstValue);
    expect(title).toHaveValue('Autre chose');
    expect(firstValue).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(title).toHaveValue(initial.title);
    expect(firstValue).toHaveValue(initial.stats[0].value);
  });

  it('offers the portrait control without requesting anything from the network', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Changer le portrait' })).toBeInTheDocument();
    for (const [path, code] of sources) {
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
