import { useState } from 'react';
import { Link } from 'react-router-dom';
import BilansToolbar from './BilansToolbar';
import BilanRow from './BilanRow';
import CurrentBilanCard from './CurrentBilanCard';
import { Pagination } from '../../components/ui';
import { useAdminPageKicker } from '../../components/layout/adminPageMeta';
import { useAdminBilans } from '../../api/admin';
import { DEFAULT_BILAN_QUERY, type BilanQuery } from '../../content/query';
import { PageError, PageLoading } from '../../components/ui';
import { monthName } from '../../format';
import type { PublishedBilan } from '../../../shared/content';
import styles from './AdminBilans.module.css';

/**
 * Admin "Bilans culturels" listing (design 9a desktop → 9b mobile). Bilans are
 * monthly, so the month in progress gets a card of its own above a listing of
 * the published months — it is the thing the editor comes back to, and a card
 * tells it apart at a glance where a table row would not.
 *
 * The search, the sort and the paging happen in SQL. The month in progress
 * comes back beside the rows rather than among them, so a search never hides
 * it — it is not one result among fourteen, it is the thing being written.
 */
export default function AdminBilansPage() {
  const [query, setQuery] = useState<BilanQuery>(DEFAULT_BILAN_QUERY);
  const [page, setPage] = useState(1);
  const { data, status, reload } = useAdminBilans(query, page);

  const counts = data?.catalogue ?? { published: 0, drafts: 0, since: undefined };
  const draft = data?.draft;
  // A bilan covers a month, and a month is only written once: while one is in
  // progress there is nothing to start, so the page offers no way to — the card
  // above the listing already leads back to it.
  const canCreate = draft === undefined;
  // "depuis mai 2025" — the endpoint sends figures, the French is built here.
  const since = counts.since
    ? `${monthName(counts.since.month).toLowerCase()} ${counts.since.year}`
    : '—';
  const subtitle = `${counts.published} bilans publiés · depuis ${since}`;
  // On mobile the shell's top bar carries this line instead (design 9b), where
  // the backlog matters more than the start date.
  useAdminPageKicker(`${counts.published} publiés · ${counts.drafts} en cours`);

  // The listing only ever holds published months; the endpoint filters on it.
  const rows = (data?.items ?? []) as PublishedBilan[];
  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 1;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, pageCount);

  function updateQuery(patch: Partial<BilanQuery>) {
    setQuery((previous) => ({ ...previous, ...patch }));
    setPage(1);
  }

  return (
    <section className={styles.page} data-testid="admin-bilans-page">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Bilans culturels</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        {canCreate && (
          <Link to="/admin/bilans/nouveau" className={styles.newButton}>
            <span className={styles.newButtonPlus} aria-hidden="true">
              +
            </span>
            Nouveau bilan
          </Link>
        )}
      </div>

      {draft && <CurrentBilanCard bilan={draft} />}

      <BilansToolbar query={query} onChange={updateQuery} />

      {status === 'loading' && <PageLoading />}
      {status === 'error' && <PageError onRetry={reload} />}

      {status === 'ready' && (rows.length === 0 ? (
        <p className={styles.empty}>Aucun bilan ne correspond à cette recherche.</p>
      ) : (
        <>
          <div className={styles.tableHead} aria-hidden="true">
            <span>Mois</span>
            <span>Œuvres</span>
            <span>Publié le</span>
            <span className={styles.headRight}>Vues</span>
            <span className={styles.headRight}>♥</span>
            <span className={styles.headRight}>Statut</span>
          </div>
          <ul className={styles.rows} data-testid="admin-bilans-rows">
            {rows.map((bilan) => (
              <BilanRow key={bilan.id} bilan={bilan} />
            ))}
          </ul>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            shown={rows.length}
            total={total}
            noun="bilan"
            onPageChange={setPage}
          />
        </>
      ))}

      {canCreate && (
        <Link to="/admin/bilans/nouveau" className={styles.fab} aria-label="Nouveau bilan">
          +
        </Link>
      )}
    </section>
  );
}
