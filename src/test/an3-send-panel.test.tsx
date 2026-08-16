import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SendPanel from '../pages/AdminNewsletter/SendPanel';
import SubscribersPanel from '../pages/AdminNewsletter/SubscribersPanel';
import type { NewsletterSendRecord, NewsletterStats } from '../api/admin';
import { EDITOR_EMAIL, editionFor, instantLabel, proposedSlotFor, slotLabel, sourceLabel } from '../newsletter';
import { aBilan } from './fixtures';

const source = aBilan();
const other = aBilan({ id: '2026-06', monthLabel: 'Juin', year: 2026 });
const slot = proposedSlotFor(source);
const sources = [source, other].map((bilan) => ({ id: bilan.id, label: sourceLabel(bilan) }));

type SendPanelProps = Parameters<typeof SendPanel>[0];

function renderSendPanel(overrides: Partial<SendPanelProps> = {}) {
  const props: SendPanelProps = {
    subject: editionFor(source).subject,
    onSubjectChange: vi.fn(),
    sourceId: source.id,
    onSourceChange: vi.fn(),
    sources,
    recipientCount: 1284,
    slot,
    onSchedule: vi.fn(),
    schedulePending: false,
    onCancelSchedule: vi.fn(),
    sent: false,
    onSend: vi.fn(),
    sendPending: false,
    onSendTest: vi.fn(),
    testPending: false,
    ...overrides,
  };
  render(<SendPanel {...props} />);
  return props;
}

describe('AN-3 newsletter panels', () => {
  it('pre-fills the subject and lets it be edited', async () => {
    const user = userEvent.setup();
    const props = renderSendPanel();
    const subject = screen.getByLabelText('Objet');
    expect(subject).toHaveValue(editionFor(source).subject);

    await user.type(subject, '!');
    expect(props.onSubjectChange).toHaveBeenCalled();
  });

  it('offers every source it is given', async () => {
    const user = userEvent.setup();
    const props = renderSendPanel();
    const select = within(screen.getByTestId('newsletter-source'));
    expect(select.getByRole('button')).toHaveTextContent(sourceLabel(source));

    await user.click(select.getByRole('button'));
    const listbox = within(screen.getByRole('listbox', { name: 'Source du contenu' }));
    expect(listbox.getAllByRole('option').map((option) => option.textContent)).toEqual(
      sources.map((item) => item.label),
    );

    await user.click(listbox.getByRole('button', { name: sourceLabel(other) }));
    expect(props.onSourceChange).toHaveBeenCalledWith(other.id);
  });

  it('states who it goes to, and nothing about a template', () => {
    renderSendPanel();
    expect(screen.getByText(/1 284 abonnés/)).toBeInTheDocument();
    // There is only ever one template, so the design's "Modèle" row is dropped.
    expect(screen.queryByText('Modèle')).toBeNull();
  });

  it('reports the send to the page', async () => {
    const user = userEvent.setup();
    const props = renderSendPanel();
    await user.click(screen.getByRole('button', { name: 'Envoyer maintenant' }));
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  it('shows "Envoi…" and disables the button while the send is in flight', () => {
    renderSendPanel({ sendPending: true });
    expect(screen.getByRole('button', { name: 'Envoi…' })).toBeDisabled();
  });

  it('surfaces the send error next to the button', () => {
    renderSendPanel({ sendError: 'La base de données est indisponible.' });
    expect(screen.getByText('La base de données est indisponible.')).toBeInTheDocument();
  });

  it('reads "Envoyée" and is disabled once the edition has gone out', () => {
    renderSendPanel({ sent: true });
    const button = screen.getByRole('button', { name: 'Envoyée' });
    expect(button).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Envoyer maintenant' })).toBeNull();
    // Nothing left to test or to book once it is gone.
    expect(screen.getByRole('button', { name: "M'envoyer un test" })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Programmer' })).toBeDisabled();
  });

  it("asks for an address before sending a test, pre-filled with the editor's", async () => {
    const user = userEvent.setup();
    renderSendPanel();
    expect(screen.queryByTestId('newsletter-test-form')).toBeNull();

    await user.click(screen.getByRole('button', { name: "M'envoyer un test" }));
    expect(screen.getByLabelText('Adresse de test')).toHaveValue(EDITOR_EMAIL);
  });

  it('refuses an address that is not one, and says so, without calling onSendTest', async () => {
    const user = userEvent.setup();
    const props = renderSendPanel();
    await user.click(screen.getByRole('button', { name: "M'envoyer un test" }));

    const field = screen.getByLabelText('Adresse de test');
    await user.clear(field);
    await user.type(field, 'marie-zoe');
    await user.click(screen.getByRole('button', { name: 'Envoyer le test' }));

    expect(screen.getByRole('alert')).toHaveTextContent('ne ressemble pas à un e-mail');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    // The form stays open on the bad value rather than swallowing it.
    expect(screen.getByTestId('newsletter-test-form')).toBeInTheDocument();
    expect(screen.queryByText(/Test envoyé/)).toBeNull();
    expect(props.onSendTest).not.toHaveBeenCalled();
  });

  it('calls onSendTest and acknowledges it on a valid address', async () => {
    const user = userEvent.setup();
    const props = renderSendPanel();
    await user.click(screen.getByRole('button', { name: "M'envoyer un test" }));

    const field = screen.getByLabelText('Adresse de test');
    await user.clear(field);
    await user.type(field, 'relecture@exemple.fr');
    await user.click(screen.getByRole('button', { name: 'Envoyer le test' }));

    expect(props.onSendTest).toHaveBeenCalledWith('relecture@exemple.fr');
    expect(screen.getByText('Test envoyé à relecture@exemple.fr.')).toBeInTheDocument();
    expect(screen.queryByTestId('newsletter-test-form')).toBeNull();
  });

  it('surfaces a server-side test error once the test form is open', async () => {
    const user = userEvent.setup();
    renderSendPanel({ testError: 'Le test a échoué.' });
    await user.click(screen.getByRole('button', { name: "M'envoyer un test" }));
    expect(screen.getByText('Le test a échoué.')).toBeInTheDocument();
  });

  it('proposes a slot and spells the booking out (Paris time) before confirming it', async () => {
    const user = userEvent.setup();
    const props = renderSendPanel();
    await user.click(screen.getByRole('button', { name: 'Programmer' }));

    expect(screen.getByLabelText('Date')).toHaveValue(slot.date);
    expect(screen.getByLabelText('Heure')).toHaveValue(slot.time);
    expect(
      screen.getByText(`L'envoi partira le ${slotLabel(slot)} (heure de Paris) aux 1 284 abonnés.`),
    ).toBeInTheDocument();
    expect(props.onSchedule).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(props.onSchedule).toHaveBeenCalledWith(slot.date, slot.time);
    expect(screen.queryByTestId('newsletter-schedule-form')).toBeNull();
  });

  it('books the slot the editor actually picked', async () => {
    const user = userEvent.setup();
    const props = renderSendPanel();
    await user.click(screen.getByRole('button', { name: 'Programmer' }));

    await user.clear(screen.getByLabelText('Heure'));
    await user.type(screen.getByLabelText('Heure'), '18:30');
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(props.onSchedule).toHaveBeenCalledWith(slot.date, '18:30');
  });

  it('surfaces a scheduling error once the schedule form is open', async () => {
    const user = userEvent.setup();
    renderSendPanel({ scheduleError: 'Cette édition a déjà été envoyée.' });
    await user.click(screen.getByRole('button', { name: 'Programmer' }));
    expect(screen.getByText('Cette édition a déjà été envoyée.')).toBeInTheDocument();
  });

  it('keeps a single form open at a time', async () => {
    const user = userEvent.setup();
    renderSendPanel();
    await user.click(screen.getByRole('button', { name: "M'envoyer un test" }));
    await user.click(screen.getByRole('button', { name: 'Programmer' }));

    expect(screen.getByTestId('newsletter-schedule-form')).toBeInTheDocument();
    expect(screen.queryByTestId('newsletter-test-form')).toBeNull();

    // Clicking the open action again folds it away.
    await user.click(screen.getByRole('button', { name: 'Programmer' }));
    expect(screen.queryByTestId('newsletter-schedule-form')).toBeNull();
  });

  it('recalls a booking (Paris time) and lets it be undone', async () => {
    const user = userEvent.setup();
    const scheduledAt = '2026-07-03 07:00:00'; // UTC — 09:00 Paris in July.
    const props = renderSendPanel({ schedule: { scheduledAt } });
    expect(
      screen.getByText(new RegExp(`Programmée pour le ${instantLabel(scheduledAt)}`)),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(props.onCancelSchedule).toHaveBeenCalledTimes(1);
  });

  it('drops the booking line once the edition has been sent', () => {
    renderSendPanel({ schedule: { scheduledAt: '2026-07-03 07:00:00' }, sent: true });
    expect(screen.queryByText(/Programmée pour le/)).toBeNull();
  });
});

describe('AN-3 SubscribersPanel', () => {
  const stats: NewsletterStats = { total: 1284, monthDelta: 38 };
  const sends: NewsletterSendRecord[] = [
    {
      id: 'bilan-de-juin',
      bilanId: '2026-06',
      title: 'Bilan de juin',
      subject: 'Clap et chapitre — Juin',
      sentAt: '2026-07-03 07:00:00',
      recipientCount: 1240,
      failureCount: 2,
    },
  ];

  it('shows the audience figures and the past sends', () => {
    render(<SubscribersPanel stats={stats} sends={sends} />);
    expect(screen.getByText('1 284')).toBeInTheDocument();
    expect(screen.getByText('+38')).toBeInTheDocument();

    const rows = within(screen.getByTestId('newsletter-sends')).getAllByRole('listitem');
    expect(rows).toHaveLength(sends.length);
    for (const send of sends) {
      expect(screen.getByText(send.title)).toBeInTheDocument();
      expect(screen.getByText(instantLabel(send.sentAt))).toBeInTheDocument();
    }
  });

  it('shows an empty-history message when nothing has been sent yet', () => {
    render(<SubscribersPanel stats={stats} sends={[]} />);
    expect(screen.getByText("Aucun envoi pour l'instant.")).toBeInTheDocument();
  });

  it('shows a losing month as a signed, terracotta delta', () => {
    render(<SubscribersPanel stats={{ total: 1240, monthDelta: -44 }} sends={[]} />);
    const delta = screen.getByText('-44');
    expect(delta).toBeInTheDocument();
    expect(delta.className).not.toBe(screen.getByText('1 240').className);
  });

  it('leaves a flat month unsigned and untinted', () => {
    render(<SubscribersPanel stats={{ total: 1240, monthDelta: 0 }} sends={[]} />);
    const delta = screen.getByText('0');
    expect(delta.className).toBe(screen.getByText('1 240').className);
  });

  it('no longer shows an open rate anywhere', () => {
    render(<SubscribersPanel stats={stats} sends={sends} />);
    expect(screen.queryByText('ouverture')).toBeNull();
    expect(screen.queryByText(/%$/)).toBeNull();
  });
});
