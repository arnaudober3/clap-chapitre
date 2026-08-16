import { useState } from "react";
import PortraitField from "./PortraitField";
import YearStatsFields from "./YearStatsFields";
import { useAdminPageKicker } from "../../components/layout/adminPageMeta";
import { useAPropos, type AProposContent } from "../../api/content";
import { saveApropos } from "../../api/mutations";
import { useMutation } from "../../api/useMutation";
import { EditorActions, PageError, PageLoading } from "../../components/ui";
import {
  aproposFormValues,
  aproposPayload,
  BLANK_APROPOS_CONTENT,
  type AProposFormValues,
  type YearStatField,
} from "../../content/apropos";
import styles from "./AdminAPropos.module.css";

/** Design 6f's standfirst — also the page summary the mobile top bar carries. */
const SUBTITLE = "Ce que voient les visiteurs sur la page À propos";

/**
 * Admin editor for the public "À propos" page (design 6f desktop → 7e mobile).
 * Unlike the article and bilan editors this is a singleton page: there is no
 * listing above it, so the header names the page instead of a breadcrumb.
 *
 * The page content is fetched, and the form is mounted only once it has
 * arrived. That is what lets `useState` keep an initialiser instead of needing
 * an effect to refill fields the editor may already be typing in.
 *
 * A 404 here means the row was never written — an empty database, not a load
 * failure — and it is exactly the case this editor exists to fix, so the form
 * still mounts, on `BLANK_APROPOS_CONTENT`: the first "Enregistrer" then
 * creates the row rather than being blocked behind a retry button.
 */
export default function AdminAProposPage() {
  const { data, status, notFound, reload } = useAPropos();

  if (status === 'loading' || status === 'idle') return <PageLoading />;
  if (status === 'error' && !notFound) return <PageError onRetry={reload} />;
  return <AProposForm content={data ?? BLANK_APROPOS_CONTENT} />;
}

function AProposForm({ content }: { content: AProposContent }) {
  const [values, setValues] = useState<AProposFormValues>(() => aproposFormValues(content));
  const [saved, setSaved] = useState(false);
  // The portrait lives beside `values`: it belongs to the row, not to the
  // five fields `AProposFormValues` was drawn around. Its alt text is not
  // edited here any more — `Hero.tsx` fixes it in code.
  const [portrait, setPortrait] = useState(content.portraitImage);
  const save = useMutation(saveApropos);

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

  async function submit() {
    if (await save.run(aproposPayload(content, values, portrait))) setSaved(true);
  }

  return (
    <section className={styles.page} data-testid="admin-apropos-page" data-anim="stagger">
      <div className={styles.topbar}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Page « À propos »</h1>
          <p className={styles.subtitle}>{SUBTITLE}</p>
        </div>
        <div className={styles.topbarActions}>
          {/* Singleton row: nothing to publish, nothing to delete. */}
          <EditorActions
            pending={save.pending}
            error={save.error}
            saved={saved}
            onSave={() => void submit()}
            saveLabel="Enregistrer"
            data-testid="apropos-actions"
          />
        </div>
      </div>

      <div className={styles.body} data-anim="stagger">
        {/* Portrait beside title + accroche at lg (6f); stacked, portrait
            centred, on the phone (7e). */}
        <div className={styles.identity}>
          <PortraitField
            value={portrait}
            onChange={(key) => {
              setPortrait(key);
              setSaved(false);
            }}
          />
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
