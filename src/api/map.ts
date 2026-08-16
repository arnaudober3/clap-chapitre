/**
 * Wire shapes → the shapes the components render.
 *
 * The API carries ISO values only; the French display strings are built here, on
 * arrival, by `src/format.ts`. That is the whole difference between the two
 * families of types in `shared/content.ts`, and keeping the conversion in one
 * module is what lets every component keep taking the object it always took.
 *
 * Pure functions: no hooks, no fetch, nothing to mock in a test.
 */
import { editedLabel, longDate } from '../format';
import type {
  Article,
  Bilan,
  Comment,
  PublishedArticle,
  PublishedBilan,
  WireArticle,
  WireBilan,
  WireComment,
  WirePublishedArticle,
  WirePublishedBilan,
} from '../../shared/content';

/** A live avis: its ISO date becomes "18 juillet 2026". */
export function toPublishedArticle(wire: WirePublishedArticle): PublishedArticle {
  return { ...wire, date: longDate(wire.publishedAt) };
}

/**
 * Any avis. A draft has no publication date — `date` is deliberately empty
 * rather than a dash, because the layout leaves the slot blank — and its ISO
 * edit time becomes the "Modifié il y a 2 jours" line.
 */
export function toArticle(wire: WireArticle): Article {
  if (wire.status === 'draft') {
    const { updatedAt, ...rest } = wire;
    return { ...rest, date: '', updatedLabel: editedLabel(updatedAt) };
  }
  return toPublishedArticle(wire);
}

export function toPublishedBilan(wire: WirePublishedBilan): PublishedBilan {
  return { ...wire, avis: wire.avis.map(toPublishedArticle) };
}

export function toBilan(wire: WireBilan): Bilan {
  if (wire.status === 'draft') {
    const { updatedAt, ...rest } = wire;
    return { ...rest, avis: wire.avis.map(toPublishedArticle), updatedLabel: editedLabel(updatedAt) };
  }
  return toPublishedBilan(wire);
}

/**
 * A thread entry and its reply. An entry with no date renders none — that is the
 * author's answers, which wear a badge instead — so the empty string here is a
 * rendering decision, not a missing value.
 */
export function toComment(wire: WireComment): Comment {
  return {
    ...wire,
    date: longDate(wire.date),
    reply: wire.reply ? toComment(wire.reply) : undefined,
  };
}
