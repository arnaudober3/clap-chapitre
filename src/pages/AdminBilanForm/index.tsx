import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import HighlightCard, { type Highlight, type HighlightPatch } from './HighlightCard';
import AddHighlightPicker from './AddHighlightPicker';
import { moveByOne, moveTo } from '../../reorder';
import { useAdminPageKicker } from '../../components/layout/adminPageMeta';
import { adminBilanById, nextBilanMonth } from '../../mock/adminBilans';
import type { Bilan, PublishedArticle } from '../../mock/types';
import styles from './AdminBilanForm.module.css';

/** Flatten an avis into the flat field set the editor manipulates. */
function toHighlight(item: PublishedArticle): Highlight {
  return {
    id: item.id,
    medium: item.medium,
    title: item.title,
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
function BilanForm({ bilan }: { bilan?: Bilan }) {
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

  // A month that was never opened, and the month in progress, are both drafts;
  // only a month already online reads as published.
  const state = bilan?.status === 'published' ? 'Publié' : 'Brouillon';
  // The mobile top bar of the shell doubles as the page header (design 7c),
  // where the publication state is the only line that fits.
  useAdminPageKicker(state);

  // The month is never typed: an existing bilan carries its own, and a new one
  // covers the first month the catalogue has no bilan for.
  const month = bilan ?? nextBilanMonth();
  const monthSuffix = `· ${month.monthLabel.toLowerCase()} ${month.year}`;

  function patchHighlight(id: string, patch: HighlightPatch) {
    setHighlights((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
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
  function addHighlight(avis: PublishedArticle) {
    setHighlights((previous) => [...previous, toHighlight(avis)]);
  }

  // Mock save: no store, no persistence — publishing lands back on the listing.
  function submit() {
    navigate('/admin/bilans');
  }

  return (
    <section className={styles.page} data-testid="admin-bilan-form-page">
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
          <button type="button" className={styles.primaryButton} onClick={submit}>
            {bilan?.status === 'published' ? (
              'Enregistrer'
            ) : (
              <>
                Publier<span className={styles.publishLong}> le bilan</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="bilan-title">
            Titre du bilan
            <span className={styles.labelSuffix}> {monthSuffix}</span>
          </label>
          <input
            id="bilan-title"
            className={styles.titleInput}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
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
            onChange={(event) => setMood(event.target.value)}
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
          monthId={month.id}
          monthLabel={month.monthLabel}
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
 * `/admin/bilans/nouveau` has no id and renders an empty editor; an unknown id
 * falls back to the listing. The `key` remounts the form when navigating
 * straight from one month to another so its local field state restarts.
 */
export default function AdminBilanFormPage() {
  const { id } = useParams();
  if (!id) return <BilanForm />;
  const bilan = adminBilanById(id);
  if (!bilan) return <Navigate to="/admin/bilans" replace />;
  return <BilanForm key={bilan.id} bilan={bilan} />;
}
