/**
 * Sets the per-route document head: title, meta description, canonical link,
 * Open Graph + Twitter Card tags, and (optionally) a JSON-LD script.
 *
 * No provider, no context, no dependency: each helper below targets one fixed
 * selector and updates it in place (or removes it when the value is
 * `undefined`), so a page mounting after another simply overwrites the same
 * handful of tags rather than accumulating new ones. That is also what makes
 * `og:image` disappear when a cover is `''` — passing `image: undefined`
 * removes the tag instead of pointing at a placeholder.
 *
 * `react-helmet-async` solves a problem this app doesn't have (deduplicating
 * concurrent SSR renders) — see the SEO plan for the fuller reasoning. This
 * hook is the house-style equivalent of `AdminPageMetaProvider`
 * (`src/components/layout/adminPageMeta.tsx`), aimed at `document.head`
 * instead of a context.
 */
import { useEffect } from 'react';
import { DEFAULT_TITLE, SITE_NAME, SITE_URL, titleTemplate } from './constants';

export interface SeoInput {
  title: string;
  description?: string;
  /** Path (with query string if relevant), e.g. '/article/un-dernier-ete'. */
  path: string;
  /** Absolute URL. Omitted entirely — not a placeholder — when there is none. */
  image?: string;
  type?: 'website' | 'article';
  /** Admin routes and the 404 page: kept out of the index, no canonical. */
  noindex?: boolean;
  jsonLd?: object | object[];
}

const JSONLD_ID = 'seo-jsonld';

function setMeta(attr: 'name' | 'property', key: string, content: string | undefined): void {
  const selector = `meta[${attr}="${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (!content) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.head.appendChild(document.createElement('meta'));
  el.setAttribute(attr, key);
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string | undefined): void {
  const existing = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!href) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.head.appendChild(document.createElement('link'));
  el.setAttribute('rel', rel);
  el.setAttribute('href', href);
}

function setJsonLd(data: object | object[] | undefined): void {
  const existing = document.getElementById(JSONLD_ID) as HTMLScriptElement | null;
  if (!data) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.head.appendChild(document.createElement('script'));
  el.id = JSONLD_ID;
  el.setAttribute('type', 'application/ld+json');
  // textContent, never innerHTML: this is untrusted-ish content (an excerpt,
  // an author name) and textContent needs no escaping to stay inert.
  el.textContent = JSON.stringify(data);
}

export function useSeo(input: SeoInput): void {
  const { title, description, path, image, type = 'website', noindex, jsonLd } = input;
  // JSON-serialised so an inline object/array literal (a new reference every
  // render) doesn't re-run the effect on every render — only on a real change.
  const jsonLdKey = JSON.stringify(jsonLd ?? null);

  useEffect(() => {
    document.title = titleTemplate(title);

    setMeta('name', 'description', description);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : undefined);
    setLink('canonical', noindex ? undefined : `${SITE_URL}${path}`);

    setMeta('property', 'og:title', title === DEFAULT_TITLE ? undefined : title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', `${SITE_URL}${path}`);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:image', image);

    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', title === DEFAULT_TITLE ? undefined : title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);

    setJsonLd(jsonLd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, type, noindex, jsonLdKey]);
}
