import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminBilanFormPage from '../pages/AdminBilanForm';
import AdminBilansPage from '../pages/AdminBilans';
import { currentDraftBilan } from '../mock/adminBilans';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/bilans" element={<AdminBilansPage />} />
        <Route path="/admin/bilans/nouveau" element={<AdminBilanFormPage />} />
        <Route path="/admin/bilans/:id" element={<AdminBilanFormPage />} />
        <Route path="/admin/newsletter" element={<div data-testid="admin-newsletter-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const draft = currentDraftBilan()!;

describe('AB-5 bilan form — creation', () => {
  it('opens an empty editor with no coup de cœur and no derived month', () => {
    renderAt('/admin/bilans/nouveau');
    const page = screen.getByTestId('admin-bilan-form-page');

    expect(within(page).getByLabelText(/Titre du bilan/)).toHaveValue('');
    expect(within(page).getByLabelText('L’humeur du mois')).toHaveValue('');
    expect(within(page).queryAllByLabelText('Titre de l’œuvre')).toHaveLength(0);
    // No bilan behind the form means no month to hang off the label.
    expect(within(page).queryByText(/· juillet 2026/)).toBeNull();
    expect(within(page).getByText('Nouveau bilan')).toBeInTheDocument();
  });

  it('types into the title and the mood', async () => {
    const user = userEvent.setup();
    renderAt('/admin/bilans/nouveau');

    await user.type(screen.getByLabelText(/Titre du bilan/), 'Août 2026');
    expect(screen.getByLabelText(/Titre du bilan/)).toHaveValue('Août 2026');

    await user.type(screen.getByLabelText('L’humeur du mois'), 'Un mois lumineux.');
    expect(screen.getByLabelText('L’humeur du mois')).toHaveValue('Un mois lumineux.');
  });

  it('publishes back to the listing (mock — nothing is stored)', async () => {
    const user = userEvent.setup();
    renderAt('/admin/bilans/nouveau');

    await user.click(screen.getByRole('button', { name: 'Publier le bilan' }));
    expect(screen.getByTestId('admin-bilans-page')).toBeInTheDocument();
  });
});

describe('AB-5 bilan form — editing the month in progress', () => {
  it('prefills the title, the mood and the derived month', () => {
    renderAt(`/admin/bilans/${draft.id}`);
    const page = screen.getByTestId('admin-bilan-form-page');

    expect(within(page).getByLabelText(/Titre du bilan/)).toHaveValue(draft.title);
    expect(within(page).getByLabelText('L’humeur du mois')).toHaveValue(draft.mood);
    // The month is never typed — it rides along with the field's label.
    expect(
      within(page).getByText(`· ${draft.monthLabel.toLowerCase()} ${draft.year}`),
    ).toBeInTheDocument();
    // The desktop breadcrumb names the bilan and links back to the listing.
    expect(within(page).getByRole('link', { name: 'Bilans culturels' })).toHaveAttribute(
      'href',
      '/admin/bilans',
    );
  });

  it('renders one card per avis, with every editable field filled', () => {
    renderAt(`/admin/bilans/${draft.id}`);
    const page = screen.getByTestId('admin-bilan-form-page');
    const first = draft.avis[0];

    expect(within(page).getAllByLabelText('Titre de l’œuvre')).toHaveLength(draft.avis.length);
    // The first card is the film section's, since MEDIA orders films first.
    expect(within(page).getAllByLabelText('Titre de l’œuvre')[0]).toHaveValue(first.title);
    expect(within(page).getAllByLabelText('Accroche')[0]).toHaveValue(first.hook);
    // The body keeps its blank lines verbatim — it is the paragraph source.
    expect(within(page).getAllByLabelText('Avis')[0]).toHaveValue(first.body);
    expect(within(page).getAllByLabelText('À rapprocher de — titre')[0]).toHaveValue(
      first.relatedTo!.title,
    );
    expect(within(page).getAllByLabelText('À rapprocher de — en quoi')[0]).toHaveValue(
      first.relatedTo!.note,
    );
    expect(within(page).getAllByLabelText('Pour ceux qui…')[0]).toHaveValue(first.forThoseWho);
  });

  it('lists the cards in the model order, ungrouped, each naming its medium', () => {
    renderAt(`/admin/bilans/${draft.id}`);
    const page = screen.getByTestId('admin-bilan-form-page');

    const titles = within(page)
      .getAllByLabelText('Titre de l’œuvre')
      .map((field) => (field as HTMLInputElement).value);
    expect(titles).toEqual(draft.avis.map((avis) => avis.title));
    // Nothing groups the cards, so no medium heading is drawn — the chip on
    // each card carries that information instead.
    expect(within(page).queryAllByRole('heading', { level: 2 })).toHaveLength(0);
    for (const label of ['Film', 'Série', 'Livre']) {
      expect(within(page).getByText(label)).toBeInTheDocument();
    }
  });

  it('edits a coup de cœur field without touching its neighbours', async () => {
    const user = userEvent.setup();
    renderAt(`/admin/bilans/${draft.id}`);

    const [first, second] = screen.getAllByLabelText('Titre de l’œuvre');
    await user.clear(first);
    await user.type(first, 'Un autre titre');

    expect(first).toHaveValue('Un autre titre');
    expect(second).toHaveValue(draft.avis[1].title);
  });

  it('opens the avis picker from the add button', async () => {
    const user = userEvent.setup();
    renderAt(`/admin/bilans/${draft.id}`);

    const add = screen.getByRole('button', { name: 'Ajouter un coup de cœur' });
    expect(add).toHaveAttribute('aria-expanded', 'false');
    await user.click(add);
    // The panel is open; picking an avis is covered in depth by ab7.
    expect(add).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox', { name: /mettre en avant/ })).toBeInTheDocument();
  });

  it('hands the month over to the newsletter section', async () => {
    const user = userEvent.setup();
    renderAt(`/admin/bilans/${draft.id}`);

    await user.click(screen.getByRole('link', { name: /Créer le résumé/ }));
    expect(screen.getByTestId('admin-newsletter-page')).toBeInTheDocument();
  });

  it('sends an unknown month back to the listing', () => {
    renderAt('/admin/bilans/2099-99');
    expect(screen.getByTestId('admin-bilans-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-bilan-form-page')).toBeNull();
  });
});
