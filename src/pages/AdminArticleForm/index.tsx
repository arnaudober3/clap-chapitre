import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import BodyEditor from './BodyEditor';
import FormSidebar, { type MetaFields } from './FormSidebar';
import { adminArticleById } from '../../mock/adminArticles';
import type { Article, Medium } from '../../mock/types';
import styles from './AdminArticleForm.module.css';

/** Split an avis' "Genre · Durée · Année" line back into its three slots. */
function splitMeta(genreMeta?: string): MetaFields {
  const [genre = '', duration = '', year = ''] = (genreMeta ?? '').split(' · ');
  return { genre, duration, year };
}

/**
 * Admin article form (design 6c desktop → 7b mobile), used for both
 * `/admin/articles/nouveau` (empty) and `/admin/articles/:id` (prefilled).
 * Nothing is persisted in this prototype: the fields are local state and the
 * primary action simply navigates away.
 */
function ArticleForm({ article }: { article?: Article }) {
  const navigate = useNavigate();
  const editing = article !== undefined;

  const [title, setTitle] = useState(article?.title ?? '');
  const [hook, setHook] = useState(article?.hook ?? '');
  const [body, setBody] = useState(article?.body ?? '');
  const [forThoseWho, setForThoseWho] = useState(article?.forThoseWho ?? '');
  const [medium, setMedium] = useState<Medium | undefined>(article?.medium);
  const [meta, setMeta] = useState<MetaFields>(splitMeta(article?.genreMeta));

  // Mock save: no store, no persistence — publishing lands on the dashboard,
  // saving an existing avis returns to the listing.
  function submit() {
    navigate(editing ? '/admin/articles' : '/admin');
  }

  return (
    <section className={styles.page} data-testid="admin-new-article-page" data-anim="stagger">
      <div className={styles.topbar}>
        <div className={styles.breadcrumb}>
          <Link to="/admin/articles" className={styles.breadcrumbLink}>
            Articles
          </Link>
          <span aria-hidden="true">›</span>
          <span className={styles.breadcrumbCurrent}>
            {editing ? article.title : 'Nouvel article'}
          </span>
        </div>
        <div className={styles.topbarActions}>
          <span className={styles.saveState}>
            <span className={styles.saveDot} aria-hidden="true" />
            Brouillon enregistré · 11:42
          </span>
          <button type="button" className={styles.primaryButton} onClick={submit}>
            {editing ? 'Enregistrer' : 'Publier'}
          </button>
        </div>
      </div>

      <div className={styles.body} data-anim="stagger">
        <div className={styles.main} data-anim="stagger">
          <div className={`${styles.field} ${styles.fieldTitle}`}>
            <label className={styles.label} htmlFor="article-title">
              Titre
            </label>
            <input
              id="article-title"
              className={styles.titleInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titre de l’avis"
            />
          </div>

          <div className={`${styles.field} ${styles.fieldHook}`}>
            <label className={styles.label} htmlFor="article-hook">
              Accroche
            </label>
            <input
              id="article-hook"
              className={styles.hookInput}
              value={hook}
              onChange={(event) => setHook(event.target.value)}
              placeholder="La question qui ouvre l’avis…"
            />
          </div>

          <BodyEditor value={body} onChange={setBody} />

          <div className={`${styles.field} ${styles.fieldForThoseWho}`}>
            <label className={styles.label} htmlFor="article-for-those-who">
              Pour ceux qui…
            </label>
            <input
              id="article-for-those-who"
              className={styles.forThoseWhoInput}
              value={forThoseWho}
              onChange={(event) => setForThoseWho(event.target.value)}
              placeholder="Pour ceux qui aiment…"
            />
          </div>
        </div>

        <FormSidebar
          medium={medium}
          onMediumChange={setMedium}
          cover={article?.cover}
          meta={meta}
          onMetaChange={(patch) => setMeta((previous) => ({ ...previous, ...patch }))}
        />
      </div>
    </section>
  );
}

/**
 * Route entry: resolves `:id` against the catalogue. `/admin/articles/nouveau`
 * has no id and renders an empty form; an unknown id falls back to the listing.
 * The `key` remounts the form when navigating straight from one avis to another
 * so its local field state restarts from the new avis.
 */
export default function AdminArticleFormPage() {
  const { id } = useParams();
  if (!id) return <ArticleForm />;
  const article = adminArticleById(id);
  if (!article) return <Navigate to="/admin/articles" replace />;
  return <ArticleForm key={article.id} article={article} />;
}
