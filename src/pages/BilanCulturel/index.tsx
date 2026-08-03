import { useSearchParams } from 'react-router-dom';
import { useBilanList, useBilanView } from '../../api/content';
import { PageError, PageLoading } from '../../components/ui';
import MonthSwitcher from './MonthSwitcher';
import MediumSections from './MediumSections';
import CommentThread from './CommentThread';
import styles from './BilanCulturel.module.css';

/**
 * Salon Bilan culturel page. Reads the `mois` query param and asks
 * `/api/bilans/:id` for that month — or for `latest` when the URL names none,
 * which is how the page opens from the nav.
 *
 * An unknown month is a 404 from the endpoint, and it falls back to the newest
 * one rather than showing a dead end: `?mois=` comes from a link that may have
 * aged, and the reader asked for "the bilan", not for that exact month. The
 * empty database, on the other hand, keeps its own empty state — there is
 * nothing to fall back to.
 *
 * The month switcher needs every month, which is a second request; it is the
 * only page that needs both, and the list is small and shared with the archive.
 */
export default function BilanCulturelPage() {
  const [searchParams] = useSearchParams();
  const mois = searchParams.get('mois');

  const months = useBilanList();
  const requested = useBilanView(mois ?? 'latest');
  // Armed but idle unless the requested month came back 404, at which point it
  // fires for the newest one. A second request only ever happens on a stale link.
  const fallback = useBilanView(requested.notFound ? 'latest' : null);
  const active = requested.notFound ? fallback : requested;

  if (active.status === 'loading' || active.status === 'idle') {
    return (
      <section className={styles.page} data-testid="bilan-culturel-page" data-anim="stagger">
        <PageLoading />
      </section>
    );
  }

  if (!active.data) {
    return (
      <section className={styles.page} data-testid="bilan-culturel-page" data-anim="stagger">
        <p className={styles.eyebrow}>Bilan culturel</p>
        {active.status === 'error' && !active.notFound ? (
          <PageError onRetry={active.reload} />
        ) : (
          <p className={styles.empty}>Aucun bilan pour l’instant.</p>
        )}
      </section>
    );
  }

  const { bilan, comments } = active.data;

  return (
    <section className={styles.page} data-testid="bilan-culturel-page" data-anim="stagger">
      <MonthSwitcher active={bilan} months={months.data ?? [bilan]} />
      <MediumSections bilan={bilan} />
      <CommentThread bilan={bilan} comments={comments} />
    </section>
  );
}
