import { useState } from 'react';
import { AdminSelect } from '../../components/ui';
import { frNumber } from '../../format';
import {
  EDITOR_EMAIL,
  isPlausibleEmail,
  newsletterSources,
  slotLabel,
  sourceLabel,
  type ScheduleSlot,
  type SubscriberStats,
} from '../../mock/newsletter';
import styles from './AdminNewsletter.module.css';

/** Which secondary action has its form open, if any. */
type OpenForm = 'test' | 'schedule';

/**
 * The "Cet envoi" card (design 6e): the subject line, the bilan the edition is
 * generated from, who it goes to, and the send actions. The design's "Modèle"
 * row is dropped — there is only ever one template ("Résumé de bilan"), so the
 * row states a constant rather than a choice.
 *
 * The two secondary actions ask for what they need before doing anything: a
 * test needs an address, a schedule needs a date and a time. Both open an
 * inline form rather than a popover — the sidebar is 320px wide and a floating
 * panel would sit over the preview it is about. Only one is open at a time.
 *
 * Nothing is persisted. The subject and the schedule are the page's state; the
 * test acknowledgment is this panel's alone, because it changes nothing beyond
 * saying the proof went out.
 */
export default function SendPanel({
  subject,
  onSubjectChange,
  sourceId,
  onSourceChange,
  stats,
  slot,
  schedule,
  onSchedule,
  onCancelSchedule,
  sent,
  onSend,
}: {
  subject: string;
  onSubjectChange: (subject: string) => void;
  sourceId: string;
  onSourceChange: (id: string) => void;
  stats: SubscriberStats;
  /** The slot the schedule form opens on. */
  slot: ScheduleSlot;
  /** The slot this edition is booked for, if it has been scheduled. */
  schedule?: ScheduleSlot;
  onSchedule: (slot: ScheduleSlot) => void;
  onCancelSchedule: () => void;
  sent: boolean;
  onSend: () => void;
}) {
  const [openForm, setOpenForm] = useState<OpenForm>();
  const [testEmail, setTestEmail] = useState(EDITOR_EMAIL);
  const [testError, setTestError] = useState<string>();
  const [testSentTo, setTestSentTo] = useState<string>();
  const [date, setDate] = useState(slot.date);
  const [time, setTime] = useState(slot.time);

  const options = newsletterSources().map((bilan) => ({
    id: bilan.id,
    label: sourceLabel(bilan),
  }));

  /** Toggling one action closes the other, and clears the last acknowledgment. */
  function toggle(form: OpenForm) {
    setOpenForm((previous) => (previous === form ? undefined : form));
    setTestError(undefined);
    setTestSentTo(undefined);
  }

  function submitTest() {
    const address = testEmail.trim();
    if (!isPlausibleEmail(address)) {
      setTestError('Cette adresse ne ressemble pas à un e-mail.');
      return;
    }
    setTestError(undefined);
    setTestSentTo(address);
    setOpenForm(undefined);
  }

  function submitSchedule() {
    onSchedule({ date, time });
    setOpenForm(undefined);
  }

  return (
    <section
      className={styles.card}
      data-testid="newsletter-send-panel"
      data-anim="stagger"
    >
      <p className={styles.cardLabel}>Cet envoi</p>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="newsletter-subject">
          Objet
        </label>
        <input
          id="newsletter-subject"
          className={styles.input}
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Source du contenu</span>
        <AdminSelect
          label="Source du contenu"
          value={sourceId}
          options={options}
          onChange={onSourceChange}
          className={styles.sourceSelect}
          data-testid="newsletter-source"
        />
      </div>

      <div className={`${styles.row} ${styles.rowDivided}`}>
        <span>Destinataires</span>
        <span className={styles.rowValueStrong}>{frNumber(stats.total)} abonnés</span>
      </div>

      <button type="button" className={styles.sendButton} onClick={onSend} disabled={sent}>
        {sent ? 'Envoyée' : 'Envoyer maintenant'}
      </button>

      <div className={styles.secondaryActions}>
        <button
          type="button"
          className={
            openForm === 'test'
              ? `${styles.secondaryButton} ${styles.secondaryButtonOpen}`
              : styles.secondaryButton
          }
          aria-expanded={openForm === 'test'}
          onClick={() => toggle('test')}
          disabled={sent}
        >
          M’envoyer un test
        </button>
        <button
          type="button"
          className={
            openForm === 'schedule'
              ? `${styles.secondaryButton} ${styles.secondaryButtonOpen}`
              : styles.secondaryButton
          }
          aria-expanded={openForm === 'schedule'}
          onClick={() => toggle('schedule')}
          disabled={sent}
        >
          Programmer
        </button>
      </div>

      {openForm === 'test' && (
        <div className={styles.actionForm} data-testid="newsletter-test-form">
          <label className={styles.fieldLabel} htmlFor="newsletter-test-email">
            Adresse de test
          </label>
          <input
            id="newsletter-test-email"
            type="email"
            className={styles.input}
            value={testEmail}
            onChange={(event) => {
              setTestEmail(event.target.value);
              setTestError(undefined);
            }}
            aria-invalid={testError !== undefined}
            aria-describedby={testError ? 'newsletter-test-error' : undefined}
          />
          {testError && (
            <p id="newsletter-test-error" className={styles.actionError} role="alert">
              {testError}
            </p>
          )}
          <div className={styles.actionFormActions}>
            <button type="button" className={styles.actionConfirm} onClick={submitTest}>
              Envoyer le test
            </button>
            <button
              type="button"
              className={styles.actionCancel}
              onClick={() => toggle('test')}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {openForm === 'schedule' && (
        <div className={styles.actionForm} data-testid="newsletter-schedule-form">
          <div className={styles.slotFields}>
            <div>
              <label className={styles.fieldLabel} htmlFor="newsletter-schedule-date">
                Date
              </label>
              <input
                id="newsletter-schedule-date"
                type="date"
                className={styles.input}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div>
              <label className={styles.fieldLabel} htmlFor="newsletter-schedule-time">
                Heure
              </label>
              <input
                id="newsletter-schedule-time"
                type="time"
                className={styles.input}
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>
          {/* The confirmation the editor reads before committing — the slot in
              full French, not the two raw fields above. */}
          <p className={styles.actionConfirmCopy}>
            L’envoi partira le {slotLabel({ date, time })} aux{' '}
            {frNumber(stats.total)} abonnés.
          </p>
          <div className={styles.actionFormActions}>
            <button type="button" className={styles.actionConfirm} onClick={submitSchedule}>
              Confirmer
            </button>
            <button
              type="button"
              className={styles.actionCancel}
              onClick={() => toggle('schedule')}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {testSentTo && (
        <p className={styles.actionNote} role="status">
          Test envoyé à {testSentTo}.
        </p>
      )}

      {schedule && !sent && (
        <p className={styles.actionNote} role="status">
          Programmée pour le {slotLabel(schedule)}.{' '}
          <button type="button" className={styles.actionUndo} onClick={onCancelSchedule}>
            Annuler
          </button>
        </p>
      )}
    </section>
  );
}
