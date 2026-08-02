import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useRef, useState, type ReactNode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import HomePage from '../pages/Home';
import AdminDashboardPage from '../pages/AdminDashboard';
import useReveal from '../anim/useReveal';

const root = resolve(__dirname, '../..');
const tokens = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');
const global = readFileSync(resolve(root, 'src/styles/global.css'), 'utf8');

/** The block of a rule, by selector, so assertions read against one rule. */
function ruleBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = global.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`rule not found: ${selector}`);
  return match[1];
}

/**
 * SC-6 — the reveal cascade. Vitest runs with `css: false` (no `css` key in the
 * test block of vite.config.ts), so jsdom applies no styles at all: the CSS is
 * asserted by reading the file, the behaviour by reading DOM attributes. Same
 * split as sc2-tokens and sc4-layout.
 */
describe('SC-6 reveal cascade — CSS', () => {
  it('tokens.css defines the motion tokens', () => {
    expect(tokens).toMatch(/--dur-enter:\s*320ms/);
    expect(tokens).toMatch(/--anim-step:\s*60ms/);
    expect(tokens).toMatch(/--anim-rise:\s*8px/);
    expect(tokens).toMatch(/--ease-enter:\s*cubic-bezier/);
  });

  it('declares the cc-rise keyframes off the motion tokens', () => {
    expect(global).toContain('@keyframes cc-rise');
    expect(global).toMatch(/translateY\(var\(--anim-rise\)\)/);
  });

  it('runs nothing until a block carries data-anim-in', () => {
    // The gate. Marking a container must never animate anything by itself.
    const revealed = ruleBlock('[data-anim-in]');
    expect(revealed).toMatch(
      /animation:\s*cc-rise var\(--dur-enter\) var\(--ease-enter\) both/,
    );
    expect(revealed).toContain(
      'animation-delay: calc(var(--anim-step) * var(--anim-i, 0))',
    );
    expect(global).not.toMatch(/\[data-anim='stagger'\][^{]*\{[^}]*animation:/);
  });

  it('hides a held block, and only ever from the hook', () => {
    expect(ruleBlock('[data-anim-hold]')).toContain('opacity: 0');
    // Nothing in CSS may hide a block on its own: the hold is added inside the
    // hook's layout effect, so a page where the JS never runs renders whole.
    expect(global).not.toMatch(/\[data-anim='stagger'\][^{]*\{[^}]*opacity:/);
  });

  it('honours prefers-reduced-motion', () => {
    const query = global.match(
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/,
    );
    expect(query).not.toBeNull();
    // Same selector as the rule it overrides, later in the file: a shorter one
    // would lose on specificity and the motion would survive the setting.
    expect(query![1]).toContain('[data-anim-in]');
    expect(query![1]).toContain('animation: none');
  });
});

describe('SC-6 reveal cascade — markup', () => {
  it('marks the public page roots and their grids', () => {
    render(
      <MemoryRouter initialEntries={['/films']}>
        <Routes>
          <Route path="/films" element={<HomePage />} />
        </Routes>
      </MemoryRouter>,
    );
    const page = screen.getByTestId('home-page');
    expect(page).toHaveAttribute('data-anim', 'stagger');
    expect(page.querySelectorAll("[data-anim='stagger']").length).toBeGreaterThan(
      0,
    );
  });

  it('marks the admin page roots', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('admin-dashboard-page')).toHaveAttribute(
      'data-anim',
      'stagger',
    );
  });

  it('remounts the outlet on navigation so the cascade replays', async () => {
    // The case that matters: /films and /series render the very same HomePage,
    // so without the key on <main> React would keep the DOM in place and the
    // cascade would never restart. A new <main> node is what replays it.
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={['/films']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/films" element={<HomePage />} />
            <Route path="/series" element={<HomePage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const before = container.querySelector('main');

    // The rail and the drawer both render the nav, hence getAllByRole.
    await user.click(screen.getAllByRole('link', { name: 'Séries' })[0]);

    const after = container.querySelector('main');
    expect(after).not.toBe(before);
    expect(after?.querySelector('[data-testid="home-page"]')).toHaveAttribute(
      'data-medium',
      'serie',
    );
  });
});

/**
 * jsdom implements MutationObserver but not IntersectionObserver, so the scroll
 * half of the hook needs a stand-in to be exercised at all. This stubs a browser
 * API the environment is missing — not app code: useReveal itself runs for real,
 * which is the point.
 */
type Entry = { target: Element; isIntersecting: boolean };
let observed: Element[] = [];
let fire: (entries: Entry[]) => void;

class FakeIntersectionObserver {
  constructor(callback: (entries: Entry[]) => void) {
    fire = callback;
  }
  observe(el: Element) {
    if (!observed.includes(el)) observed.push(el);
  }
  unobserve(el: Element) {
    observed = observed.filter((other) => other !== el);
  }
  disconnect() {
    observed = [];
  }
}

/**
 * Every rect is 0×0 in jsdom, so on/off screen has to be dictated per node.
 * Width and height come along because the hook reads them too: a node with no
 * box at all is treated differently from one that is merely further down.
 */
function placeByTestId(rects: Record<string, [number, number]>) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const [top, bottom] = rects[this.getAttribute('data-testid') ?? ''] ?? [
        0, 0,
      ];
      const height = bottom - top;
      return { top, bottom, height, width: height > 0 ? 800 : 0 } as DOMRect;
    },
  );
}

const rank = (el: Element) =>
  (el as HTMLElement).style.getPropertyValue('--anim-i');

function Harness({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, 'test');
  return <div ref={ref}>{children}</div>;
}

describe('SC-6 reveal cascade — useReveal', () => {
  beforeEach(() => {
    observed = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves a block below the fold alone even when its container is on screen', () => {
    // The regression: flagging the container revealed every child at once, so
    // Home's newsletter band — third child of a page root that is obviously on
    // screen — had finished animating before anyone scrolled down to it.
    placeByTestId({ hero: [0, 600], newsletter: [900, 1200] });
    render(
      <Harness>
        <section data-anim="stagger">
          <div data-testid="hero" />
          <div data-testid="newsletter" />
        </section>
      </Harness>,
    );
    const newsletter = screen.getByTestId('newsletter');
    expect(screen.getByTestId('hero')).toHaveAttribute('data-anim-in');
    expect(newsletter).not.toHaveAttribute('data-anim-in');
    expect(observed).toContain(newsletter);
    // Held at opacity 0 meanwhile, so the fade can start as it enters instead of
    // having to run below the fold to avoid blinking a visible block out.
    expect(newsletter).toHaveAttribute('data-anim-hold');
    expect(screen.getByTestId('hero')).not.toHaveAttribute('data-anim-hold');

    fire([{ target: newsletter, isIntersecting: true }]);
    expect(newsletter).toHaveAttribute('data-anim-in');
    expect(newsletter).not.toHaveAttribute('data-anim-hold');
    // Alone in its batch, so no delay inherited from siblings seen long ago.
    expect(rank(newsletter)).toBe('0');
    // One shot — scrolling back up must not replay it.
    expect(observed).not.toContain(newsletter);
  });

  it('never holds a block that has no box', () => {
    // `display: none` measures 0×0, which reads as off screen. Holding it would
    // pin something the reader may never scroll to at opacity 0 — the mobile FAB
    // is hidden by a media query on desktop. Observe it, but do not hide it.
    placeByTestId({ shown: [0, 100], hidden: [0, 0] });
    render(
      <Harness>
        <section data-anim="stagger">
          <div data-testid="shown" />
          <div data-testid="hidden" />
        </section>
      </Harness>,
    );
    const hidden = screen.getByTestId('hidden');
    expect(hidden).not.toHaveAttribute('data-anim-hold');
    // Still watched, so it animates if the media query ever lets it through.
    expect(observed).toContain(hidden);
  });

  it('staggers what arrives together and caps the run', () => {
    const cards = Array.from({ length: 8 }, (_, i) => `card${i}`);
    render(
      <Harness>
        <section data-anim="stagger">
          {cards.map((id) => (
            <div key={id} data-testid={id} />
          ))}
        </section>
      </Harness>,
    );
    // Nothing is on screen (all rects 0×0), so all eight go to the observer.
    fire(
      cards.map((id) => ({
        target: screen.getByTestId(id),
        isIntersecting: true,
      })),
    );
    expect(rank(screen.getByTestId('card0'))).toBe('0');
    expect(rank(screen.getByTestId('card2'))).toBe('2');
    // Past the sixth everything lands together: a 20-card archive should not
    // take two seconds to finish arriving.
    expect(rank(screen.getByTestId('card6'))).toBe('6');
    expect(rank(screen.getByTestId('card7'))).toBe('6');
  });

  it('lets a wrapper around a nested cascade step aside', () => {
    // Two fades over the same pixels would multiply their opacities, so the
    // wrapper does not animate — its header and the grid's cards do.
    render(
      <Harness>
        <section data-anim="stagger">
          <article data-testid="wrapper">
            <p data-testid="head" />
            <div data-anim="stagger" data-testid="grid">
              <a data-testid="card" />
            </div>
          </article>
        </section>
      </Harness>,
    );
    fire(
      ['head', 'card'].map((id) => ({
        target: screen.getByTestId(id),
        isIntersecting: true,
      })),
    );
    expect(screen.getByTestId('head')).toHaveAttribute('data-anim-in');
    expect(screen.getByTestId('card')).toHaveAttribute('data-anim-in');
    expect(screen.getByTestId('wrapper')).not.toHaveAttribute('data-anim-in');
    expect(screen.getByTestId('grid')).not.toHaveAttribute('data-anim-in');
  });

  it('picks up a cascade unfolded after mount', async () => {
    // A year in the bilan archive: a grid that did not exist during the first
    // pass, and would otherwise appear flat.
    function Expandable() {
      const [open, setOpen] = useState(false);
      return (
        <Harness>
          <section data-anim="stagger">
            <button type="button" onClick={() => setOpen(true)}>
              Déplier
            </button>
            {open ? (
              <div data-anim="stagger">
                <a data-testid="month" />
              </div>
            ) : null}
          </section>
        </Harness>
      );
    }
    const user = userEvent.setup();
    render(<Expandable />);
    await user.click(screen.getByRole('button', { name: 'Déplier' }));

    const month = screen.getByTestId('month');
    await waitFor(() => expect(observed).toContain(month));
    fire([{ target: month, isIntersecting: true }]);
    expect(month).toHaveAttribute('data-anim-in');
  });

  it('ignores a node appended deeper inside a block', async () => {
    // An open share menu or select dropdown owns its entrance; it is not one of
    // the page cascade's blocks and must not be swept into it.
    function WithMenu() {
      const [open, setOpen] = useState(false);
      return (
        <Harness>
          <section data-anim="stagger">
            <div data-testid="bar">
              <button type="button" onClick={() => setOpen(true)}>
                Partager
              </button>
              {open ? <ul data-testid="menu" /> : null}
            </div>
          </section>
        </Harness>
      );
    }
    const user = userEvent.setup();
    render(<WithMenu />);
    await user.click(screen.getByRole('button', { name: 'Partager' }));

    const menu = screen.getByTestId('menu');
    await waitFor(() => expect(screen.getByTestId('bar')).toBeInTheDocument());
    expect(menu).not.toHaveAttribute('data-anim-in');
    expect(observed).not.toContain(menu);
  });
});
