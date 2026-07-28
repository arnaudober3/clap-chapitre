import { MEDIA, MEDIUM_CHIP_LABEL } from '../../media';
import type { Medium } from '../../mock/types';
import styles from './AdminArticleForm.module.css';

/** The three metadata slots that make up an avis' `genreMeta` line. */
export interface MetaFields {
  genre: string;
  duration: string;
  year: string;
}

/**
 * The settings column of design 6c: category chips, the cover dropzone and the
 * metadata rows. On mobile (7b) the same blocks flow inline — the category
 * moves up right under the title via CSS `order`.
 */
export default function FormSidebar({
  medium,
  onMediumChange,
  cover,
  meta,
  onMetaChange,
}: {
  medium?: Medium;
  onMediumChange: (medium: Medium) => void;
  /** CSS gradient of the current cover, if the avis already has one. */
  cover?: string;
  meta: MetaFields;
  onMetaChange: (patch: Partial<MetaFields>) => void;
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={`${styles.sideBlock} ${styles.sideCategory}`}>
        <div className={styles.sideTitle}>Catégorie</div>
        <div className={styles.chips}>
          {MEDIA.map((entry) => {
            const active = entry.medium === medium;
            return (
              <button
                key={entry.medium}
                type="button"
                className={
                  active ? `${styles.chip} ${styles.chipActive}` : styles.chip
                }
                aria-pressed={active}
                onClick={() => onMediumChange(entry.medium)}
              >
                {MEDIUM_CHIP_LABEL[entry.medium]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cover + metadata share a row on mobile (design 7b) and stack on desktop. */}
      <div className={styles.sideRow}>
        <div className={styles.sideBlock}>
          <div className={styles.sideTitle}>Affiche</div>
          {/* Covers are CSS gradients in this prototype — the dropzone previews the
            current one and takes no upload. */}
          <div
            className={
              cover
                ? `${styles.dropzone} ${styles.dropzoneFilled}`
                : styles.dropzone
            }
            style={cover ? { background: cover } : undefined}
          >
            {!cover && (
              <>
                <span className={styles.dropIcon} aria-hidden="true">
                  ↑
                </span>
                <span className={styles.dropText}>
                  Glisser une image
                  <br />
                  ou parcourir
                </span>
              </>
            )}
          </div>
        </div>

        <div className={styles.sideBlock}>
          <div className={styles.sideTitle}>Métadonnées</div>
          <div className={styles.metaRows}>
            <label className={styles.metaRow}>
              <span className={styles.metaLabel}>Genre</span>
              <input
                className={styles.metaInput}
                value={meta.genre}
                onChange={(event) =>
                  onMetaChange({ genre: event.target.value })
                }
                placeholder="Ajouter un genre"
              />
            </label>
            <label className={styles.metaRow}>
              <span className={styles.metaLabel}>Durée</span>
              <input
                className={styles.metaInput}
                value={meta.duration}
                onChange={(event) =>
                  onMetaChange({ duration: event.target.value })
                }
                placeholder="hh mm"
              />
            </label>
            <label className={styles.metaRow}>
              <span className={styles.metaLabel}>Année</span>
              <input
                className={styles.metaInput}
                value={meta.year}
                onChange={(event) => onMetaChange({ year: event.target.value })}
                placeholder="AAAA"
              />
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
}
