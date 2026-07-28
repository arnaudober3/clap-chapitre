/**
 * Reordering rules for the bilan editor's coups de cœur. Pure functions on the
 * `highlights` array — no React, no mutation: each returns the *same* array
 * reference when the move is a no-op, so a drag hovering its own card doesn't
 * restart the render loop.
 *
 * The order is editorial, not structural: a bilan can read livre, film, livre
 * if that is how the month is best told. Nothing is grouped by medium — each
 * card carries its own colour band and chip instead.
 */
import type { Highlight } from './HighlightCard';

/** Move `fromId` to `toId`'s position. No-op on unknown ids or on itself. */
export function moveTo(list: Highlight[], fromId: string, toId: string): Highlight[] {
  if (fromId === toId) return list;
  const from = list.findIndex((item) => item.id === fromId);
  const to = list.findIndex((item) => item.id === toId);
  if (from === -1 || to === -1) return list;

  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Move `id` one place up (-1) or down (+1) — the keyboard counterpart of a
 * drag, and the only way to reorder without a pointer. No-op at either end.
 */
export function moveByOne(list: Highlight[], id: string, delta: -1 | 1): Highlight[] {
  const from = list.findIndex((item) => item.id === id);
  if (from === -1) return list;
  const target = list[from + delta];
  return target ? moveTo(list, id, target.id) : list;
}
