import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CommentThread from '../pages/Article/CommentThread';
import { thread } from '../pages/Article/thread';

const root = resolve(__dirname, '../..');
const threadSource = readFileSync(
  resolve(root, 'src/pages/Article/thread.ts'),
  'utf8',
);
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

describe('ART-5 thread mock', () => {
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
    render(<CommentThread />);
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
    render(<CommentThread />);
    const reply = screen.getByTestId('comment-reply');
    expect(reply).toHaveTextContent('Marie-Zoé');
    expect(within(reply).getByText('autrice')).toBeInTheDocument();
    expect(reply).not.toHaveTextContent(thread[0].date);
    expect(within(reply).queryByRole('button')).toBeNull();
    // It sits inside its parent entry, not as a sibling.
    expect(screen.getAllByTestId('comment-entry')[0]).toContainElement(reply);
  });

  it('keeps every ♡ / Répondre affordance an inert button', () => {
    const { container } = render(<CommentThread />);
    const replyButtons = screen.getAllByRole('button', { name: 'Répondre' });
    expect(replyButtons).toHaveLength(2);
    const likeButtons = screen.getAllByRole('button', { name: /♡/ });
    expect(likeButtons).toHaveLength(2);

    const before = container.innerHTML;
    for (const button of [...replyButtons, ...likeButtons]) {
      expect(button.tagName).toBe('BUTTON');
      expect(() => fireEvent.click(button)).not.toThrow();
    }
    expect(container.innerHTML).toBe(before);
  });

  it('has an inert composer: submitting prevents default and adds no comment', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const before = window.location.href;
    render(<CommentThread />);

    const publier = screen.getByRole('button', { name: 'Publier' });
    expect(publier.tagName).toBe('BUTTON');
    expect(publier).toHaveAttribute('type', 'submit');
    expect(screen.getByLabelText('Nom — ou rester anonyme')).toBeInTheDocument();

    const form = screen.getByLabelText('Votre commentaire').closest('form');
    expect(form).not.toBeNull();
    const submitEvent = new Event('submit', {
      bubbles: true,
      cancelable: true,
    });
    fireEvent(form!, submitEvent);
    expect(submitEvent.defaultPrevented).toBe(true);

    expect(screen.getAllByTestId('comment-entry')).toHaveLength(2);
    expect(screen.getAllByTestId('comment-reply')).toHaveLength(1);
    expect(window.location.href).toBe(before);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
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
    expect(threadSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(componentSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('is page-local: it never imports the Bilan culturel thread or component', () => {
    expect(componentSource).not.toContain('BilanCulturel');
    expect(threadSource).not.toContain('BilanCulturel');
  });
});
