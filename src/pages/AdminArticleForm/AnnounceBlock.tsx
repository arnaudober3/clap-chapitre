import { useState } from 'react';
import { ApiError } from '../../api/client';
import { sendAnnouncementTest } from '../../api/mutations';
import { instantLabel } from '../../newsletter';
import styles from './AdminArticleForm.module.css';

/**
 * The sidebar's "Annonce" block: whether this avis will be mailed to the
 * subscribers, and a proof copy to a private address.
 *
 * The checkbox only states an intent — nothing is sent from here. The form
 * fires the announcement after a save leaves the avis published, so the
 * editor can publish first and announce later (tick, then Enregistrer).
 * Once the avis has been announced, the block only says when: there is no
 * second announcement.
 */
export default function AnnounceBlock({
  articleId,
  published,
  announcedAt,
  notify,
  onNotifyChange,
  outcome,
  testSends = false,
}: {
  /** Undefined while the avis has never been saved — no proof can be built yet. */
  articleId?: string;
  published: boolean;
  /** The UTC instant of the announcement, or undefined if it never went out. */
  announcedAt?: string;
  notify: boolean;
  onNotifyChange: (notify: boolean) => void;
  /** What the last announcement attempt said — a count or an error. */
  outcome?: string;
  /** Whether the proof-copy field shows — off in production. */
  testSends?: boolean;
}) {
  const [testAddress, setTestAddress] = useState('');
  const [testState, setTestState] = useState<string>();
  const [testPending, setTestPending] = useState(false);

  async function sendTest() {
    if (!articleId || !testAddress.trim()) return;
    setTestPending(true);
    setTestState(undefined);
    try {
      await sendAnnouncementTest(articleId, testAddress.trim());
      setTestState('Test envoyé.');
    } catch (error) {
      setTestState(
        error instanceof ApiError && error.status === 422
          ? 'Adresse invalide.'
          : 'L’envoi du test a échoué.',
      );
    } finally {
      setTestPending(false);
    }
  }

  return (
    <div className={styles.sideBlock} data-testid="article-announce">
      <div className={styles.sideTitle}>Annonce</div>

      {announcedAt ? (
        <p className={styles.announceNote}>
          Abonné·es prévenu·es le {instantLabel(announcedAt)}.
        </p>
      ) : (
        <>
          <label className={styles.announceCheck}>
            <input
              type="checkbox"
              checked={notify}
              onChange={(event) => onNotifyChange(event.target.checked)}
            />
            <span>Prévenir les abonné·es</span>
          </label>
          {notify && (
            <p className={styles.announceNote}>
              {published
                ? 'L’e-mail partira à l’enregistrement.'
                : 'L’e-mail partira à la publication.'}
            </p>
          )}
        </>
      )}

      {outcome && (
        <p className={styles.announceNote} role="status">
          {outcome}
        </p>
      )}

      {testSends && articleId && (
        <div className={styles.announceTest}>
          <input
            type="email"
            className={`${styles.metaRow} ${styles.metaInput}`}
            value={testAddress}
            onChange={(event) => setTestAddress(event.target.value)}
            placeholder="Adresse de test"
            aria-label="Adresse de test"
          />
          <button
            type="button"
            className={styles.chip}
            disabled={testPending || !testAddress.trim()}
            onClick={() => void sendTest()}
          >
            Envoyer un test
          </button>
          {testState && (
            <p className={styles.announceNote} role="status">
              {testState}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
