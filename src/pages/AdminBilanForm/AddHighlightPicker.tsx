import { useEffect, useMemo, useRef, useState } from 'react';
import { MEDIUM_ACCENT, MEDIUM_CHIP_LABEL } from '../../media';
import { usePickerArticles } from '../../api/admin';
import { fold } from '../../format';
import type { PublishedArticle } from '../../../shared/content';
import styles from './AdminBilanForm.module.css';

/** How many catalogue avis the panel reveals per "Voir plus". */
const BATCH = 6;

/**
 * The "Ajouter un coup de cœur" control: the dashed button opens a popover that
 * lists the avis a bilan can highlight — existing published reviews, never new
 * ones. The bilan's own month leads (shown in full, it is short); the rest of
 * the catalogue follows, newest-first and revealed a batch at a time, since it
 * is the recent avis one usually adds. Picking one hands the article back to the
 * editor and closes the panel; the article then drops out of `taken` and cannot
 * be added twice.
 *
 * The open/close idiom (outside click + Escape) mirrors AdminSelect; the panel
 * itself is bespoke — a plain listbox couldn't carry the two sections and the
 * incremental reveal.
 */
export default function AddHighlightPicker({
  monthId,
  monthLabel,
  taken,
  onPick,
}: {
  monthId: string;
  monthLabel: string;
  taken: string[];
  onPick: (avis: PublishedArticle) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(BATCH);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // The whole published catalogue, newest-first, split here rather than by the
  // endpoint: "this month" and "the rest" is a way of presenting one list, and
  // asking the server for the same rows twice would be the slower way to say it.
  const { data: published } = usePickerArticles();
  const { thisMonth, catalogue } = useMemo(() => {
    const available = (published ?? []).filter((avis) => !taken.includes(avis.id));
    return {
      thisMonth: available.filter((avis) => avis.publishedAt.startsWith(monthId)),
      catalogue: available.filter((avis) => !avis.publishedAt.startsWith(monthId)),
    };
  }, [published, monthId, taken]);
  const isEmpty = thisMonth.length === 0 && catalogue.length === 0;

  // Title search, accent- and case-insensitive like the admin listings' fold().
  const needle = fold(query.trim());
  const matches = (avis: PublishedArticle) => !needle || fold(avis.title).includes(needle);
  const monthMatches = thisMonth.filter(matches);
  const catalogueMatches = catalogue.filter(matches);
  const noMatch = !isEmpty && monthMatches.length === 0 && catalogueMatches.length === 0;

  // Close on outside click or Escape — same listeners as AdminSelect.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // A fresh open starts empty and from the first batch; focus the search so the
  // author can type straight away.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function toggle() {
    setQuery('');
    setVisible(BATCH);
    setOpen((v) => !v);
  }

  function search(value: string) {
    setQuery(value);
    // A new query restarts the reveal, so its first results are always shown.
    setVisible(BATCH);
  }

  function pick(avis: PublishedArticle) {
    onPick(avis);
    setOpen(false);
  }

  const shownCatalogue = catalogueMatches.slice(0, visible);

  return (
    <div className={styles.picker} ref={rootRef}>
      <button
        type="button"
        className={styles.addButton}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className={styles.addPlus} aria-hidden="true">
          +
        </span>
        Ajouter un coup de cœur
      </button>

      {open && (
        <div className={styles.pickerPanel} role="listbox" aria-label="Choisir un avis à mettre en avant">
          {isEmpty ? (
            <p className={styles.pickerEmpty}>Tous les avis sont déjà dans le bilan.</p>
          ) : (
            <>
              <div className={styles.pickerHeader}>
                <input
                  ref={searchRef}
                  type="search"
                  className={styles.pickerSearch}
                  aria-label="Rechercher un avis"
                  placeholder="Rechercher un avis…"
                  value={query}
                  onChange={(event) => search(event.target.value)}
                />
              </div>
              {noMatch ? (
                <p className={styles.pickerEmpty}>Aucun avis ne correspond.</p>
              ) : (
                <>
                  {monthMatches.length > 0 && (
                    <>
                      <p className={styles.pickerSectionLabel}>Avis de {monthLabel.toLowerCase()}</p>
                      {monthMatches.map((avis) => (
                        <AvisRow key={avis.id} avis={avis} onPick={pick} />
                      ))}
                    </>
                  )}
                  {catalogueMatches.length > 0 && (
                    <>
                      <p className={styles.pickerSectionLabel}>Tout le catalogue</p>
                      {shownCatalogue.map((avis) => (
                        <AvisRow key={avis.id} avis={avis} onPick={pick} />
                      ))}
                      {visible < catalogueMatches.length && (
                        <button
                          type="button"
                          className={styles.pickerMore}
                          onClick={() => setVisible((v) => v + BATCH)}
                        >
                          Voir plus
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** One selectable avis: its medium chip and its title. */
function AvisRow({
  avis,
  onPick,
}: {
  avis: PublishedArticle;
  onPick: (avis: PublishedArticle) => void;
}) {
  return (
    <button
      type="button"
      className={styles.pickerRow}
      role="option"
      aria-selected="false"
      aria-label={`Ajouter « ${avis.title} »`}
      onClick={() => onPick(avis)}
    >
      <span
        className={styles.pickerChip}
        style={{ ['--chip-accent' as string]: MEDIUM_ACCENT[avis.medium] }}
      >
        {MEDIUM_CHIP_LABEL[avis.medium]}
      </span>
      <span className={styles.pickerRowTitle}>{avis.title}</span>
    </button>
  );
}
