import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../api/client';
import { postComment } from '../../../api/mutations';

/**
 * The comment form, shared by the avis thread and the bilan thread.
 *
 * They were two near-identical inert forms; now that submitting writes, the two
 * copies would be two places to keep the anti-spam guards in step. Both are
 * carried here:
 *
 *   * **the honeypot** — a field positioned off-screen and left empty by anyone
 *     who can see the form. A bot fills every input it finds.
 *   * **`openedAt`** — stamped when the composer mounts. The server refuses
 *     anything submitted in under three seconds, which no human reaches.
 *
 * Both are silently accepted server-side: a caught bot gets the same 201 a
 * visitor does. Telling it which check it failed is telling it what to fix.
 *
 * The acknowledgement matters as much as the write. A comment lands in
 * moderation and does *not* appear, so without a sentence saying so the visitor
 * would read a successful submission as a broken one and post again.
 */
export interface CommentComposerProps {
  targetType: 'article' | 'bilan';
  targetId: string;
  /** The class names each thread's own stylesheet provides. */
  classes: {
    form: string;
    field: string;
    row: string;
    name: string;
    button: string;
    /** Optional: the acknowledgement and error lines. */
    notice?: string;
  };
  /** Rendered before the fields — the bilan thread puts its label there. */
  children?: ReactNode;
  'data-testid'?: string;
}

export default function CommentComposer({
  targetType,
  targetId,
  classes,
  children,
  'data-testid': testId = 'comment-composer',
}: CommentComposerProps) {
  const [body, setBody] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string>();

  // A ref, not state: it is stamped once at mount and must survive every
  // keystroke without re-rendering anything.
  const openedAt = useRef(Date.now());
  const trap = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !body.trim()) return;

    setPending(true);
    setError(undefined);
    try {
      await postComment({
        targetType,
        targetId,
        // The design offers anonymity outright — the placeholder says so.
        author: name.trim() || 'Anonyme',
        body: body.trim(),
        trap: trap.current?.value ?? '',
        openedAt: openedAt.current,
      });
      setQueued(true);
      setBody('');
      setName('');
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiError ? cause.message : "Le message n’a pas pu être envoyé.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={classes.form} onSubmit={submit} data-testid={testId}>
      {children}

      <textarea
        className={classes.field}
        placeholder="Votre commentaire…"
        aria-label="Votre commentaire"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setQueued(false);
        }}
      />

      {/* The honeypot. `aria-hidden` and `tabIndex={-1}` keep it away from
          anyone using a screen reader or a keyboard; only a script fills it. */}
      <input
        ref={trap}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
      />

      <div className={classes.row}>
        <input
          type="text"
          className={classes.name}
          placeholder="Nom — ou rester anonyme"
          aria-label="Nom — ou rester anonyme"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" className={classes.button} disabled={pending}>
          {pending ? 'Envoi…' : 'Publier'}
        </button>
      </div>

      {queued && (
        <p className={classes.notice} role="status">
          Merci ! Votre message sera publié après relecture.
        </p>
      )}

      {error && (
        <p className={classes.notice} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
