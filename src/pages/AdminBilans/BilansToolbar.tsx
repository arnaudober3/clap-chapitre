import { AdminSelect } from '../../components/ui';
import {
  bilanSortOptions,
  type BilanQuery,
  type BilanSortId,
} from '../../content/query';
import styles from './AdminBilans.module.css';

/**
 * Filter bar for the bilan listing: a title search and the sort dropdown.
 * Design 9a groups the months by year instead of filtering; this prototype
 * paginates a flat list, so the search and the sort take over that job.
 * Stateless — the page owns the query, every control reports through `onChange`.
 */
export default function BilansToolbar({
  query,
  onChange,
}: {
  query: BilanQuery;
  onChange: (patch: Partial<BilanQuery>) => void;
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.search}>
        <span className={styles.searchIcon} aria-hidden="true">
          ⌕
        </span>
        <input
          type="search"
          className={styles.searchInput}
          aria-label="Rechercher un bilan"
          placeholder="Rechercher un bilan…"
          value={query.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />
      </div>

      <AdminSelect
        label="Tri"
        className={styles.toolbarSelect}
        value={query.sort}
        options={bilanSortOptions()}
        onChange={(id) => onChange({ sort: id as BilanSortId })}
      />
    </div>
  );
}
