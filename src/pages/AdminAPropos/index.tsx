import { useState } from 'react';
import PortraitField from './PortraitField';
import YearStatsFields from './YearStatsFields';
import { useAdminPageKicker } from '../../components/layout/adminPageMeta';
import {
  aproposFormValues,
  type AProposFormValues,
  type YearStatField,
} from '../../mock/apropos';
import styles from './AdminAPropos.module.css';

/** Design 6f's standfirst — also the page summary the mobile top bar carries. */
const SUBTITLE = 'Ce que voient les visiteurs sur la page À propos';

/**
 * Admin editor for the public "À propos" page (design 6f desktop → 7e mobile).
 * Unlike the article and bilan editors this is a singleton page: there is no
 * listing above it, so the header names the page instead of a breadcrumb.
 * Nothing is persisted in this prototype — the fields are local state seeded
 * from src/mock/apropos.ts, "Annuler" reseeds them and "Enregistrer" only
 * flips a passive state line.
 */
export default function AdminAProposPage() {
  const [values, setValues] = useState<AProposFormValues>(aproposFormValues);
  const [saved, setSaved] = useState(false);

  // On mobile the shell's top bar is the page header (design 7e): it shows
  // "À propos" over this line, so the page keeps its own title block for lg.
  useAdminPageKicker(SUBTITLE);

  /** Any edit invalidates the "Enregistré" line — it describes the last save. */
  function patch(next: Partial<AProposFormValues>) {
    setValues((previous) => ({ ...previous, ...next }));
    setSaved(false);
  }

  function patchStat(index: number, next: Partial<YearStatField>) {
    setValues((previous) => ({
      ...previous,
      stats: previous.stats.map((row, position) =>
        position === index ? { ...row, ...next } : row,
      ),
    }));
    setSaved(false);
  }

  // Mock save: no store, no navigation — the state line is the only feedback.
  function submit() {
    setSaved(true);
  }

  function cancel() {
    setValues(aproposFormValues());
    setSaved(false);
  }

  return (
    <section className={styles.page} data-testid="admin-apropos-page">
      <div className={styles.topbar}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Page « À propos »</h1>
          <p className={styles.subtitle}>{SUBTITLE}</p>
        </div>
        <div className={styles.topbarActions}>
          {saved && (
            <span className={styles.saveState}>
              <span className={styles.saveDot} aria-hidden="true" />
              Enregistré
            </span>
          )}
          <button type="button" className={styles.cancelButton} onClick={cancel}>
            Annuler
          </button>
          <button type="button" className={styles.primaryButton} onClick={submit}>
            Enregistrer
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {/* Portrait beside title + accroche at lg (6f); stacked, portrait
            centred, on the phone (7e). */}
        <div className={styles.identity}>
          <PortraitField />
          <div className={styles.identityFields}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="apropos-title">
                Titre
              </label>
              <input
                id="apropos-title"
                className={styles.titleInput}
                value={values.title}
                onChange={(event) => patch({ title: event.target.value })}
                placeholder="Bonjour, moi c’est…"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="apropos-intro">
                Accroche
              </label>
              <input
                id="apropos-intro"
                className={styles.introInput}
                value={values.intro}
                onChange={(event) => patch({ intro: event.target.value })}
                placeholder="La phrase qui ouvre la page…"
              />
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="apropos-bio">
            Présentation
          </label>
          {/* One textarea for the whole bio: a blank line starts a paragraph,
              the way the public page splits it. */}
          <textarea
            id="apropos-bio"
            className={styles.bioInput}
            value={values.bio}
            onChange={(event) => patch({ bio: event.target.value })}
            placeholder="Qui écrit, et pourquoi…"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="apropos-quote">
            Citation mise en avant
          </label>
          {/* The guillemets are not typed here — the public page adds them. */}
          <input
            id="apropos-quote"
            className={styles.quoteInput}
            value={values.quote}
            onChange={(event) => patch({ quote: event.target.value })}
            placeholder="La phrase à mettre en exergue…"
          />
        </div>

        <YearStatsFields rows={values.stats} onChange={patchStat} />
      </div>
    </section>
  );
}
