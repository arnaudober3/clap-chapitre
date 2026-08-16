import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CommentThread from '../pages/BilanCulturel/CommentThread';
import { aBilan, aComment } from './fixtures';

/**
 * The design's bilan thread. It used to be a module under src/pages/; the
 * comments come from /api/bilans/:id now, so the shape lives with the fixtures.
 */
const thread = [
  aComment({ id: 'c-bilan-1', author: 'Camille', body: 'Ce bilan m’a donné envie de tout rattraper.' }),
  aComment({ id: 'c-bilan-2', author: 'Léa', body: 'Merci !', likes: 4, reply: undefined }),
];
const latestBilan = () => aBilan();

/** The thread holds the share menu, which reads the router location. */
function renderThread() {
  return render(
    <MemoryRouter initialEntries={['/bilan-culturel']}>
      <CommentThread bilan={latestBilan()} comments={thread} />
    </MemoryRouter>,
  );
}

/** Expected count: top-level entries plus nested replies. */
const expectedCount = thread.reduce(
  (total, entry) => total + 1 + (entry.reply ? 1 : 0),
  0,
);

describe('BC-4 thread fixture', () => {
  it('has an author entry (Marie-Zoé, isAuthor) and a nested reply, plus a like count', () => {
    const authorReply = thread
      .map((e) => e.reply)
      .find((r) => r?.isAuthor);
    expect(authorReply).toBeTruthy();
    expect(authorReply!.author).toBe('Marie-Zoé');
    // The whole-bilan like count is the bilan's own column now, not a constant
    // sitting beside the thread.
    expect(typeof latestBilan().likes).toBe('number');
  });
});

describe('BC-4 CommentThread', () => {
  it('renders the "Commentaires" heading with a count equal to the thread length and the "autrice" badge', () => {
    renderThread();
    expect(
      screen.getByRole('heading', {
        name: new RegExp(`Commentaires · ${expectedCount}`),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('autrice')).toBeInTheDocument();
  });

  it('renders a "J\'aime" control and a "<n> commentaires" count derived from the thread', () => {
    renderThread();
    expect(
      screen.getByRole('button', { name: /J’aime/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${expectedCount} commentaires`),
    ).toBeInTheDocument();
  });

  it('the composer form is inert: submit does not throw, does not navigate, logs no error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const before = window.location.href;
    renderThread();
    const publier = screen.getByRole('button', { name: 'Publier' });
    expect(() => fireEvent.click(publier)).not.toThrow();
    // The composer form submit is prevented.
    const field = screen.getByLabelText('Votre commentaire');
    const form = field.closest('form');
    expect(form).not.toBeNull();
    expect(() => fireEvent.submit(form!)).not.toThrow();
    expect(window.location.href).toBe(before);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
