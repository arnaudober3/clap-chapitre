/** Shared navigation model for the Salon layout. */

export interface NavItem {
  label: string;
  to: string;
}

/** Primary nav = medium filters (each has its own route, reusing the feed). */
export const primaryNav: NavItem[] = [
  { label: 'Films', to: '/films' },
  { label: 'Séries', to: '/series' },
  { label: 'Livres', to: '/livres' },
  { label: 'Docs', to: '/docs' },
];

/** Secondary nav = standalone pages. */
export const secondaryNav: NavItem[] = [
  { label: 'Bilan culturel', to: '/bilan-culturel' },
  { label: 'À propos', to: '/a-propos' },
  { label: 'Me suivre', to: '/me-suivre' },
];

/**
 * Mobile drawer nav = a home link followed by the standalone pages, as a single
 * flat list (design frame 3a). The medium filters live only in the top-bar tab
 * strip on mobile, so they are intentionally absent here.
 */
export const drawerNav: NavItem[] = [{ label: 'Accueil', to: '/' }, ...secondaryNav];
