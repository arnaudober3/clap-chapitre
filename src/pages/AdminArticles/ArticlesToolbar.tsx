import { AdminSelect } from '../../components/ui';
import {
  statusFilters,
  mediumFilters,
  sortOptions,
  type ArticleQuery,
  type StatusFilter,
  type MediumFilter,
  type SortId,
} from '../../content/query';
import styles from './AdminArticles.module.css';

/**
 * Filter bar (design 8a): a status segmented control, the medium and sort
 * dropdowns, and the title search. Stateless — the page owns the query and
 * every control reports through `onChange`.
 */
export default function ArticlesToolbar({
  query,
  draftCount,
  onChange,
}: {
  query: ArticleQuery;
  /** Shown next to "Brouillons" so the editor sees the backlog at a glance. */
  draftCount: number;
  onChange: (patch: Partial<ArticleQuery>) => void;
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.segmented} role="group" aria-label="Statut">
        {statusFilters().map((filter) => {
          const active = filter.id === query.status;
          return (
            <button
              key={filter.id}
              type="button"
              className={active ? `${styles.segment} ${styles.segmentActive}` : styles.segment}
              aria-pressed={active}
              onClick={() => onChange({ status: filter.id as StatusFilter })}
            >
              {filter.label}
              {filter.id === 'draft' && draftCount > 0 && (
                <span className={styles.segmentCount}> {draftCount}</span>
              )}
            </button>
          );
        })}
      </div>

      <AdminSelect
        label="Médium"
        className={styles.toolbarSelect}
        value={query.medium}
        options={mediumFilters()}
        onChange={(id) => onChange({ medium: id as MediumFilter })}
      />

      <div className={styles.toolbarSpacer} />

      <div className={styles.search}>
        <span className={styles.searchIcon} aria-hidden="true">
          ⌕
        </span>
        <input
          type="search"
          className={styles.searchInput}
          aria-label="Rechercher un titre"
          placeholder="Rechercher un titre…"
          value={query.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />
      </div>

      <AdminSelect
        label="Tri"
        className={styles.toolbarSelect}
        value={query.sort}
        options={sortOptions()}
        onChange={(id) => onChange({ sort: id as SortId })}
      />
    </div>
  );
}
