import { useRef, useState } from "react";
import LinkRows from "./LinkRows";
import { moveByOne, moveTo } from "../../reorder";
import { useAdminPageKicker } from "../../components/layout/adminPageMeta";
import { useMeSuivre, type MeSuivreContent } from "../../api/content";
import { saveMeSuivre } from "../../api/mutations";
import { useMutation } from "../../api/useMutation";
import { EditorActions, PageError, PageLoading } from "../../components/ui";
import {
  BLANK_MESUIVRE_CONTENT,
  mesuivreFormValues,
  mesuivrePayload,
  type MeSuivreFormValues,
  type SocialLinkField,
} from "../../content/mesuivre";
import styles from "./AdminMeSuivre.module.css";

/** Design 6g's standfirst — also the page summary the mobile top bar carries. */
const SUBTITLE = "Les liens affichés sur la page Me suivre";

/**
 * Admin editor for the public "Me suivre" page (design 6g desktop → 7f mobile).
 * Like the "À propos" editor this is a singleton page: no listing above it, so
 * the header names the page instead of a breadcrumb.
 *
 * The form is mounted only once the page content has arrived, which is what
 * keeps its fields a plain `useState` initialiser rather than an effect
 * racing the editor's typing.
 *
 * A 404 here means the row was never written — an empty database, not a load
 * failure — and it is exactly the case this editor exists to fix, so the form
 * still mounts, on `BLANK_MESUIVRE_CONTENT`: the first "Enregistrer" then
 * creates the row rather than being blocked behind a retry button.
 */
export default function AdminMeSuivrePage() {
  const { data, status, notFound, reload } = useMeSuivre();

  if (status === 'loading' || status === 'idle') return <PageLoading />;
  if (status === 'error' && !notFound) return <PageError onRetry={reload} />;
  return <MeSuivreForm content={data ?? BLANK_MESUIVRE_CONTENT} />;
}

function MeSuivreForm({ content }: { content: MeSuivreContent }) {
  const [values, setValues] = useState<MeSuivreFormValues>(() => mesuivreFormValues(content));
  const [saved, setSaved] = useState(false);
  const save = useMutation(saveMeSuivre);
  // Added rows need a key that no reorder or removal can reuse. A counter is
  // enough and stays deterministic — no Date, no Math.random anywhere here.
  const added = useRef(0);
  // The row being dragged, if any — it dims, and every row it flies over trades
  // places with it. Nothing is persisted: the order lives here only.
  const [dragging, setDragging] = useState<string>();
  // Validation errors per link: a non-empty row with missing required fields.
  const [linkErrors, setLinkErrors] = useState<Map<string, string>>(new Map());

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
    // Clear any validation error on this link when it changes.
    setLinkErrors((prev) => {
      const updated = new Map(prev);
      updated.delete(id);
      return updated;
    });
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
    // `id` is a React list key, not the stored one: the server derives
    // `mesuivre_socials.key` from the name. See `mesuivrePayload`.
    patchLinks((links) => [
      ...links,
      { id, name: "", url: "", handle: "", glyph: "", cta: "" },
    ]);
  }

  async function submit() {
    // Validate required fields: a non-empty row must have both name and URL.
    const errors = new Map<string, string>();
    for (const link of values.links) {
      const hasName = link.name.trim() !== '';
      const hasUrl = link.url.trim() !== '';
      const isEmpty = !hasName && !hasUrl;

      if (isEmpty) continue; // Unnamed, unlinked row — will be filtered on send.

      if (!hasName) {
        errors.set(link.id, 'Un nom est nécessaire pour enregistrer ce lien.');
      } else if (!hasUrl) {
        errors.set(link.id, 'Une adresse est nécessaire pour enregistrer ce lien.');
      }
    }

    if (errors.size > 0) {
      setLinkErrors(errors);
      return;
    }

    if (await save.run(mesuivrePayload(content, values))) setSaved(true);
  }

  return (
    <section className={styles.page} data-testid="admin-mesuivre-page" data-anim="stagger">
      <div className={styles.topbar}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Page « Me suivre »</h1>
          <p className={styles.subtitle}>{SUBTITLE}</p>
        </div>
        <div className={styles.topbarActions}>
          {/* No publish or delete: the page is a singleton row that always
              exists, so saving is the only act there is. */}
          <EditorActions
            pending={save.pending}
            error={save.error}
            saved={saved}
            onSave={() => void submit()}
            saveLabel="Enregistrer"
            data-testid="mesuivre-actions"
          />
        </div>
      </div>

      <div className={styles.body} data-anim="stagger">
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
          errors={linkErrors}
        />
      </div>
    </section>
  );
}
