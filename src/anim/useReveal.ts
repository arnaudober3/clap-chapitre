import { useLayoutEffect, type RefObject } from 'react';

/** Containers opt in by carrying data-anim — the hook never touches anything else. */
const CONTAINER = "[data-anim='stagger']";

/** Past this rank a batch lands together: 20 cards must not take two seconds. */
const MAX_RANK = 6;

/**
 * The blocks a container staggers: its direct children — except that a child
 * which wraps another cascade steps aside and lets its own contents animate
 * instead. Two fades over the same pixels would multiply their opacities, and
 * the wrapper is usually a layout box with nothing of its own to show.
 *
 * Recursive rather than depth-limited, so "Avis récents" (a plain <section>
 * around a marked grid) resolves to its header plus each card, and nobody has
 * to hardcode how deeply the markup nests.
 */
function blocksOf(container: Element): Element[] {
  const found: Element[] = [];
  for (const child of Array.from(container.children)) {
    if (child.matches(CONTAINER) || child.querySelector(CONTAINER)) {
      found.push(...blocksOf(child));
    } else {
      found.push(child);
    }
  }
  return found;
}

/** IntersectionObserver hands entries back in no particular order. */
function inDocumentOrder(a: Element, b: Element): number {
  const position = a.compareDocumentPosition(b);
  return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

/**
 * Reveals blocks as they are seen. The CSS in global.css animates nothing until
 * `data-anim-in` lands on a block, so the flag this hook adds is the trigger —
 * and its absence is the safe state: a block that is never reached renders
 * plainly rather than staying at opacity 0.
 *
 * Blocks are revealed in batches, and the rank inside a batch is what staggers
 * them. That is the whole point of doing this per block rather than per
 * container: whatever crosses into view together cascades together, while a
 * lone section arriving on its own starts immediately instead of waiting out a
 * delay earned by siblings the reader saw ages ago.
 *
 * Everything already on screen forms the first batch, flagged synchronously
 * inside a layout effect so it lands before the browser paints — going through
 * the observer instead would show those blocks for one frame and only then
 * animate them, which reads as a flicker.
 *
 * Revealing is one-shot: scrolling back up replays nothing.
 *
 * `revision` re-runs the whole setup. Both shells key their <main> on the
 * location, so the element under `ref` is a new node after every navigation —
 * passing the same key here is what re-arms the hook on the new subtree.
 */
export default function useReveal(
  ref: RefObject<HTMLElement>,
  revision: string,
): void {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const revealBatch = (batch: Element[]) => {
      batch.sort(inDocumentOrder).forEach((el, rank) => {
        if (el instanceof HTMLElement) {
          el.style.setProperty('--anim-i', String(Math.min(rank, MAX_RANK)));
        }
        el.removeAttribute('data-anim-hold');
        el.setAttribute('data-anim-in', '');
      });
    };

    const blocks = blocksOf(root);

    // jsdom has no IntersectionObserver, and neither do very old browsers.
    // Reveal everything at once rather than leave the page unanimated.
    if (typeof IntersectionObserver === 'undefined') {
      revealBatch(blocks);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const arrived = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target);
        if (arrived.length === 0) return;
        arrived.forEach((el) => observer.unobserve(el));
        revealBatch(arrived);
      },
      // Fire just after a block starts entering, not before: it is already held
      // at opacity 0, so there is nothing to blink out, and the run should play
      // where the reader can see it. Triggering early instead would finish the
      // fade below the fold and the block would simply appear, done.
      { rootMargin: '0px 0px -5% 0px' },
    );

    const track = (found: Element[]) => {
      const visible: Element[] = [];
      for (const el of found) {
        if (el.hasAttribute('data-anim-in')) continue;

        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          visible.push(el);
          continue;
        }

        // Hold it at opacity 0 until it is reached. Set here rather than in a
        // stylesheet so nothing is ever hidden unless this hook is running: if
        // the JS fails, no block is held and the page renders whole. Inside a
        // layout effect, so it lands before the first paint.
        //
        // Except when the block has no box at all: `display: none` measures as
        // 0×0, which reads as "off screen" and would hold something the reader
        // may never scroll to — the mobile FAB, hidden by a media query on
        // desktop. Observe it anyway, so it still animates if it ever appears.
        if (rect.width > 0 || rect.height > 0) {
          el.setAttribute('data-anim-hold', '');
        }
        observer.observe(el);
      }
      if (visible.length > 0) revealBatch(visible);
    };

    track(blocks);

    // Sections the reader unfolds after mount — a year in the bilan archive, the
    // newsletter scheduling panel — are nodes that did not exist during the pass
    // above. Without this they would render correctly but flat, never flagged.
    const mutations = new MutationObserver((records) => {
      const added: Element[] = [];
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (!(node instanceof Element)) continue;

          // A whole cascade arrived — an unfolded year brings its grid of month
          // cards. Its blocks are the new ones; the year header above it was
          // revealed long ago and must not be dragged through a second fade.
          if (node.matches(CONTAINER) || node.querySelector(CONTAINER)) {
            added.push(...blocksOf(node));
            continue;
          }

          // A single node arrived inside an existing cascade. Only animate it if
          // it genuinely is one of that cascade's blocks: plenty of things get
          // appended deeper in the tree — an open share menu, a select dropdown —
          // and those own their entrance, they are not part of the page cascade.
          const container = node.parentElement?.closest(CONTAINER);
          if (container && blocksOf(container).includes(node)) added.push(node);
        }
      }
      if (added.length > 0) track(added);
    });
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [ref, revision]);
}
