/** What is being shared: the page's absolute URL plus its display copy. */
export interface ShareTarget {
  url: string;
  title: string;
  /** Optional teaser — only the email body uses it. */
  excerpt?: string;
}

export type ShareChannel = 'facebook' | 'x' | 'whatsapp' | 'email';

/**
 * The four share destinations, in menu order. Each `href` is a plain intent URL
 * built from `ShareTarget` — no SDK, no script tag, no tracker: the menu renders
 * these as ordinary <a> elements. Single source of truth for share channel ↔
 * label ↔ intent URL.
 */
export const SHARE_CHANNELS: Array<{
  channel: ShareChannel;
  label: string;
  /**
   * The `d` of a single filled path on a 0 0 24 24 viewBox, drawn in
   * currentColor. Decorative — the link text carries the accessible name.
   */
  icon: string;
  /** True for the three web intents, which open in a new tab. */
  external: boolean;
  href: (target: ShareTarget) => string;
}> = [
  {
    channel: 'facebook',
    label: 'Facebook',
    icon:
      'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 ' +
      '10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 ' +
      '4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 ' +
      '0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 ' +
      '23.027 24 18.062 24 12.073z',
    external: true,
    href: ({ url }) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    channel: 'x',
    label: 'X',
    icon:
      'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 ' +
      '7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 ' +
      '3.24H4.298Z',
    external: true,
    href: ({ url, title }) =>
      `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    channel: 'whatsapp',
    label: 'WhatsApp',
    icon:
      'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15' +
      '-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463' +
      '-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606' +
      '.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371' +
      '-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51' +
      '-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 ' +
      '1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 ' +
      '4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 ' +
      '1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198' +
      '-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741' +
      '.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 ' +
      '9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 ' +
      '6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 ' +
      '12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 ' +
      '24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 ' +
      '11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z',
    external: true,
    href: ({ url, title }) =>
      `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`,
  },
  {
    channel: 'email',
    label: 'Par email',
    icon:
      'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1' +
      '-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    external: false,
    href: ({ url, title, excerpt }) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
        excerpt ? `${excerpt}\n\n${url}` : url,
      )}`,
  },
];

/**
 * Chain-link mark for the "Copier le lien" entry. That entry is an action, not
 * a destination, so it sits outside `SHARE_CHANNELS` — but its icon belongs
 * here with the others. Same 0 0 24 24 viewBox.
 */
export const COPY_LINK_ICON =
  'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 ' +
  '5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 ' +
  '3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z';

/**
 * Absolute URL for an in-app path (`/article/x`, `/bilan-culturel?mois=2026-06`).
 * Built from `window.location.origin` plus a path the caller takes from the
 * router, rather than read off `window.location.href` — which under
 * MemoryRouter would always be the test harness's own address.
 */
export function absoluteUrl(path: string): string {
  return `${window.location.origin}${path}`;
}
