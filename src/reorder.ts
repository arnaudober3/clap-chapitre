/**
 * Reordering rules shared by the admin editors that let the author arrange a
 * list by hand — the bilan's coups de cœur (design 6d) and the "Me suivre"
 * links (design 6g).
 *
 * Pure functions on any array of id-carrying items — no React, no mutation:
 * each returns the *same* array reference when the move is a no-op, so a drag
 * hovering its own row doesn't restart the render loop.
 */

/** Anything these helpers can move: a list item with a stable id. */
export interface Reorderable {
  id: string;
}

/** Move `fromId` to `toId`'s position. No-op on unknown ids or on itself. */
export function moveTo<T extends Reorderable>(
  list: T[],
  fromId: string,
  toId: string,
): T[] {
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
export function moveByOne<T extends Reorderable>(
  list: T[],
  id: string,
  delta: -1 | 1,
): T[] {
  const from = list.findIndex((item) => item.id === id);
  if (from === -1) return list;
  const target = list[from + delta];
  return target ? moveTo(list, id, target.id) : list;
}
