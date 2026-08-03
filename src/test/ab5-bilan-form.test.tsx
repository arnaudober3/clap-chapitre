import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminBilanFormPage from '../pages/AdminBilanForm';
import AdminBilansPage from '../pages/AdminBilans';
import { aBilan, anArticle } from './fixtures';
import { useTestDb } from './api-server';

/**
 * The month in progress, with its three coups de cœur — the editor's own state.
 * Its avis are already in the shared seed; the draft just points at them.
 */
/**
 * A month in progress with three coups de cœur. Written out rather than built on
 * the shared seed, which already publishes a bilan for the same month — two rows
 * cannot share an id.
 */
const DRAFT = `
INSERT INTO articles (id,title,medium,excerpt,cover,author,status,published_at,likes,views,hook,body,for_those_who,related_to_title,related_to_note)
VALUES
 ('un-dernier-ete','Un dernier été','film','Un huis clos solaire.','grad','Marie-Zoé','published','2026-07-18',128,2180,
  'Et si le dernier été n’était jamais vraiment le dernier ?','Il y a des films qui ressemblent à une maison.

On en ressort avec du sable dans les poches.','Pour ceux qui aiment les fins ouvertes.','L’année de la pluie','Même façon de fouiller l’amitié.'),
 ('la-lumiere-du-nord','La lumière du Nord','serie','Un drame glacé.','grad','Marie-Zoé','published','2026-07-10',88,1180,
  'Peut-on se réchauffer à une lumière qui vient du froid ?','Il y a des films qui vous laissent dehors.

On en ressort lessivé.','Pour ceux qui aiment les décors qui parlent.','Un dernier été','Même goût pour les silences.'),
 ('l-annee-de-la-pluie','L’année de la pluie','livre','Une chronique d’amitié.','grad','Marie-Zoé','published','2026-07-04',74,1210,
  'Peut-on relire une amitié ?','Le livre avance au rythme des averses.','Pour ceux qui gardent les lettres.',NULL,NULL);

INSERT INTO bilans (id,year,month,month_label,title,mood,status,updated_at,views,likes)
VALUES ('2026-07',2026,7,'Juillet','Les longues soirées','Un mois de lumière rasante.','draft','2026-07-20T09:00:00Z',0,0);

INSERT INTO bilan_avis (bilan_id,article_id,position)
VALUES ('2026-07','un-dernier-ete',1),('2026-07','la-lumiere-du-nord',2),('2026-07','l-annee-de-la-pluie',3);
`;

/** What the seeded draft holds, for the assertions below. */
const draft = aBilan({
  id: '2026-07',
  status: 'published',
  monthLabel: 'Juillet',
  avis: [
    anArticle({
      relatedTo: { title: 'L’année de la pluie', note: 'Même façon de fouiller l’amitié.' },
      forThoseWho: 'Pour ceux qui aiment les fins ouvertes.',
    }),
    anArticle({
      id: 'la-lumiere-du-nord',
      title: 'La lumière du Nord',
      medium: 'serie',
      hook: 'Peut-on se réchauffer à une lumière qui vient du froid ?',
      body: 'Il y a des films qui vous laissent dehors.\n\nOn en ressort lessivé.',
      forThoseWho: 'Pour ceux qui aiment les décors qui parlent.',
      relatedTo: { title: 'Un dernier été', note: 'Même goût pour les silences.' },
    }),
    anArticle({ id: 'l-annee-de-la-pluie', title: 'L’année de la pluie', medium: 'livre' }),
  ],
});

beforeEach(() => {
  useTestDb(DRAFT);
});

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


describe('AB-5 bilan form — creation', () => {
  it('opens an empty editor with no coup de cœur and no derived month', async () => {
    renderAt('/admin/bilans/nouveau');
    await screen.findByTestId("admin-bilan-form-page");
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
    await screen.findByTestId('admin-bilan-form-page');

    await user.type(screen.getByLabelText(/Titre du bilan/), 'Août 2026');
    expect(screen.getByLabelText(/Titre du bilan/)).toHaveValue('Août 2026');

    await user.type(screen.getByLabelText('L’humeur du mois'), 'Un mois lumineux.');
    expect(screen.getByLabelText('L’humeur du mois')).toHaveValue('Un mois lumineux.');
  });

  it('publishes back to the listing (mock — nothing is stored)', async () => {
    const user = userEvent.setup();
    renderAt('/admin/bilans/nouveau');
    await screen.findByTestId('admin-bilan-form-page');

    await user.click(screen.getByRole('button', { name: 'Publier le bilan' }));
    expect(screen.getByTestId('admin-bilans-page')).toBeInTheDocument();
  });
});

describe('AB-5 bilan form — editing the month in progress', () => {
  it('prefills the title, the mood and the derived month', async () => {
    renderAt(`/admin/bilans/${draft.id}`);
    await screen.findByTestId("admin-bilan-form-page");
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

  it('renders one card per avis, with every editable field filled', async () => {
    renderAt(`/admin/bilans/${draft.id}`);
    await screen.findByTestId("admin-bilan-form-page");
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

  it('lists the cards in the model order, ungrouped, each naming its medium', async () => {
    renderAt(`/admin/bilans/${draft.id}`);
    await screen.findByTestId("admin-bilan-form-page");
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
    await screen.findByTestId('admin-bilan-form-page');

    const [first, second] = screen.getAllByLabelText('Titre de l’œuvre');
    await user.clear(first);
    await user.type(first, 'Un autre titre');

    expect(first).toHaveValue('Un autre titre');
    expect(second).toHaveValue(draft.avis[1].title);
  });

  it('opens the avis picker from the add button', async () => {
    const user = userEvent.setup();
    renderAt(`/admin/bilans/${draft.id}`);
    await screen.findByTestId('admin-bilan-form-page');

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
    await screen.findByTestId('admin-bilan-form-page');

    await user.click(screen.getByRole('link', { name: /Créer le résumé/ }));
    expect(screen.getByTestId('admin-newsletter-page')).toBeInTheDocument();
  });

  it('sends an unknown month back to the listing', async () => {
    renderAt('/admin/bilans/2099-99');
    await screen.findByTestId("admin-bilans-page");
    expect(screen.getByTestId('admin-bilans-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-bilan-form-page')).toBeNull();
  });
});
