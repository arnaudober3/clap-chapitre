import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import BodyEditor from './BodyEditor';
import FormSidebar, { type MetaFields } from './FormSidebar';
import { useAdminArticle } from '../../api/admin';
import { useMutation } from '../../api/useMutation';
import { deleteArticle, saveArticle, type ArticlePayload } from '../../api/mutations';
import { EditorActions, PageError, PageLoading } from '../../components/ui';
import type { Article, Medium } from '../../../shared/content';
import styles from './AdminArticleForm.module.css';

/** Split an avis' "Genre · Durée · Année" line back into its three slots. */
function splitMeta(genreMeta?: string): MetaFields {
  const [genre = '', duration = '', year = ''] = (genreMeta ?? '').split(' · ');
  return { genre, duration, year };
}

/**
 * The inverse of `splitMeta`. Trailing empties are dropped, so an avis with only
 * a genre stores "Comédie" rather than "Comédie ·  · ".
 */
function joinMeta(meta: MetaFields): string {
  return [meta.genre, meta.duration, meta.year]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' · ');
}

/**
 * Admin article form (design 6c desktop → 7b mobile), used for both
 * `/admin/articles/nouveau` (empty) and `/admin/articles/:id` (prefilled).
 *
 * The fields are local state seeded from the loaded avis, and saving sends the
 * whole form: the API replaces an avis rather than patching it, which is what
 * makes clearing a field possible at all.
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
  const [cover, setCover] = useState(article?.cover ?? '');
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');
  const [saved, setSaved] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(article?.status);
  const [invalid, setInvalid] = useState<string>();

  const save = useMutation(saveArticle);
  const remove = useMutation(deleteArticle);

  /** Any edit invalidates the "Enregistré" line — it describes the last save. */
  function touched<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setSaved(false);
      setInvalid(undefined);
    };
  }

  function payload(status: 'draft' | 'published'): ArticlePayload | undefined {
    // Three columns are NOT NULL with no sensible default. Caught here so the
    // editor reads "il manque le titre" instead of a 422 naming a wire field.
    if (!title.trim()) {
      setInvalid('Il manque le titre.');
      return undefined;
    }
    if (!medium) {
      setInvalid('Choisissez une catégorie.');
      return undefined;
    }

    return {
      title: title.trim(),
      medium,
      // The excerpt is what feeds and cards show. Falling back to the hook beats
      // refusing the save over a field the design does not put on this screen.
      excerpt: excerpt.trim() || hook.trim() || title.trim(),
      cover,
      status,
      hook: hook.trim() || undefined,
      forThoseWho: forThoseWho.trim() || undefined,
      body: body.trim() || undefined,
      genreMeta: joinMeta(meta) || undefined,
      readingTime: article?.readingTime,
      pullQuote: article?.pullQuote,
      relatedToTitle: article?.relatedTo?.title,
      relatedToNote: article?.relatedTo?.note,
      related: article?.related,
    };
  }

  async function submit(status: 'draft' | 'published') {
    const data = payload(status);
    if (!data) return;

    const result = await save.run(article?.id, data);
    if (!result) return;

    setSaved(true);
    setCurrentStatus(status);
    // A new avis has no id in the URL yet; land on its own editor rather than
    // leaving the form thinking it is still creating.
    if (!editing) navigate(`/admin/articles/${result.id}`, { replace: true });
  }

  async function destroy() {
    if (!article) return;
    if (await remove.run(article.id).then(() => true, () => false)) {
      navigate('/admin/articles');
    }
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
          {invalid && (
            <span className={styles.saveState} role="alert">
              {invalid}
            </span>
          )}
          <EditorActions
            status={currentStatus}
            pending={save.pending || remove.pending}
            error={save.error ?? remove.error}
            saved={saved}
            onSave={() => void submit(currentStatus ?? 'draft')}
            onPublish={
              editing
                ? () => void submit(currentStatus === 'published' ? 'draft' : 'published')
                : () => void submit('published')
            }
            onDelete={editing ? destroy : undefined}
            deleteLabel="cet avis"
            data-testid="article-actions"
          />
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
              onChange={(event) => touched(setTitle)(event.target.value)}
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
              onChange={(event) => touched(setHook)(event.target.value)}
              placeholder="La question qui ouvre l’avis…"
            />
          </div>

          <div className={`${styles.field} ${styles.fieldHook}`}>
            <label className={styles.label} htmlFor="article-excerpt">
              Résumé
            </label>
            <input
              id="article-excerpt"
              className={styles.hookInput}
              value={excerpt}
              onChange={(event) => touched(setExcerpt)(event.target.value)}
              placeholder="La phrase qui accompagne l’avis dans les grilles…"
            />
          </div>

          <BodyEditor value={body} onChange={touched(setBody)} />

          <div className={`${styles.field} ${styles.fieldForThoseWho}`}>
            <label className={styles.label} htmlFor="article-for-those-who">
              Pour ceux qui…
            </label>
            <input
              id="article-for-those-who"
              className={styles.forThoseWhoInput}
              value={forThoseWho}
              onChange={(event) => touched(setForThoseWho)(event.target.value)}
              placeholder="Pour ceux qui aiment…"
            />
          </div>
        </div>

        <FormSidebar
          medium={medium}
          onMediumChange={touched(setMedium)}
          cover={cover}
          onCoverChange={touched(setCover)}
          meta={meta}
          onMetaChange={(patch) => {
            setMeta((previous) => ({ ...previous, ...patch }));
            setSaved(false);
          }}
        />
      </div>
    </section>
  );
}

/**
 * Route entry: resolves `:id` against the catalogue. `/admin/articles/nouveau`
 * has no id and renders an empty form; an unknown id falls back to the listing.
 *
 * The form below is only mounted once the avis has arrived, which is what keeps
 * its fields plain `useState` initialisers — mounting it empty and filling it in
 * an effect would race whatever the editor had already started typing. The `key`
 * remounts it when navigating straight from one avis to another, so the fields
 * restart from the new one.
 */
export default function AdminArticleFormPage() {
  const { id } = useParams();
  const { data: article, status, notFound, reload } = useAdminArticle(id);

  if (!id) return <ArticleForm />;
  if (status === 'loading' || status === 'idle') return <PageLoading />;
  if (notFound) return <Navigate to="/admin/articles" replace />;
  if (!article) return <PageError onRetry={reload} />;
  return <ArticleForm key={article.id} article={article} />;
}
