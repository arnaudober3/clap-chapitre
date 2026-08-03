/** Navigation model for the Espace admin shell (design frames 6b / 7a). */

export interface AdminNavItem {
  label: string;
  to: string;
  /** Optional count shown as a pill badge (e.g. published articles). */
  badge?: number;
}

/** Publications group — editorial sections. Only "Tableau de bord" is wired. */
export const adminPrimaryNav: AdminNavItem[] = [
  { label: 'Tableau de bord', to: '/admin' },
  { label: 'Articles', to: '/admin/articles', badge: 32 },
  { label: 'Bilans culturels', to: '/admin/bilans', badge: 14 },
  // Comments arrive in moderation and are invisible until released. Without a
  // destination here the queue would fill up with no way in.
  { label: 'Commentaires', to: '/admin/commentaires' },
  { label: 'Newsletter', to: '/admin/newsletter' },
];

/** "Pages du site" group — public pages edited from the back-office. */
export const adminPagesNav: AdminNavItem[] = [
  { label: 'À propos', to: '/admin/a-propos' },
  { label: 'Me suivre', to: '/admin/me-suivre' },
];

/** Flat list of every admin destination — drawer nav + active-title lookup. */
export const adminNav: AdminNavItem[] = [...adminPrimaryNav, ...adminPagesNav];
