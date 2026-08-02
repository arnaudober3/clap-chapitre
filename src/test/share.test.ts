import { describe, it, expect } from 'vitest';
import { SHARE_CHANNELS, absoluteUrl, type ShareTarget } from '../share';

/** A title with a typographic apostrophe and accents — the encoding trap. */
const target: ShareTarget = {
  url: 'https://clap-chapitre.pages.dev/article/l-annee-de-la-pluie',
  title: 'L’année de la pluie',
  excerpt: 'Un été qui ne finit pas.',
};

/** `entry.href(target)` for one channel. */
function hrefFor(channel: string, from: ShareTarget = target): string {
  const entry = SHARE_CHANNELS.find((c) => c.channel === channel)!;
  expect(entry).toBeTruthy();
  return entry.href(from);
}

describe('SHARE channels', () => {
  it('lists Facebook, X, WhatsApp and email, each with a label and an icon path', () => {
    expect(SHARE_CHANNELS.map((c) => c.channel)).toEqual([
      'facebook',
      'x',
      'whatsapp',
      'email',
    ]);
    for (const entry of SHARE_CHANNELS) {
      expect(entry.label).toBeTruthy();
      // A single filled path: starts on a move-to, holds only path syntax.
      expect(entry.icon).toMatch(/^M[\d.]/);
      expect(entry.icon).toMatch(/^[MmLlHhVvCcSsQqTtAaZz\d\s.,-]+$/);
    }
    // Only the three web intents leave the site in a new tab.
    expect(SHARE_CHANNELS.filter((c) => c.external).map((c) => c.channel)).toEqual([
      'facebook',
      'x',
      'whatsapp',
    ]);
  });

  it('builds the Facebook, X and WhatsApp intent URLs over https', () => {
    expect(hrefFor('facebook')).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(target.url)}`,
    );
    expect(hrefFor('x')).toBe(
      `https://x.com/intent/post?url=${encodeURIComponent(target.url)}` +
        `&text=${encodeURIComponent(target.title)}`,
    );
    expect(hrefFor('whatsapp')).toBe(
      `https://wa.me/?text=${encodeURIComponent(`${target.title} — ${target.url}`)}`,
    );
  });

  it('builds a mailto: with the title as subject and the excerpt above the link', () => {
    const href = hrefFor('email');
    expect(href.startsWith('mailto:?')).toBe(true);
    const params = new URLSearchParams(href.slice('mailto:?'.length));
    expect(params.get('subject')).toBe(target.title);
    expect(params.get('body')).toBe(`${target.excerpt}\n\n${target.url}`);
  });

  it('falls back to the bare URL as email body when there is no excerpt', () => {
    const href = hrefFor('email', { url: target.url, title: target.title });
    const params = new URLSearchParams(href.slice('mailto:?'.length));
    expect(params.get('body')).toBe(target.url);
  });

  it('percent-encodes every interpolated value, so no raw separator leaks in', () => {
    const tricky: ShareTarget = {
      url: 'https://example.test/article/a?b=1&c=2',
      title: 'Titre & « suite » — 100 %',
    };
    for (const entry of SHARE_CHANNELS) {
      const href = entry.href(tricky);
      // Everything after the first '?' is one well-formed query string: the
      // raw '&' and '?' of the title and URL must not have survived.
      const query = href.slice(href.indexOf('?') + 1);
      const values = [...new URLSearchParams(query).values()];
      expect(values.some((v) => v.includes(tricky.url))).toBe(true);
    }
  });
});

describe('SHARE absoluteUrl', () => {
  it('prefixes an in-app path with the current origin', () => {
    expect(absoluteUrl('/article/un-dernier-ete')).toBe(
      `${window.location.origin}/article/un-dernier-ete`,
    );
    expect(absoluteUrl('/bilan-culturel?mois=2026-06')).toBe(
      `${window.location.origin}/bilan-culturel?mois=2026-06`,
    );
  });
});
