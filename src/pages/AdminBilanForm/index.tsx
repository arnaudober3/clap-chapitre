import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import HighlightCard, { type Highlight, type HighlightPatch } from './HighlightCard';
import AddHighlightPicker from './AddHighlightPicker';
import { moveByOne, moveTo } from '../../reorder';
import { useAdminPageKicker } from '../../components/layout/adminPageMeta';
import { useAdminBilan, useNextBilanMonth } from '../../api/admin';
import { apiGet } from '../../api/client';
import { deleteBilan, saveBilan } from '../../api/mutations';
import { useMutation } from '../../api/useMutation';
import { toArticle } from '../../api/map';
import { EditorActions, PageError, PageLoading } from '../../components/ui';
import { monthName } from '../../format';
import type { Bilan, PublishedArticle, WireArticle } from '../../../shared/content';
import styles from './AdminBilanForm.module.css';

/** Flatten an avis into the flat field set the editor manipulates. */
function toHighlight(item: PublishedArticle): Highlight {
  return {
    id: item.id,
    medium: item.medium,
    title: item.title,
    excerpt: item.excerpt,
    hook: item.hook ?? '',
    body: item.body ?? '',
    relatedTitle: item.relatedTo?.title ?? '',
    relatedNote: item.relatedTo?.note ?? '',
    forThoseWho: item.forThoseWho ?? '',
  };
}

/**
 * Admin bilan editor (design 6d desktop → 7c mobile), used for both
 * `/admin/bilans/nouveau` (empty) and `/admin/bilans/:id` (prefilled). Nothing
 * is persisted in this prototype: the fields are local state and the primary
 * action simply navigates away.
 */
function BilanForm({
  bilan,
  nextMonth,
}: {
  bilan?: Bilan;
  /** The month a new bilan would cover. Absent when the catalogue is empty. */
  nextMonth?: { id: string; year: number; month: number };
}) {
  const navigate = useNavigate();
  const editing = bilan !== undefined;

  const [title, setTitle] = useState(bilan?.title ?? '');
  const [mood, setMood] = useState(bilan?.mood ?? '');
  const [highlights, setHighlights] = useState<Highlight[]>(
    () => bilan?.avis.map(toHighlight) ?? [],
  );
  // The card being dragged, if any — it dims, and every card it flies over
  // trades places with it. Nothing is persisted: the order lives here only.
  const [dragging, setDragging] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [invalid, setInvalid] = useState<string>();

  const save = useMutation(saveBilan);
  const remove = useMutation(deleteBilan);

  // A month that was never opened, and the month in progress, are both drafts;
  // only a month already online reads as published.
  const state = bilan?.status === 'published' ? 'Publié' : 'Brouillon';
  // The mobile top bar of the shell doubles as the page header (design 7c),
  // where the publication state is the only line that fits.
  useAdminPageKicker(state);

  // The month is never typed: an existing bilan carries its own, and a new one
  // covers the month after the newest on file. An empty catalogue has neither,
  // and the header simply drops the suffix rather than inventing a date.
  const month = bilan ?? nextMonth;
  const monthLabel = bilan ? bilan.monthLabel : month ? monthName(month.month) : '';
  const monthSuffix = month ? `· ${monthLabel.toLowerCase()} ${month.year}` : '';

  function patchHighlight(id: string, patch: HighlightPatch) {
    setHighlights((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    // Any edit invalidates the "Enregistré" line — it describes the last save.
    setSaved(false);
  }

  /**
   * Live reorder: the dragged card swaps with whichever card it hovers.
   *
   * The order is editorial, not structural: a bilan can read livre, film, livre
   * if that is how the month is best told. Nothing is grouped by medium — each
   * card carries its own colour band and chip instead.
   */
  function dragOver(overId: string) {
    if (!dragging) return;
    setHighlights((previous) => moveTo(previous, dragging, overId));
  }

  /** A coup de cœur is an existing avis, pre-filled and then editable here. */
  async function addHighlight(avis: PublishedArticle) {
    // The picker lists avis without their text — a hundred bodies to render a
    // hundred titles would be the wrong trade. The card needs the whole avis, so
    // it is fetched for the one that was actually picked. On failure the card is
    // still added, with the fields the picker did carry.
    let full = avis;
    try {
      const payload = await apiGet<{ article: WireArticle }>(
        `/api/admin/articles/${encodeURIComponent(avis.id)}`,
        { admin: true },
      );
      const article = toArticle(payload.article);
      if (article.status === 'published') full = article;
    } catch {
      /* keep the summary */
    }
    setHighlights((previous) => [...previous, toHighlight(full)]);
  }

  /**
   * The month, its selection in order, and the cards' inline edits — one request.
   *
   * The cards edit the *avis*, not the bilan, so `edits` carries them back to
   * `articles`. Deliberately absent from it: medium, cover and publication.
   * Saving a month must not be able to unpublish an avis as a side effect.
   */
  function payload(status: 'draft' | 'published') {
    return {
      id: month?.id ?? '',
      monthLabel,
      title: title.trim(),
      mood: mood.trim() || undefined,
      status,
      avis: highlights.map((item) => item.id),
      edits: highlights.map((item) => ({
        id: item.id,
        title: item.title.trim(),
        excerpt: item.excerpt,
        hook: item.hook.trim() || undefined,
        forThoseWho: item.forThoseWho.trim() || undefined,
        body: item.body.trim() || undefined,
        relatedToTitle: item.relatedTitle.trim() || undefined,
        relatedToNote: item.relatedNote.trim() || undefined,
      })),
    };
  }

  async function submit(status: 'draft' | 'published') {
    if (!month?.id) {
      setInvalid('Aucun mois à couvrir : créez d’abord un avis.');
      return;
    }
    if (!title.trim()) {
      setInvalid('Il manque le titre du bilan.');
      return;
    }
    setInvalid(undefined);

    const result = await save.run(bilan?.id, payload(status));
    if (!result) return;

    setSaved(true);
    if (!editing) navigate(`/admin/bilans/${result.id}`, { replace: true });
  }

  async function destroy() {
    if (!bilan) return;
    if (await remove.run(bilan.id).then(() => true, () => false)) {
      navigate('/admin/bilans');
    }
  }

  return (
    <section className={styles.page} data-testid="admin-bilan-form-page" data-anim="stagger">
      <div className={styles.topbar}>
        <div className={styles.breadcrumb}>
          <Link to="/admin/bilans" className={styles.breadcrumbLink}>
            Bilans culturels
          </Link>
          <span aria-hidden="true">›</span>
          <span className={styles.breadcrumbCurrent}>
            {editing ? bilan.title : 'Nouveau bilan'}
          </span>
        </div>
        <div className={styles.topbarActions}>
          <span className={styles.saveState}>
            <span className={styles.saveDot} aria-hidden="true" />
            {state}
          </span>
          {invalid && (
            <span className={styles.saveState} role="alert">
              {invalid}
            </span>
          )}
          <EditorActions
            status={bilan?.status}
            pending={save.pending || remove.pending}
            error={save.error ?? remove.error}
            saved={saved}
            onSave={() => void submit(bilan?.status ?? 'draft')}
            onPublish={
              editing
                ? () => void submit(bilan.status === 'published' ? 'draft' : 'published')
                : () => void submit('published')
            }
            onDelete={editing ? destroy : undefined}
            deleteLabel="ce bilan"
            data-testid="bilan-actions"
          />
        </div>
      </div>

      <div className={styles.body} data-anim="stagger">
        <div className={styles.field}>
          <label className={styles.label} htmlFor="bilan-title">
            Titre du bilan
            <span className={styles.labelSuffix}> {monthSuffix}</span>
          </label>
          <input
            id="bilan-title"
            className={styles.titleInput}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setSaved(false);
            }}
            placeholder="Titre du bilan"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="bilan-mood">
            L’humeur du mois
          </label>
          <textarea
            id="bilan-mood"
            className={styles.moodInput}
            value={mood}
            onChange={(event) => {
              setMood(event.target.value);
              setSaved(false);
            }}
            placeholder="Comment s’est passé le mois ?"
          />
        </div>

        {/* One ordered list, not one section per medium: the order is the
            author's, so a bilan can read livre, film, livre. Each card names
            its own medium with its colour band and chip. */}
        <div className={styles.highlights}>
          {highlights.map((item, index) => (
            <HighlightCard
              key={item.id}
              value={item}
              position={index + 1}
              count={highlights.length}
              dragging={dragging === item.id}
              onChange={(patch) => patchHighlight(item.id, patch)}
              onDragStart={() => setDragging(item.id)}
              onDragOver={() => dragOver(item.id)}
              onDragEnd={() => setDragging(undefined)}
              onMove={(delta) =>
                setHighlights((previous) => moveByOne(previous, item.id, delta))
              }
            />
          ))}
        </div>

        {/* A coup de cœur highlights an existing avis, so the button opens a
            picker rather than adding a blank card. */}
        <AddHighlightPicker
          monthId={month?.id ?? ''}
          monthLabel={monthLabel}
          taken={highlights.map((item) => item.id)}
          onPick={addHighlight}
        />

        <div className={styles.newsletter}>
          <div className={styles.newsletterText}>
            <p className={styles.newsletterTitle}>Générer la newsletter depuis ce bilan</p>
            <p className={styles.newsletterCopy}>Un résumé automatique, à relire avant l’envoi.</p>
          </div>
          <Link to="/admin/newsletter" className={styles.newsletterCta}>
            Créer<span className={styles.newsletterCtaLong}> le résumé</span> →
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Route entry: resolves `:id` against the bilan catalogue.
 * `/admin/bilans/nouveau` has no id and renders an empty editor, which still
 * needs one thing from the server — the month it would cover. An unknown id
 * falls back to the listing.
 *
 * The editor is mounted only once its month has arrived, so its fields stay
 * plain `useState` initialisers. The `key` restarts them when navigating
 * straight from one month to another.
 */
export default function AdminBilanFormPage() {
  const { id } = useParams();
  const next = useNextBilanMonth();
  const { data: bilan, status, notFound, reload } = useAdminBilan(id);

  if (!id) {
    if (next.status === 'loading' || next.status === 'idle') return <PageLoading />;
    if (next.status === 'error') return <PageError onRetry={next.reload} />;
    return <BilanForm nextMonth={next.data} />;
  }

  if (status === 'loading' || status === 'idle') return <PageLoading />;
  if (notFound) return <Navigate to="/admin/bilans" replace />;
  if (!bilan) return <PageError onRetry={reload} />;
  return <BilanForm key={bilan.id} bilan={bilan} />;
}
