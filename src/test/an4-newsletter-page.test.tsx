import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminNewsletterPage from '../pages/AdminNewsletter';
import {
  defaultNewsletterSource,
  editionFor,
  editionLabel,
  newsletterSources,
  proposedSlotFor,
  recentSends,
  slotLabel,
  sourceLabel,
} from '../mock/newsletter';

const source = defaultNewsletterSource();
const other = newsletterSources()[1];

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

describe('AN-4 AdminNewsletterPage', () => {
  it('opens on the most recent mailable month', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Newsletter');
    expect(
      screen.getByText(`Le courrier du mois — édition ${editionLabel(source)}`),
    ).toBeInTheDocument();
    expect(screen.getByText(`Aperçu — généré depuis « ${source.title} »`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(source.title);
  });

  it('announces the edition as ready to send', () => {
    renderPage();
    expect(screen.getByTestId('newsletter-status')).toHaveTextContent('Prête à envoyer');
  });

  it('regenerates the preview and the subject when the source changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await pickSource(user, sourceLabel(other));

    const edition = editionFor(other);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(other.title);
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

  it('acknowledges a send: status, locked button and a new line in the log', async () => {
    const user = userEvent.setup();
    renderPage();
    const before = within(screen.getByTestId('newsletter-sends')).getAllByRole('listitem');
    expect(before).toHaveLength(recentSends().length);

    await user.click(screen.getByRole('button', { name: 'Envoyer maintenant' }));

    expect(screen.getByTestId('newsletter-status')).toHaveTextContent('Envoyée');
    expect(screen.getByRole('button', { name: 'Envoyée' })).toBeDisabled();

    const after = within(screen.getByTestId('newsletter-sends')).getAllByRole('listitem');
    expect(after).toHaveLength(recentSends().length + 1);
    expect(after[0]).toHaveTextContent('à l’instant');
  });

  it('offers the next month afresh after a send', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Envoyer maintenant' }));
    await pickSource(user, sourceLabel(other));

    expect(screen.getByTestId('newsletter-status')).toHaveTextContent('Prête à envoyer');
    expect(screen.getByRole('button', { name: 'Envoyer maintenant' })).toBeEnabled();
    // The month already mailed keeps its line in the log.
    expect(
      within(screen.getByTestId('newsletter-sends')).getAllByRole('listitem'),
    ).toHaveLength(recentSends().length + 1);
  });

  it('carries a booking into the status pill, and lets it be undone', async () => {
    const user = userEvent.setup();
    renderPage();
    const slot = proposedSlotFor(source);

    await user.click(screen.getByRole('button', { name: 'Programmer' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(screen.getByTestId('newsletter-status')).toHaveTextContent(
      `Programmée · ${slotLabel(slot)}`,
    );
    // The edition is booked, not gone: it can still be sent on the spot.
    expect(screen.getByRole('button', { name: 'Envoyer maintenant' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByTestId('newsletter-status')).toHaveTextContent('Prête à envoyer');
  });

  it('drops the booking when the edition is sent early', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Programmer' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));
    await user.click(screen.getByRole('button', { name: 'Envoyer maintenant' }));

    expect(screen.getByTestId('newsletter-status')).toHaveTextContent('Envoyée');
    expect(screen.queryByText(/Programmée pour le/)).toBeNull();
  });

  it('books each month on its own, and re-proposes the new month’s slot', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Programmer' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await pickSource(user, sourceLabel(other));
    expect(screen.getByTestId('newsletter-status')).toHaveTextContent('Prête à envoyer');
    await user.click(screen.getByRole('button', { name: 'Programmer' }));
    expect(screen.getByLabelText('Date')).toHaveValue(proposedSlotFor(other).date);

    // Going back finds the first month still booked.
    await pickSource(user, sourceLabel(source));
    expect(screen.getByTestId('newsletter-status')).toHaveTextContent(
      `Programmée · ${slotLabel(proposedSlotFor(source))}`,
    );
  });

  it('replaces a month’s own past send rather than listing it twice', async () => {
    const user = userEvent.setup();
    renderPage();
    const already = recentSends()[0];
    await pickSource(user, sourceLabel(newsletterSources().find((b) => b.id === already.id)!));
    await user.click(screen.getByRole('button', { name: 'Envoyer maintenant' }));

    const rows = within(screen.getByTestId('newsletter-sends')).getAllByRole('listitem');
    expect(rows).toHaveLength(recentSends().length);
    expect(rows[0]).toHaveTextContent('à l’instant');
  });
});
