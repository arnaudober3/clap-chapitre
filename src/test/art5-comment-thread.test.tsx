import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommentThread from '../pages/Article/CommentThread';
import { aComment, SEED } from './fixtures';
import { useTestDb } from './api-server';

/**
 * Push the clock past the composer's three-second minimum.
 *
 * `openedAt` is stamped when the composer mounts, and `userEvent` types in no
 * real time at all — so without this every test would look like a bot to the
 * server, which is exactly what the last test in this file asserts.
 */
function backdate() {
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000);
}

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * The design 4a thread: Camille answered by the autrice, plus an anonymous
 * entry. It used to be a module of its own under src/pages/; the comments now
 * come from the API, so the shape lives with the other fixtures.
 */
const thread = [
  aComment(),
  aComment({
    id: 'c-article-2',
    author: 'Anonyme',
    body: 'Merci pour cet avis.',
    likes: 3,
    reply: undefined,
  }),
];

const root = resolve(__dirname, '../..');
const componentSource = readFileSync(
  resolve(root, 'src/pages/Article/CommentThread.tsx'),
  'utf8',
);
const css = readFileSync(
  resolve(root, 'src/pages/Article/Article.module.css'),
  'utf8',
);

/** Total entries, nested replies included. */
const total = thread.reduce(
  (sum, entry) => sum + 1 + (entry.reply ? 1 : 0),
  0,
);

describe('ART-5 thread fixture', () => {
  it('is the three-entry design thread: Camille + an undated autrice reply + Anonyme', () => {
    expect(total).toBe(3);
    expect(thread[0].author).toBe('Camille');
    expect(thread[0].reply?.author).toBe('Marie-Zoé');
    expect(thread[0].reply?.isAuthor).toBe(true);
    expect(thread[0].reply?.date).toBe('');
    expect(thread[1].author).toBe('Anonyme');
  });
});

describe('ART-5 CommentThread', () => {
  it('renders the heading with the nested-inclusive count and every entry in order', () => {
    render(<CommentThread comments={thread} articleId="un-dernier-ete" />);
    expect(
      screen.getByRole('heading', { name: `Commentaires · ${total}` }),
    ).toBeInTheDocument();

    expect(screen.getByText('Camille')).toBeInTheDocument();
    expect(screen.getByText('Marie-Zoé')).toBeInTheDocument();
    expect(screen.getByText('Anonyme')).toBeInTheDocument();

    const entries = screen.getAllByTestId('comment-entry');
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent('Camille');
    expect(entries[1]).toHaveTextContent('Anonyme');

    // The Anonyme avatar is a "?" monogram.
    expect(entries[1].firstElementChild).toHaveTextContent('?');
  });

  it('nests the autrice reply, badged, with no date and no affordances of its own', () => {
    render(<CommentThread comments={thread} articleId="un-dernier-ete" />);
    const reply = screen.getByTestId('comment-reply');
    expect(reply).toHaveTextContent('Marie-Zoé');
    expect(within(reply).getByText('autrice')).toBeInTheDocument();
    expect(reply).not.toHaveTextContent(thread[0].date);
    expect(within(reply).queryByRole('button')).toBeNull();
    // It sits inside its parent entry, not as a sibling.
    expect(screen.getAllByTestId('comment-entry')[0]).toContainElement(reply);
  });

  it('gives every entry a ♡ that writes, and keeps Répondre inert', () => {
    useTestDb(SEED);
    render(<CommentThread comments={thread} articleId="un-dernier-ete" />);

    // Still a placeholder: a reply needs its own composer aimed at the entry,
    // and the thread is one level deep by design.
    expect(screen.getAllByRole('button', { name: 'Répondre' })).toHaveLength(2);

    // The ♡ used to be inert too. It is a real toggle now, and starts
    // unpressed — the server dedupes on a hashed address.
    const likeButtons = screen.getAllByRole('button', { name: /[♡♥]/ });
    expect(likeButtons).toHaveLength(2);
    for (const button of likeButtons) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('posts the comment and says it is waiting to be read, without showing it', async () => {
    const user = userEvent.setup();
    const db = useTestDb(SEED);
    render(<CommentThread comments={thread} articleId="un-dernier-ete" />);

    await user.type(screen.getByLabelText('Votre commentaire'), 'Très juste.');
    await user.type(screen.getByLabelText('Nom — ou rester anonyme'), 'Sacha');
    // The server refuses anything submitted under three seconds — the guard
    // against a script that never rendered the form. Typing takes no real time
    // under userEvent, so the mount stamp is pushed back instead.
    backdate();
    await user.click(screen.getByRole('button', { name: 'Publier' }));

    // The acknowledgement is what stops a visitor posting again: the comment is
    // in moderation, so nothing appears in the thread.
    expect(await screen.findByText(/sera publié après relecture/)).toBeInTheDocument();
    expect(screen.getAllByTestId('comment-entry')).toHaveLength(2);
    expect(screen.getAllByTestId('comment-reply')).toHaveLength(1);

    const row = await db
      .prepare("SELECT author, body, status FROM comments WHERE author = 'Sacha'")
      .first<{ author: string; body: string; status: string }>();
    expect(row).toEqual({ author: 'Sacha', body: 'Très juste.', status: 'pending' });
  });

  it('swallows the honeypot: a filled trap answers normally and writes nothing', async () => {
    const user = userEvent.setup();
    const db = useTestDb(SEED);
    const { container } = render(
      <CommentThread comments={thread} articleId="un-dernier-ete" />,
    );

    // Only a form-filling bot touches this field.
    const trap = container.querySelector<HTMLInputElement>('input[name="website"]');
    expect(trap).not.toBeNull();
    fireEvent.change(trap!, { target: { value: 'http://spam.example' } });

    await user.type(screen.getByLabelText('Votre commentaire'), 'Achetez ceci.');
    backdate();
    await user.click(screen.getByRole('button', { name: 'Publier' }));

    // Same answer, same wording: telling a bot which check caught it is telling
    // it what to change.
    expect(await screen.findByText(/sera publié après relecture/)).toBeInTheDocument();

    const row = await db
      .prepare("SELECT count(*) AS total FROM comments WHERE body = 'Achetez ceci.'")
      .first<{ total: number }>();
    expect(row?.total).toBe(0);
  });

  it('refuses a form submitted faster than anyone could read it', async () => {
    const user = userEvent.setup();
    const db = useTestDb(SEED);
    render(<CommentThread comments={thread} articleId="un-dernier-ete" />);

    // No backdating: the composer mounted a moment ago.
    await user.type(screen.getByLabelText('Votre commentaire'), 'Premier !');
    await user.click(screen.getByRole('button', { name: 'Publier' }));

    expect(await screen.findByText(/sera publié après relecture/)).toBeInTheDocument();
    const row = await db
      .prepare("SELECT count(*) AS total FROM comments WHERE body = 'Premier !'")
      .first<{ total: number }>();
    expect(row?.total).toBe(0);
  });
});

describe('ART-5 responsive composer', () => {
  /* jsdom applies no media queries — assert the rules on the CSS text. */
  const LG = '@media (min-width: 1024px)';
  const mobileCss = css.slice(0, css.indexOf(LG));
  const desktopCss = css.slice(css.indexOf(LG));
  const ruleOf = (source: string, name: string) => {
    const matches = [
      ...source.matchAll(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`, 'g')),
    ];
    return matches.length ? matches[matches.length - 1][1] : '';
  };

  it('is a sticky bottom bar on mobile and an inline card on desktop', () => {
    expect(ruleOf(mobileCss, 'composer')).toMatch(/position:\s*fixed/);
    expect(ruleOf(mobileCss, 'composer')).toMatch(/bottom:\s*0/);
    expect(ruleOf(desktopCss, 'composer')).toMatch(/position:\s*static/);
  });

  it('drops the name field on mobile and reserves room under the thread', () => {
    expect(ruleOf(mobileCss, 'composerName')).toMatch(/display:\s*none/);
    expect(ruleOf(desktopCss, 'composerName')).toMatch(/display:\s*block/);
    // The sticky bar must never cover the last entry.
    const padding = ruleOf(mobileCss, 'thread').match(
      /padding-bottom:\s*(\d+)px/,
    );
    expect(padding).not.toBeNull();
    expect(Number(padding![1])).toBeGreaterThanOrEqual(60);
  });
});

describe('ART-5 boundaries', () => {
  it('uses no raw Salon hex colour literal', () => {
    expect(componentSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('stays page-local: it never reaches into the Bilan culturel thread', () => {
    expect(componentSource).not.toContain('BilanCulturel');
  });

  it('renders whatever thread it is handed, holding none of its own', () => {
    // The entries come from /api/articles/:id now; the component keeping a
    // module-level thread is exactly what this guards against.
    expect(componentSource).not.toMatch(/^const thread/m);
    expect(componentSource).toContain('comments');
  });
});
