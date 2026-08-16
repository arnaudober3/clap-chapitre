import { useEffect, useMemo, useState } from 'react';
import EmailPreview from './EmailPreview';
import SendPanel from './SendPanel';
import SubscribersPanel from './SubscribersPanel';
import { PageError, PageLoading } from '../../components/ui';
import { useAdminPageKicker } from '../../components/layout/adminPageMeta';
import { useAdminBilan, useAdminBilans, useAdminNewsletter } from '../../api/admin';
import {
  cancelNewsletterSchedule,
  scheduleNewsletter,
  sendNewsletter,
  sendNewsletterTest,
} from '../../api/mutations';
import { useMutation } from '../../api/useMutation';
import { DEFAULT_BILAN_QUERY } from '../../content/query';
import { editionFor, editionLabel, instantLabel, proposedSlotFor, sourceLabel } from '../../newsletter';
import styles from './AdminNewsletter.module.css';

/**
 * Admin newsletter. "Le courrier du mois" is never written here: it is
 * generated from a bilan culturel, so the page pairs a preview of the e-mail
 * with the send panel. Picking another source regenerates the whole e-mail —
 * month, headline, humeur, coups de cœur and subject line.
 *
 * The wrapper (`data-testid="admin-newsletter-page"`) always renders, header
 * included, whatever the loading state — the same shape `AdminArticlesPage`
 * uses, and for the same reason: a route guard or a screen reader should not
 * have to wait on a network round trip to know which page it landed on.
 * `PageLoading`/`PageError` sit in the body instead of replacing the page.
 *
 * `sent`/`schedule` come from `useAdminNewsletter()`, the durable server
 * state — reloaded after every send/schedule/cancel — rather than local
 * component state, so the page reflects reality even after a refresh.
 */
export default function AdminNewsletterPage() {
  const bilans = useAdminBilans(DEFAULT_BILAN_QUERY, 1);
  const newsletter = useAdminNewsletter();

  const [sourceId, setSourceId] = useState<string>();
  // Subjects customized away from the edition's own default, kept per source
  // so switching away and back does not lose an edit in progress.
  const [subjects, setSubjects] = useState<Record<string, string>>({});

  // Seeds the picker on the newest published bilan once the list arrives.
  useEffect(() => {
    if (sourceId === undefined && bilans.data?.items.length) {
      setSourceId(bilans.data.items[0].id);
    }
  }, [bilans.data, sourceId]);

  const bilan = useAdminBilan(sourceId);
  const edition = useMemo(() => (bilan.data ? editionFor(bilan.data) : undefined), [bilan.data]);
  const subject = sourceId ? (subjects[sourceId] ?? edition?.subject ?? '') : '';

  useAdminPageKicker(bilan.data ? `Édition ${editionLabel(bilan.data)}` : 'Newsletter');

  const sendMutation = useMutation(sendNewsletter);
  const testMutation = useMutation(sendNewsletterTest);
  const scheduleMutation = useMutation(scheduleNewsletter);
  const cancelMutation = useMutation(cancelNewsletterSchedule);

  function setSubject(next: string) {
    if (!sourceId) return;
    setSubjects((previous) => ({ ...previous, [sourceId]: next }));
  }

  async function send() {
    if (!sourceId) return;
    const result = await sendMutation.run(sourceId, subject);
    if (result) newsletter.reload();
  }

  async function sendTest(email: string) {
    if (!sourceId) return;
    await testMutation.run(sourceId, subject, email);
  }

  async function schedule(date: string, time: string) {
    if (!sourceId) return;
    const result = await scheduleMutation.run(sourceId, subject, date, time);
    if (result) newsletter.reload();
  }

  async function cancelSchedule() {
    if (!sourceId) return;
    await cancelMutation.run(sourceId);
    newsletter.reload();
  }

  const sent = newsletter.data?.sends.some((entry) => entry.bilanId === sourceId) ?? false;
  const booked = newsletter.data?.scheduled.find((entry) => entry.bilanId === sourceId);
  const stats = newsletter.data?.stats ?? { total: 0, monthDelta: 0 };
  const sends = newsletter.data?.sends ?? [];

  function body() {
    if (bilans.status === 'loading' || bilans.status === 'idle') return <PageLoading />;
    if (bilans.status === 'error') return <PageError onRetry={bilans.reload} />;

    if (!bilans.data?.items.length) {
      return <p className={styles.subtitle}>Aucun bilan publié pour l'instant — publiez-en un pour composer une édition.</p>;
    }

    if (!sourceId || bilan.status === 'loading' || bilan.status === 'idle' || !edition) {
      return <PageLoading />;
    }
    if (bilan.status === 'error') return <PageError onRetry={bilan.reload} />;

    return (
      <div className={styles.body} data-anim="stagger">
        <EmailPreview edition={edition} />

        <div className={styles.panels} data-anim="stagger">
          <SendPanel
            subject={subject}
            onSubjectChange={setSubject}
            sourceId={sourceId}
            onSourceChange={setSourceId}
            sources={bilans.data.items.map((item) => ({ id: item.id, label: sourceLabel(item) }))}
            recipientCount={stats.total}
            slot={bilan.data ? proposedSlotFor(bilan.data) : { date: '', time: '' }}
            schedule={booked}
            onSchedule={schedule}
            schedulePending={scheduleMutation.pending}
            scheduleError={scheduleMutation.error?.message}
            onCancelSchedule={cancelSchedule}
            sent={sent}
            onSend={send}
            sendPending={sendMutation.pending}
            sendError={sendMutation.error?.message}
            onSendTest={sendTest}
            testPending={testMutation.pending}
            testError={testMutation.error?.message}
          />
          <SubscribersPanel stats={stats} sends={sends} />
        </div>
      </div>
    );
  }

  return (
    <section className={styles.page} data-testid="admin-newsletter-page" data-anim="stagger">
      <div className={styles.header}>
        <div className={styles.headerTitles}>
          <h1 className={styles.title}>Newsletter</h1>
          <p className={styles.subtitle}>
            {bilan.data ? `Le courrier du mois — édition ${editionLabel(bilan.data)}` : ''}
          </p>
        </div>
        {sourceId && (
          <span
            className={sent ? `${styles.status} ${styles.statusSent}` : styles.status}
            data-testid="newsletter-status"
          >
            <span className={styles.statusDot} aria-hidden="true" />
            {sent ? (
              <>Envoyée</>
            ) : booked ? (
              <>
                Programmée<span className={styles.statusLong}> · {instantLabel(booked.scheduledAt)}</span>
              </>
            ) : (
              <>
                Prête<span className={styles.statusLong}> à envoyer</span>
              </>
            )}
          </span>
        )}
      </div>

      {body()}
    </section>
  );
}
