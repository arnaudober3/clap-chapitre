import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminMeSuivrePage from '../pages/AdminMeSuivre';
import { moveTo, moveByOne } from '../reorder';
import { mesuivreFormValues } from '../mock/mesuivre';

const initial = mesuivreFormValues();
const NAMES = initial.links.map((row) => row.name);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/me-suivre']}>
      <AdminMeSuivrePage />
    </MemoryRouter>,
  );
}

/** The names currently rendered, in DOM order — the name is each row's first input. */
function names(): string[] {
  return screen
    .getAllByTestId('link-row')
    .map((row) => (row.querySelector('input') as HTMLInputElement).value);
}

function handleOf(row: HTMLElement): HTMLElement {
  return within(row).getByRole('button', { name: /^Déplacer/ });
}

/** jsdom builds no DataTransfer, and the drag start writes a payload to one. */
function dragStart(row: HTMLElement) {
  fireEvent.pointerDown(handleOf(row));
  fireEvent.dragStart(row, {
    dataTransfer: { setData: () => {}, effectAllowed: '' },
  });
}

describe('AMS-2 shared reorder helpers, on links', () => {
  // The helpers moved to src/reorder.ts to serve both editors; AB-6 covers them
  // on coups de cœur, this covers the generic contract on another item type.
  const list = initial.links;

  it('moves a link to another link’s position', () => {
    expect(moveTo(list, 'threads', 'babelio').map((row) => row.id)).toEqual([
      'letterboxd',
      'babelio',
      'threads',
      'linkedin',
    ]);
    expect(moveByOne(list, 'linkedin', -1).map((row) => row.id)).toEqual([
      'threads',
      'letterboxd',
      'linkedin',
      'babelio',
    ]);
    expect(list.map((row) => row.id)).toEqual([
      'threads',
      'letterboxd',
      'babelio',
      'linkedin',
    ]);
  });

  it('hands back the same array on a no-op, so a live drag stops re-rendering', () => {
    expect(moveTo(list, 'threads', 'threads')).toBe(list);
    expect(moveTo(list, 'threads', 'inconnu')).toBe(list);
    expect(moveByOne(list, 'threads', -1)).toBe(list);
    expect(moveByOne(list, 'linkedin', 1)).toBe(list);
  });
});

describe('AMS-2 links list', () => {
  it('renders one row per link of the public page', () => {
    renderPage();
    expect(screen.getAllByTestId('link-row')).toHaveLength(initial.links.length);
    expect(names()).toEqual(NAMES);
    initial.links.forEach((row, index) => {
      expect(screen.getByLabelText(`Adresse du lien ${index + 1}`)).toHaveValue(row.url);
    });
  });

  it('removes the row whose ✕ was clicked, not the one at that index later', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Supprimer « Babelio »' }));
    expect(names()).toEqual(['Threads', 'Letterboxd', 'LinkedIn']);

    await user.click(screen.getByRole('button', { name: 'Supprimer « Threads »' }));
    expect(names()).toEqual(['Letterboxd', 'LinkedIn']);
  });

  it('appends an empty row on "Ajouter un lien" and lets it be named', async () => {
    const user = userEvent.setup();
    renderPage();
    const count = initial.links.length;

    await user.click(screen.getByTestId('add-link'));
    expect(screen.getAllByTestId('link-row')).toHaveLength(count + 1);

    const name = screen.getByLabelText(`Nom du lien ${count + 1}`);
    const url = screen.getByLabelText(`Adresse du lien ${count + 1}`);
    expect(name).toHaveValue('');
    expect(url).toHaveValue('');
    // Until it is named the row still announces itself, and shows the add mark.
    expect(
      screen.getByRole('button', { name: `Déplacer « sans nom » — ${count + 1} sur ${count + 1}` }),
    ).toBeInTheDocument();

    await user.type(name, 'Mastodon');
    await user.type(url, 'piaille.fr/@mariezoe');
    expect(name).toHaveValue('Mastodon');
    expect(url).toHaveValue('piaille.fr/@mariezoe');
    // The chip picks the abbreviation up from the name as it is typed.
    expect(screen.getByText('Ma')).toBeInTheDocument();
  });

  it('keeps added rows distinct from one another when some are removed', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('add-link'));
    await user.type(screen.getByLabelText('Nom du lien 5'), 'Mastodon');
    await user.click(screen.getByTestId('add-link'));
    await user.type(screen.getByLabelText('Nom du lien 6'), 'Bluesky');

    await user.click(screen.getByRole('button', { name: 'Supprimer « Mastodon »' }));
    expect(names()).toEqual([...NAMES, 'Bluesky']);
  });

  it('reorders live while the pointer travels, before any drop', () => {
    renderPage();

    dragStart(screen.getAllByTestId('link-row')[0]);
    // Merely flying over the third row is enough — no drop involved.
    fireEvent.dragOver(screen.getAllByTestId('link-row')[2]);
    expect(names()).toEqual(['Letterboxd', 'Babelio', 'Threads', 'LinkedIn']);

    // And it keeps following the pointer on the way back.
    fireEvent.dragOver(screen.getAllByTestId('link-row')[0]);
    expect(names()).toEqual(['Threads', 'Letterboxd', 'Babelio', 'LinkedIn']);
  });

  it('dims the travelling row, and stops once the drag ends', () => {
    renderPage();
    const dimmed = () =>
      screen.getAllByTestId('link-row').filter((row) => row.className.includes('Dragging'));

    expect(dimmed()).toHaveLength(0);
    const first = screen.getAllByTestId('link-row')[0];
    dragStart(first);
    expect(dimmed()).toHaveLength(1);

    fireEvent.dragEnd(first);
    expect(dimmed()).toHaveLength(0);
  });

  it('ignores hovering when no drag started', () => {
    renderPage();
    fireEvent.dragOver(screen.getAllByTestId('link-row')[1]);
    expect(names()).toEqual(NAMES);
  });

  it('reorders from the keyboard, which is the handle’s other half', async () => {
    const user = userEvent.setup();
    renderPage();

    handleOf(screen.getAllByTestId('link-row')[1]).focus();
    await user.keyboard('{ArrowUp}');
    expect(names()).toEqual(['Letterboxd', 'Threads', 'Babelio', 'LinkedIn']);

    // The handle travelled with its row, so the focus is still on it.
    await user.keyboard('{ArrowDown}');
    expect(names()).toEqual(NAMES);

    // At the edges the row simply stays put.
    handleOf(screen.getAllByTestId('link-row')[0]).focus();
    await user.keyboard('{ArrowUp}');
    handleOf(screen.getAllByTestId('link-row')[3]).focus();
    await user.keyboard('{ArrowDown}');
    expect(names()).toEqual(NAMES);
  });

  it('names every control after the link it acts on, and its rank', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: 'Déplacer « Threads » — 1 sur 4' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Déplacer « LinkedIn » — 4 sur 4' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Supprimer « Letterboxd »' }),
    ).toBeInTheDocument();
  });
});
