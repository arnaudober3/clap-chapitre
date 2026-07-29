import { useRef, useState } from "react";
import LinkRows from "./LinkRows";
import { moveByOne, moveTo } from "../../reorder";
import { useAdminPageKicker } from "../../components/layout/adminPageMeta";
import {
  mesuivreFormValues,
  type MeSuivreFormValues,
  type SocialLinkField,
} from "../../mock/mesuivre";
import styles from "./AdminMeSuivre.module.css";

/** Design 6g's standfirst — also the page summary the mobile top bar carries. */
const SUBTITLE = "Les liens affichés sur la page Me suivre";

/**
 * Admin editor for the public "Me suivre" page (design 6g desktop → 7f mobile).
 * Like the "À propos" editor this is a singleton page: no listing above it, so
 * the header names the page instead of a breadcrumb. Nothing is persisted in
 * this prototype — the fields are local state seeded from src/mock/mesuivre.ts,
 * and "Enregistrer" only flips a passive state line.
 */
export default function AdminMeSuivrePage() {
  const [values, setValues] = useState<MeSuivreFormValues>(mesuivreFormValues);
  const [saved, setSaved] = useState(false);
  // Added rows need a key that no reorder or removal can reuse. A counter is
  // enough and stays deterministic — no Date, no Math.random anywhere here.
  const added = useRef(0);
  // The row being dragged, if any — it dims, and every row it flies over trades
  // places with it. Nothing is persisted: the order lives here only.
  const [dragging, setDragging] = useState<string>();

  // On mobile the shell's top bar is the page header (design 7f): it shows
  // "Me suivre" over this line, so the page keeps its own title block for lg.
  useAdminPageKicker(SUBTITLE);

  /** Any edit invalidates the "Enregistré" line — it describes the last save. */
  function patch(next: Partial<MeSuivreFormValues>) {
    setValues((previous) => ({ ...previous, ...next }));
    setSaved(false);
  }

  function patchLinks(next: (links: SocialLinkField[]) => SocialLinkField[]) {
    setValues((previous) => {
      const links = next(previous.links);
      // The reorder helpers hand back the very same array on a no-op, and a
      // live drag calls this on every hover — bail out so React does too.
      return links === previous.links ? previous : { ...previous, links };
    });
    setSaved(false);
  }

  function patchLink(id: string, next: Partial<SocialLinkField>) {
    patchLinks((links) =>
      links.map((row) => (row.id === id ? { ...row, ...next } : row)),
    );
  }

  function removeLink(id: string) {
    patchLinks((links) => links.filter((row) => row.id !== id));
  }

  /** Live reorder: the dragged row swaps with whichever row it hovers. */
  function dragOver(overId: string) {
    if (!dragging) return;
    patchLinks((links) => moveTo(links, dragging, overId));
  }

  /** The keyboard counterpart, one place at a time. */
  function moveLink(id: string, delta: -1 | 1) {
    patchLinks((links) => moveByOne(links, id, delta));
  }

  function addLink() {
    added.current += 1;
    const id = `nouveau-${added.current}`;
    patchLinks((links) => [...links, { id, name: "", url: "" }]);
  }

  // Mock save: no store, no navigation — the state line is the only feedback.
  function submit() {
    setSaved(true);
  }

  return (
    <section className={styles.page} data-testid="admin-mesuivre-page">
      <div className={styles.topbar}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Page « Me suivre »</h1>
          <p className={styles.subtitle}>{SUBTITLE}</p>
        </div>
        <div className={styles.topbarActions}>
          {saved && (
            <span className={styles.saveState}>
              <span className={styles.saveDot} aria-hidden="true" />
              Enregistré
            </span>
          )}
          <button
            type="button"
            className={styles.primaryButton}
            onClick={submit}
          >
            Enregistrer
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="mesuivre-intro">
            Petit mot d’intro
          </label>
          <input
            id="mesuivre-intro"
            className={styles.introInput}
            value={values.intro}
            onChange={(event) => patch({ intro: event.target.value })}
            placeholder="La phrase qui ouvre la page…"
          />
        </div>

        <LinkRows
          rows={values.links}
          dragging={dragging}
          onDragStart={setDragging}
          onDragOver={dragOver}
          onDragEnd={() => setDragging(undefined)}
          onChange={patchLink}
          onRemove={removeLink}
          onMove={moveLink}
          onAdd={addLink}
        />
      </div>
    </section>
  );
}
