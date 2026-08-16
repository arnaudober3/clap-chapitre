import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminNewsletterPage from '../pages/AdminNewsletter';
import { editionFor, editionLabel, proposedSlotFor, sourceLabel } from '../newsletter';
import { aBilan, SEED } from './fixtures';
import { useTestDb } from './api-server';

const source = aBilan(); // '2026-07', the newest published month — matches SEED.
const other = aBilan({
  id: '2026-06',
  year: 2026,
  month: 6,
  monthLabel: 'Juin',
  title: 'Un mois plus calme',
  mood: undefined,
  publishedAt: '2026-07-02',
});

/** SEED plus a second published bilan, so the picker has something to switch to. */
const TWO_MONTHS = `${SEED}
INSERT INTO bilans (id,year,month,month_label,title,mood,status,published_at,views,likes)
VALUES ('2026-06',2026,6,'Juin','Un mois plus calme',NULL,'published','2026-07-02',100,10);
INSERT INTO bilan_avis (bilan_id,article_id,position) VALUES ('2026-06','un-dernier-ete',1);
INSERT INTO bilan_counts (bilan_id,medium,count) VALUES ('2026-06','film',1);
INSERT INTO newsletter_subscribers (email,status,subscribed_at,unsubscribe_token) VALUES
  ('a@exemple.fr','subscribed',datetime('now'),'tok-a'),
  ('b@exemple.fr','subscribed',datetime('now'),'tok-b');
`;

/** SEED plus a second bilan already mailed — 'already sent' straight from the seed. */
const ONE_ALREADY_SENT = `${SEED}
INSERT INTO newsletter_sends (id,bilan_id,subject,title,status,sent_at,recipient_count,failure_count)
VALUES ('bilan-de-juillet','2026-07','Clap et chapitre — Les longues soirées','Les longues soirées','sent',datetime('now','-1 days'),3,0);
`;

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminNewsletterPage />
    </MemoryRouter>,
  );
}

/** Open the source dropdown and pick the given month. */
async function pickSource(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(within(screen.getByTestId('newsletter-source')).getByRole('button'));
  const listbox = screen.getByRole('listbox', { name: 'Source du contenu' });
  await user.click(within(listbox).getByRole('button', { name: label }));
}

/**
 * Opens "Programmer" and confirms a safely-future slot. The proposed slot
 * (the day after the bilan's own `publishedAt`, a fixed 2026 date) is not
 * reliably in the future relative to whenever the suite actually runs, and
 * the schedule route refuses a past instant — so every booking test picks an
 * explicit date years out instead of trusting the pre-filled one.
 */
async function bookFutureSlot(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Programmer' }));
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2030-01-01' } });
  await user.click(screen.getByRole('button', { name: 'Confirmer' }));
}

/**
 * The status pill always exists — only its text changes as a mutation
 * resolves and the page reloads its data — so `findByTestId` alone resolves
 * immediately on the stale text and proves nothing. Polling the assertion
 * itself is what actually waits for the new content.
 */
async function expectStatus(text: string) {
  await waitFor(() => {
    expect(screen.getByTestId('newsletter-status')).toHaveTextContent(text);
  });
}

describe('AN-4 AdminNewsletterPage', () => {
  beforeEach(() => {
    useTestDb(TWO_MONTHS);
  });

  it('opens on the most recent mailable month', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Newsletter');
    expect(
      await screen.findByText(`Le courrier du mois — édition ${editionLabel(source)}`),
    ).toBeInTheDocument();
    expect(screen.getByText(`Aperçu — généré depuis « ${source.title} »`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(source.title);
  });

  it('announces the edition as ready to send', async () => {
    renderPage();
    await expectStatus('Prête');
  });

  it('regenerates the preview and the subject when the source changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 2 });
    await pickSource(user, sourceLabel(other));

    const edition = editionFor(other);
    expect(await screen.findByRole('heading', { level: 2, name: other.title })).toBeInTheDocument();
    expect(screen.getByText(edition.eyebrow)).toBeInTheDocument();
    expect(screen.getByLabelText('Objet')).toHaveValue(edition.subject);
    expect(
      screen.getByText(`Le courrier du mois — édition ${editionLabel(other)}`),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lire le bilan complet/ })).toHaveAttribute(
      'href',
      `/bilan-culturel?mois=${other.id}`,
    );
  });

  it('sends for real: status, locked button, and a new line in "Derniers envois"', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: 'Envoyer maintenant' });
    expect(within(screen.getByTestId('newsletter-sends')).getByText("Aucun envoi pour l'instant.")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Envoyer maintenant' }));

    expect(await screen.findByRole('button', { name: 'Envoyée' })).toBeDisabled();
    expect(screen.getByTestId('newsletter-status')).toHaveTextContent('Envoyée');

    const rows = within(screen.getByTestId('newsletter-sends')).getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent(source.title);
    // Two real subscribers were seeded — the recipient count is honest.
    expect(screen.getByText(/2 abonnés/)).toBeInTheDocument();
  });

  it('offers the next month afresh after a send, and keeps the sent one in the log', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Envoyer maintenant' }));
    await screen.findByRole('button', { name: 'Envoyée' });

    await pickSource(user, sourceLabel(other));

    await expectStatus('Prête');
    expect(screen.getByRole('button', { name: 'Envoyer maintenant' })).toBeEnabled();
    expect(
      within(screen.getByTestId('newsletter-sends')).getAllByRole('listitem'),
    ).toHaveLength(1);
  });

  it('books a slot, shows it in the status pill, and lets it be undone', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: 'Envoyer maintenant' });
    const slot = proposedSlotFor(source);

    await user.click(screen.getByRole('button', { name: 'Programmer' }));
    expect(screen.getByLabelText('Date')).toHaveValue(slot.date);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2030-01-01' } });
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await expectStatus('Programmée');
    // Booked, not gone: it can still be sent on the spot.
    expect(screen.getByRole('button', { name: 'Envoyer maintenant' })).toBeEnabled();

    await user.click(await screen.findByRole('button', { name: 'Annuler' }));
    await expectStatus('Prête');
  });

  it('drops the booking when the edition is sent early', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: 'Envoyer maintenant' });
    await bookFutureSlot(user);
    await screen.findByText(/Programmée pour le/);

    await user.click(screen.getByRole('button', { name: 'Envoyer maintenant' }));

    await expectStatus('Envoyée');
    expect(screen.queryByText(/Programmée pour le/)).toBeNull();
  });

  it("books each month on its own, and re-proposes the new month's slot", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: 'Envoyer maintenant' });
    await bookFutureSlot(user);
    await screen.findByText(/Programmée pour le/);

    await pickSource(user, sourceLabel(other));
    await expectStatus('Prête');
    await user.click(screen.getByRole('button', { name: 'Programmer' }));
    expect(screen.getByLabelText('Date')).toHaveValue(proposedSlotFor(other).date);

    // Going back finds the first month still booked.
    await pickSource(user, sourceLabel(source));
    await expectStatus('Programmée');
  });
});

describe('AN-4 AdminNewsletterPage — an edition already mailed', () => {
  it('opens already showing "Envoyée", disabled, with the send in the history', async () => {
    useTestDb(ONE_ALREADY_SENT);
    renderPage();

    expect(await screen.findByRole('button', { name: 'Envoyée' })).toBeDisabled();
    expect(screen.getByTestId('newsletter-status')).toHaveTextContent('Envoyée');
    expect(
      within(screen.getByTestId('newsletter-sends')).getByText(source.title),
    ).toBeInTheDocument();
  });
});
