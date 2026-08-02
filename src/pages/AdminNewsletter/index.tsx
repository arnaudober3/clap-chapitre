import { useMemo, useState } from 'react';
import EmailPreview from './EmailPreview';
import SendPanel from './SendPanel';
import SubscribersPanel from './SubscribersPanel';
import { useAdminPageKicker } from '../../components/layout/adminPageMeta';
import { ofMonth } from '../../format';
import {
  defaultNewsletterSource,
  editionFor,
  editionLabel,
  newsletterSourceById,
  proposedSlotFor,
  recentSends,
  slotLabel,
  subscriberStats,
  type ScheduleSlot,
  type SendRecord,
} from '../../mock/newsletter';
import styles from './AdminNewsletter.module.css';

/**
 * Admin newsletter (design 6e desktop → 7d mobile). "Le courrier du mois" is
 * never written here: it is generated from a bilan culturel, so the page pairs
 * a preview of the e-mail with the send panel. Picking another source
 * regenerates the whole e-mail — month, headline, humeur, coups de cœur and
 * subject line.
 *
 * Nothing is persisted (DEV-29 reads the data, it never writes it): the subject
 * is local state, and "Envoyer maintenant" only records the send in this
 * component so the page can acknowledge it.
 */
export default function AdminNewsletterPage() {
  const [sourceId, setSourceId] = useState(defaultNewsletterSource().id);
  const [subject, setSubject] = useState(() => editionFor(defaultNewsletterSource()).subject);
  // Editions mailed during this session, newest-first. Purely local.
  const [log, setLog] = useState<SendRecord[]>([]);
  // Booked slots per edition — an edition can be scheduled while another is
  // being written, so this is keyed by month rather than a single slot.
  const [schedules, setSchedules] = useState<Record<string, ScheduleSlot>>({});

  const source = newsletterSourceById(sourceId);
  const edition = useMemo(() => editionFor(source), [source]);
  const sent = log.some((entry) => entry.id === sourceId);
  const schedule = schedules[sourceId];
  const stats = subscriberStats();

  // On mobile the shell's top bar is the page header (design 7d), where the
  // edition's month is the line that matters.
  useAdminPageKicker(`Édition ${editionLabel(source)}`);

  // A send this session takes the place of that month's archived send, so an
  // edition never shows up twice in the list.
  const sends = [...log, ...recentSends().filter((entry) => !log.some((l) => l.id === entry.id))];

  function changeSource(id: string) {
    setSourceId(id);
    // The subject is derived from the bilan, so it follows the source rather
    // than keeping the previous month's headline.
    setSubject(editionFor(newsletterSourceById(id)).subject);
  }

  function send() {
    setLog((previous) => [
      {
        id: source.id,
        title: `Bilan ${ofMonth(source.monthLabel)}`,
        dateLabel: 'à l’instant',
      },
      ...previous.filter((entry) => entry.id !== source.id),
    ]);
    // Sending early makes the booking moot.
    cancelSchedule();
  }

  function bookSchedule(slot: ScheduleSlot) {
    setSchedules((previous) => ({ ...previous, [source.id]: slot }));
  }

  function cancelSchedule() {
    setSchedules((previous) =>
      Object.fromEntries(Object.entries(previous).filter(([id]) => id !== source.id)),
    );
  }

  return (
    <section className={styles.page} data-testid="admin-newsletter-page" data-anim="stagger">
      <div className={styles.header}>
        <div className={styles.headerTitles}>
          <h1 className={styles.title}>Newsletter</h1>
          <p className={styles.subtitle}>
            Le courrier du mois — édition {editionLabel(source)}
          </p>
        </div>
        <span
          className={sent ? `${styles.status} ${styles.statusSent}` : styles.status}
          data-testid="newsletter-status"
        >
          <span className={styles.statusDot} aria-hidden="true" />
          {/* Sent wins over booked: an edition mailed early is simply gone. */}
          {sent ? (
            <>
              Envoyée<span className={styles.statusLong}> · à l’instant</span>
            </>
          ) : schedule ? (
            <>
              Programmée<span className={styles.statusLong}> · {slotLabel(schedule)}</span>
            </>
          ) : (
            <>
              Prête<span className={styles.statusLong}> à envoyer</span>
            </>
          )}
        </span>
      </div>

      <div className={styles.body} data-anim="stagger">
        {/* The preview names its own source in its caption bar. */}
        <EmailPreview edition={edition} />

        <div className={styles.panels} data-anim="stagger">
          {/* Keyed on the source so the secondary forms close and re-propose
              the new month's slot when the edition changes. */}
          <SendPanel
            key={sourceId}
            subject={subject}
            onSubjectChange={setSubject}
            sourceId={sourceId}
            onSourceChange={changeSource}
            stats={stats}
            slot={proposedSlotFor(source)}
            schedule={schedule}
            onSchedule={bookSchedule}
            onCancelSchedule={cancelSchedule}
            sent={sent}
            onSend={send}
          />
          <SubscribersPanel stats={stats} sends={sends} />
        </div>
      </div>
    </section>
  );
}
