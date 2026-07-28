import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SendPanel from '../pages/AdminNewsletter/SendPanel';
import SubscribersPanel from '../pages/AdminNewsletter/SubscribersPanel';
import {
  EDITOR_EMAIL,
  defaultNewsletterSource,
  editionFor,
  newsletterSources,
  proposedSlotFor,
  recentSends,
  slotLabel,
  sourceLabel,
  subscriberStats,
} from '../mock/newsletter';

const source = defaultNewsletterSource();
const slot = proposedSlotFor(source);

type SendPanelProps = Parameters<typeof SendPanel>[0];

function renderSendPanel(overrides: Partial<SendPanelProps> = {}) {
  const props: SendPanelProps = {
    subject: editionFor(source).subject,
    onSubjectChange: vi.fn(),
    sourceId: source.id,
    onSourceChange: vi.fn(),
    stats: subscriberStats(),
    slot,
    onSchedule: vi.fn(),
    onCancelSchedule: vi.fn(),
    sent: false,
    onSend: vi.fn(),
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

  it('offers every mailable month as a source', async () => {
    const user = userEvent.setup();
    const props = renderSendPanel();
    const select = within(screen.getByTestId('newsletter-source'));
    expect(select.getByRole('button')).toHaveTextContent(sourceLabel(source));

    await user.click(select.getByRole('button'));
    const listbox = within(screen.getByRole('listbox', { name: 'Source du contenu' }));
    expect(listbox.getAllByRole('option').map((option) => option.textContent)).toEqual(
      newsletterSources().map(sourceLabel),
    );

    const next = newsletterSources()[1];
    await user.click(listbox.getByRole('button', { name: sourceLabel(next) }));
    expect(props.onSourceChange).toHaveBeenCalledWith(next.id);
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

  it('reads "Envoyée" and is disabled once the edition has gone out', () => {
    renderSendPanel({ sent: true });
    const button = screen.getByRole('button', { name: 'Envoyée' });
    expect(button).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Envoyer maintenant' })).toBeNull();
    // Nothing left to test or to book once it is gone.
    expect(screen.getByRole('button', { name: 'M’envoyer un test' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Programmer' })).toBeDisabled();
  });

  it('asks for an address before sending a test, pre-filled with the editor’s', async () => {
    const user = userEvent.setup();
    renderSendPanel();
    expect(screen.queryByTestId('newsletter-test-form')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'M’envoyer un test' }));
    expect(screen.getByLabelText('Adresse de test')).toHaveValue(EDITOR_EMAIL);
  });

  it('refuses an address that is not one, and says so', async () => {
    const user = userEvent.setup();
    renderSendPanel();
    await user.click(screen.getByRole('button', { name: 'M’envoyer un test' }));

    const field = screen.getByLabelText('Adresse de test');
    await user.clear(field);
    await user.type(field, 'marie-zoe');
    await user.click(screen.getByRole('button', { name: 'Envoyer le test' }));

    expect(screen.getByRole('alert')).toHaveTextContent('ne ressemble pas à un e-mail');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    // The form stays open on the bad value rather than swallowing it.
    expect(screen.getByTestId('newsletter-test-form')).toBeInTheDocument();
    expect(screen.queryByText(/Test envoyé/)).toBeNull();
  });

  it('acknowledges the test and closes the form on a valid address', async () => {
    const user = userEvent.setup();
    renderSendPanel();
    await user.click(screen.getByRole('button', { name: 'M’envoyer un test' }));

    const field = screen.getByLabelText('Adresse de test');
    await user.clear(field);
    await user.type(field, 'relecture@exemple.fr');
    await user.click(screen.getByRole('button', { name: 'Envoyer le test' }));

    expect(screen.getByText('Test envoyé à relecture@exemple.fr.')).toBeInTheDocument();
    expect(screen.queryByTestId('newsletter-test-form')).toBeNull();
  });

  it('proposes a slot and spells the booking out before confirming it', async () => {
    const user = userEvent.setup();
    const props = renderSendPanel();
    await user.click(screen.getByRole('button', { name: 'Programmer' }));

    expect(screen.getByLabelText('Date')).toHaveValue(slot.date);
    expect(screen.getByLabelText('Heure')).toHaveValue(slot.time);
    expect(
      screen.getByText(`L’envoi partira le ${slotLabel(slot)} aux 1 284 abonnés.`),
    ).toBeInTheDocument();
    expect(props.onSchedule).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(props.onSchedule).toHaveBeenCalledWith(slot);
    expect(screen.queryByTestId('newsletter-schedule-form')).toBeNull();
  });

  it('books the slot the editor actually picked', async () => {
    const user = userEvent.setup();
    const props = renderSendPanel();
    await user.click(screen.getByRole('button', { name: 'Programmer' }));

    await user.clear(screen.getByLabelText('Heure'));
    await user.type(screen.getByLabelText('Heure'), '18:30');
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(props.onSchedule).toHaveBeenCalledWith({ date: slot.date, time: '18:30' });
  });

  it('keeps a single form open at a time', async () => {
    const user = userEvent.setup();
    renderSendPanel();
    await user.click(screen.getByRole('button', { name: 'M’envoyer un test' }));
    await user.click(screen.getByRole('button', { name: 'Programmer' }));

    expect(screen.getByTestId('newsletter-schedule-form')).toBeInTheDocument();
    expect(screen.queryByTestId('newsletter-test-form')).toBeNull();

    // Clicking the open action again folds it away.
    await user.click(screen.getByRole('button', { name: 'Programmer' }));
    expect(screen.queryByTestId('newsletter-schedule-form')).toBeNull();
  });

  it('recalls a booking and lets it be undone', async () => {
    const user = userEvent.setup();
    const props = renderSendPanel({ schedule: slot });
    expect(screen.getByText(new RegExp(`Programmée pour le ${slotLabel(slot)}`))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(props.onCancelSchedule).toHaveBeenCalledTimes(1);
  });

  it('drops the booking line once the edition has been sent', () => {
    renderSendPanel({ schedule: slot, sent: true });
    expect(screen.queryByText(/Programmée pour le/)).toBeNull();
  });

  it('shows the audience figures and the past sends', () => {
    const stats = subscriberStats();
    render(<SubscribersPanel stats={stats} sends={recentSends()} />);
    expect(screen.getByText('1 284')).toBeInTheDocument();
    expect(screen.getByText(`+${stats.monthDelta}`)).toBeInTheDocument();
    expect(screen.getByText(`${stats.openRatePct}%`)).toBeInTheDocument();

    const rows = within(screen.getByTestId('newsletter-sends')).getAllByRole('listitem');
    expect(rows).toHaveLength(recentSends().length);
    for (const send of recentSends()) {
      expect(screen.getByText(send.title)).toBeInTheDocument();
      expect(
        screen.getByText(`${send.dateLabel} · ${send.openRatePct}%`),
      ).toBeInTheDocument();
    }
  });

  it('drops the open rate on an edition that just went out', () => {
    render(
      <SubscribersPanel
        stats={subscriberStats()}
        sends={[{ id: 'x', title: 'Bilan de juin', dateLabel: 'à l’instant' }]}
      />,
    );
    expect(screen.getByText('à l’instant')).toBeInTheDocument();
  });

  it('shows a losing month as a signed, terracotta delta', () => {
    render(
      <SubscribersPanel stats={{ total: 1240, monthDelta: -44, openRatePct: 52 }} sends={[]} />,
    );
    const delta = screen.getByText('-44');
    expect(delta).toBeInTheDocument();
    expect(delta.className).not.toBe(screen.getByText('1 240').className);
  });

  it('leaves a flat month unsigned and untinted', () => {
    render(
      <SubscribersPanel stats={{ total: 1240, monthDelta: 0, openRatePct: 52 }} sends={[]} />,
    );
    const delta = screen.getByText('0');
    expect(delta.className).toBe(screen.getByText('1 240').className);
  });
});
