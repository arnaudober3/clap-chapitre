import { useSeo, type SeoInput } from './useSeo';

/** Declarative wrapper around `useSeo`, dropped in a page's JSX like `PageError`/`PageLoading`. */
export function Seo(props: SeoInput): null {
  useSeo(props);
  return null;
}
