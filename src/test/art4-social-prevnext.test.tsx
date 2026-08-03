import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SocialBar from '../pages/Article/SocialBar';
import PrevNext from '../pages/Article/PrevNext';
import { anArticle } from './fixtures';

const root = resolve(__dirname, '../..');
const socialSource = readFileSync(
  resolve(root, 'src/pages/Article/SocialBar.tsx'),
  'utf8',
);
const prevNextSource = readFileSync(
  resolve(root, 'src/pages/Article/PrevNext.tsx'),
  'utf8',
);
const css = readFileSync(
  resolve(root, 'src/pages/Article/Article.module.css'),
  'utf8',
);

const avis = anArticle();
const other = anArticle({ id: 'l-annee-de-la-pluie', title: 'L’année de la pluie', medium: 'livre' });
const third = anArticle({ id: 'les-nuits-blanches', title: 'Les nuits blanches', medium: 'serie' });

/** SocialBar holds the share menu, which reads the router location. */
function renderSocialBar() {
  return render(
    <MemoryRouter initialEntries={[`/article/${avis.id}`]}>
      <SocialBar article={avis} />
    </MemoryRouter>,
  );
}

describe('ART-4 SocialBar', () => {
  it('renders the like pill and Enregistrer as inert buttons, plus a Partager trigger', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const before = window.location.href;
    const { container } = renderSocialBar();

    const like = screen.getByRole('button', { name: /J’aime/ });
    expect(like).toHaveTextContent(String(avis.likes));
    const save = screen.getByRole('button', { name: 'Enregistrer' });
    // "Partager" is the one live control here — ART-8 covers the menu it opens.
    expect(screen.getByRole('button', { name: 'Partager' }).tagName).toBe('BUTTON');

    // The compact mobile row shows the comment count.
    expect(
      screen.getByTestId('article-social'),
    ).toHaveTextContent(String(avis.comments));

    const markup = container.innerHTML;
    for (const control of [like, save]) {
      expect(control.tagName).toBe('BUTTON');
      expect(() => fireEvent.click(control)).not.toThrow();
    }
    expect(container.innerHTML).toBe(markup);
    expect(window.location.href).toBe(before);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('ART-4 PrevNext', () => {
  it('renders both neighbour cards with their labels and links', () => {
    render(
      <MemoryRouter>
        <PrevNext prev={other} next={third} />
      </MemoryRouter>,
    );

    const prev = screen.getByTestId('prev-card');
    expect(prev).toHaveAttribute('href', `/article/${other.id}`);
    expect(prev).toHaveTextContent('Avis précédent');
    expect(prev).toHaveTextContent(other.title);

    const next = screen.getByTestId('next-card');
    expect(next).toHaveAttribute('href', `/article/${third.id}`);
    expect(next).toHaveTextContent('Avis suivant');
    expect(next).toHaveTextContent(third.title);
  });

  it('omits the missing side entirely and never links to undefined', () => {
    const { container, unmount } = render(
      <MemoryRouter>
        <PrevNext next={third} />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', `/article/${third.id}`);
    expect(screen.queryByTestId('prev-card')).toBeNull();
    expect(screen.queryByText(/Avis précédent/)).toBeNull();
    expect(container.innerHTML).not.toContain('undefined');
    unmount();

    const { container: empty } = render(
      <MemoryRouter>
        <PrevNext />
      </MemoryRouter>,
    );
    expect(empty).toBeEmptyDOMElement();
  });
});

/* jsdom applies no media queries, so the responsive rules are asserted on the
   CSS text: everything before the lg block is the mobile (4b) layer. */
const LG = '@media (min-width: 1024px)';
const mobileCss = css.slice(0, css.indexOf(LG));
const desktopCss = css.slice(css.indexOf(LG));

/** The declarations of the last `.name` rule in `source`, or '' if absent. */
function ruleOf(source: string, name: string): string {
  const matches = [...source.matchAll(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`, 'g'))];
  return matches.length ? matches[matches.length - 1][1] : '';
}

describe('ART-4 responsive rules', () => {
  it('keeps Enregistrer and prev/next desktop-only', () => {
    expect(css).toContain(LG);
    for (const name of ['saveLink', 'prevNext']) {
      expect(ruleOf(mobileCss, name)).toMatch(/display:\s*none/);
      expect(ruleOf(desktopCss, name)).toMatch(/display:\s*(inline|grid|flex)/);
    }
  });

  it('shows "J’aime ·" only on desktop and the comment count only on mobile', () => {
    expect(ruleOf(mobileCss, 'likeWord')).toMatch(/display:\s*none/);
    expect(ruleOf(desktopCss, 'likeWord')).toMatch(/display:\s*inline/);
    expect(ruleOf(mobileCss, 'commentCount')).not.toMatch(/display:\s*none/);
    expect(ruleOf(desktopCss, 'commentCount')).toMatch(/display:\s*none/);
  });
});

describe('ART-4 accessible names', () => {
  it('names the like button and the comment count independently of the hidden text', () => {
    renderSocialBar();
    // The visible "J’aime ·" is dropped on mobile — the label carries it.
    expect(
      screen.getByRole('button', { name: `J’aime · ${avis.likes}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('article-social'),
    ).toHaveTextContent(`${avis.comments} commentaires`);
  });
});

describe('ART-4 tokens', () => {
  it('uses no raw Salon hex colour literal', () => {
    expect(socialSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(prevNextSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
