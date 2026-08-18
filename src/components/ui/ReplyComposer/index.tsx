import { useState, type FormEvent } from 'react';
import { ApiError } from '../../../api/client';
import { replyToComment } from '../../../api/mutations';
import type { Comment } from '../../../../shared/content';

/**
 * The editor's inline reply form, opened by "Répondre" under a root comment.
 *
 * Deliberately not `CommentComposer`: that one carries a honeypot, a mount
 * timestamp and a name field for an anonymous visitor. An admin reply is
 * authenticated by the bearer token already on the request, always speaks as
 * the site's author, and lands approved — none of that anti-spam machinery
 * applies.
 */
export interface ReplyComposerProps {
  /** The root comment this reply answers. */
  commentId: string;
  /** The class names each thread's own stylesheet provides. */
  classes: {
    form: string;
    field: string;
    actions: string;
    button: string;
    cancel: string;
    notice?: string;
  };
  /** Called with the new reply, already shaped for `Entry` to render. */
  onReplied: (reply: Comment) => void;
  onCancel: () => void;
}

export default function ReplyComposer({
  commentId,
  classes,
  onReplied,
  onCancel,
}: ReplyComposerProps) {
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !body.trim()) return;

    setPending(true);
    setError(undefined);
    try {
      const result = await replyToComment(commentId, body.trim());
      onReplied({
        id: result.id,
        author: result.author,
        // No date on an author reply — the thread shows the "autrice" badge instead.
        date: '',
        body: result.body,
        isAuthor: true,
        likes: result.likes,
      });
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiError ? cause.message : 'La réponse n’a pas pu être envoyée.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={classes.form} onSubmit={submit} data-testid="reply-composer">
      <textarea
        className={classes.field}
        placeholder="Votre réponse…"
        aria-label="Votre réponse"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        autoFocus
      />
      <div className={classes.actions}>
        <button
          type="button"
          className={classes.cancel}
          onClick={onCancel}
          disabled={pending}
        >
          Annuler
        </button>
        <button type="submit" className={classes.button} disabled={pending || !body.trim()}>
          {pending ? 'Envoi…' : 'Répondre'}
        </button>
      </div>

      {error && (
        <p className={classes.notice} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
