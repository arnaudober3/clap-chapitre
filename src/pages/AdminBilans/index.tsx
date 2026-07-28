import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BilansToolbar from './BilansToolbar';
import BilanRow from './BilanRow';
import CurrentBilanCard from './CurrentBilanCard';
import { Pagination } from '../../components/ui';
import { useAdminPageKicker } from '../../components/layout/adminPageMeta';
import {
  adminBilanCounts,
  currentDraftBilan,
  filterAdminBilans,
  DEFAULT_QUERY,
  PAGE_SIZE,
  type BilanQuery,
} from '../../mock/adminBilans';
import styles from './AdminBilans.module.css';

/**
 * Admin "Bilans culturels" listing (design 9a desktop → 9b mobile). Bilans are
 * monthly, so the month in progress gets a card of its own above a listing of
 * the published months. All data is static mock content from
 * src/mock/adminBilans.ts — filtering happens in pure selectors, this page only
 * owns the query.
 */
export default function AdminBilansPage() {
  const [query, setQuery] = useState<BilanQuery>(DEFAULT_QUERY);
  const [page, setPage] = useState(1);
  const counts = adminBilanCounts();
  const draft = currentDraftBilan();
  const subtitle = `${counts.published} bilans publiés · depuis ${counts.sinceLabel}`;
  // On mobile the shell's top bar carries this line instead (design 9b), where
  // the backlog matters more than the start date.
  useAdminPageKicker(`${counts.published} publiés · ${counts.drafts} en cours`);

  const matching = useMemo(() => filterAdminBilans(query), [query]);
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  // A search can shrink the list under the current page; clamp instead of
  // rendering an empty page.
  const currentPage = Math.min(page, pageCount);
  const rows = matching.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
        <Link to="/admin/bilans/nouveau" className={styles.newButton}>
          <span className={styles.newButtonPlus} aria-hidden="true">
            +
          </span>
          Nouveau bilan
        </Link>
      </div>

      {draft && <CurrentBilanCard bilan={draft} />}

      <BilansToolbar query={query} onChange={updateQuery} />

      {rows.length === 0 ? (
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
            total={matching.length}
            noun="bilan"
            onPageChange={setPage}
          />
        </>
      )}

      <Link to="/admin/bilans/nouveau" className={styles.fab} aria-label="Nouveau bilan">
        +
      </Link>
    </section>
  );
}
