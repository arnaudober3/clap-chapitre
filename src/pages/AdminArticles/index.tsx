import { useState } from 'react';
import { Link } from 'react-router-dom';
import ArticlesToolbar from './ArticlesToolbar';
import ArticleRow from './ArticleRow';
import { Pagination } from '../../components/ui';
import { useAdminPageKicker } from '../../components/layout/adminPageMeta';
import { useAdminArticles } from '../../api/admin';
import { DEFAULT_QUERY, type ArticleQuery } from '../../content/query';
import { PageError, PageLoading } from '../../components/ui';
import styles from './AdminArticles.module.css';

/**
 * Admin "Articles" listing (design 8a desktop → 8b mobile): the whole avis
 * catalogue with status/medium/search filters, sorting and pagination.
 *
 * The filtering, sorting and paging all happen in SQL now: this page owns the
 * query object and the page number, and `/api/admin/articles` answers with the
 * rows plus two counts. They are not the same count — `total` matches the
 * filter and drives the pager, `catalogue` is the whole shelf and drives the
 * subtitle, which must not move while the editor types in the search box.
 */
export default function AdminArticlesPage() {
  const [query, setQuery] = useState<ArticleQuery>(DEFAULT_QUERY);
  const [page, setPage] = useState(1);
  const { data, status, reload } = useAdminArticles(query, page);

  const counts = data?.catalogue ?? { total: 0, drafts: 0 };
  const subtitle = `${counts.total} avis · ${counts.drafts} brouillon${counts.drafts > 1 ? 's' : ''}`;
  // On mobile the shell's top bar carries this line instead (design 8b).
  useAdminPageKicker(subtitle);

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 1;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, pageCount);

  function updateQuery(patch: Partial<ArticleQuery>) {
    setQuery((previous) => ({ ...previous, ...patch }));
    setPage(1);
  }

  return (
    <section className={styles.page} data-testid="admin-articles-page" data-anim="stagger">
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

      {status === 'loading' && <PageLoading />}
      {status === 'error' && <PageError onRetry={reload} />}

      {status === 'ready' && (rows.length === 0 ? (
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
          <ul
            className={styles.rows}
            data-testid="admin-articles-rows"
            data-anim="stagger"
          >
            {rows.map((item) => (
              <ArticleRow key={item.id} item={item} />
            ))}
          </ul>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            shown={rows.length}
            total={total}
            noun="article"
            onPageChange={setPage}
          />
        </>
      ))}

      <Link to="/admin/articles/nouveau" className={styles.fab} aria-label="Nouvel article">
        +
      </Link>
    </section>
  );
}
