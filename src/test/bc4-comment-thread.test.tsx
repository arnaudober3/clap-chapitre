import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CommentThread from '../pages/BilanCulturel/CommentThread';
import { AuthProvider } from '../auth/AuthContext';
import { aBilan, aComment, SEED } from './fixtures';
import { useTestDb } from './api-server';

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

/** Same, but with a real admin session — needed to see/use "Répondre". */
function renderThreadAsAdmin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/bilan-culturel']}>
        <CommentThread bilan={latestBilan()} comments={thread} />
      </MemoryRouter>
    </AuthProvider>,
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

  it('renders a "J\'aime" control', () => {
    renderThread();
    expect(
      screen.getByRole('button', { name: /J’aime/ }),
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

describe('BC-4 admin reply', () => {
  /** `thread[1]` (Léa) has no reply yet — c-bilan-1 already carries one. */
  async function seedWithRoot() {
    return useTestDb(`${SEED}
INSERT INTO comments (id,target_type,target_id,parent_id,author,is_author,body,comment_date,likes,position)
VALUES ('c-bilan-2','bilan','2026-07',NULL,'Léa',0,'Merci !','2026-08-03',4,2);`);
  }

  it('hides Répondre from a visitor and offers it only on a comment with no reply yet', async () => {
    await seedWithRoot();
    renderThread();
    expect(screen.queryByRole('button', { name: 'Répondre' })).toBeNull();

    renderThreadAsAdmin();
    const buttons = await screen.findAllByRole('button', { name: 'Répondre' });
    expect(buttons).toHaveLength(1);
  });

  it('lets the editor answer, and the reply joins the thread with no moderation', async () => {
    const user = userEvent.setup();
    await seedWithRoot();
    renderThreadAsAdmin();

    await user.click(await screen.findByRole('button', { name: 'Répondre' }));
    await user.type(screen.getByLabelText('Votre réponse'), 'Merci à vous !');
    await user.click(screen.getByRole('button', { name: 'Répondre' }));

    expect(await screen.findByText('Merci à vous !')).toBeInTheDocument();
    // Camille's existing reply, plus the new one under Léa's comment.
    expect(screen.getAllByText('autrice')).toHaveLength(2);
    // Approved immediately: it renders without ever going through moderation.
    expect(screen.queryByText(/sera publié après relecture/)).toBeNull();
  });
});
