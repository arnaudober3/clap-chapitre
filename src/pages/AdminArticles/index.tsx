import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ArticlesToolbar from './ArticlesToolbar';
import ArticleRow from './ArticleRow';
import { Pagination } from '../../components/ui';
import { useAdminPageKicker } from '../../components/layout/adminPageMeta';
import {
  adminArticleCounts,
  filterAdminArticles,
  DEFAULT_QUERY,
  PAGE_SIZE,
  type ArticleQuery,
} from '../../mock/adminArticles';
import styles from './AdminArticles.module.css';

/**
 * Admin "Articles" listing (design 8a desktop → 8b mobile): the whole avis
 * catalogue with status/medium/search filters, sorting and pagination. All data
 * is static mock content from src/mock/adminArticles.ts — filtering happens in
 * pure selectors, this page only owns the query.
 */
export default function AdminArticlesPage() {
  const [query, setQuery] = useState<ArticleQuery>(DEFAULT_QUERY);
  const [page, setPage] = useState(1);
  const counts = adminArticleCounts();
  const subtitle = `${counts.total} avis · ${counts.drafts} brouillon${counts.drafts > 1 ? 's' : ''}`;
  // On mobile the shell's top bar carries this line instead (design 8b).
  useAdminPageKicker(subtitle);

  const matching = useMemo(() => filterAdminArticles(query), [query]);
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  // A filter change can shrink the list under the current page; clamp instead of
  // rendering an empty page.
  const currentPage = Math.min(page, pageCount);
  const rows = matching.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateQuery(patch: Partial<ArticleQuery>) {
    setQuery((previous) => ({ ...previous, ...patch }));
    setPage(1);
  }

  return (
    <section className={styles.page} data-testid="admin-articles-page">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Articles</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <Link to="/admin/articles/nouveau" className={styles.newButton}>
          <span className={styles.newButtonPlus} aria-hidden="true">
            +
          </span>
          Nouvel article
        </Link>
      </div>

      <ArticlesToolbar query={query} draftCount={counts.drafts} onChange={updateQuery} />

      {rows.length === 0 ? (
        <p className={styles.empty}>Aucun article ne correspond à cette recherche.</p>
      ) : (
        <>
          <div className={styles.tableHead} aria-hidden="true">
            <span />
            <span>Titre</span>
            <span>Médium</span>
            <span>Publié le</span>
            <span className={styles.headRight}>Vues</span>
            <span className={styles.headRight}>♥</span>
            <span className={styles.headRight}>Comm.</span>
            <span className={styles.headRight}>Statut</span>
          </div>
          <ul className={styles.rows} data-testid="admin-articles-rows">
            {rows.map((item) => (
              <ArticleRow key={item.id} item={item} />
            ))}
          </ul>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            shown={rows.length}
            total={matching.length}
            noun="article"
            onPageChange={setPage}
          />
        </>
      )}

      <Link to="/admin/articles/nouveau" className={styles.fab} aria-label="Nouvel article">
        +
      </Link>
    </section>
  );
}
