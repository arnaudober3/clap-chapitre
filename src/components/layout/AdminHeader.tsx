import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useResolvedPath,
} from "react-router-dom";
import {
  adminPrimaryNav,
  adminPagesNav,
  adminNav,
  type AdminNavItem,
} from "./adminNav";
import { ThemeToggle } from "../ui";
import { useAuth } from "../../auth/AuthContext";
import { useAdminKicker } from "./adminPageMeta";
import { useAdminArticles, useAdminBilans, useAdminComments } from "../../api/admin";
import { onArticlesChanged, onBilansChanged } from "../../api/adminEvents";
import { DEFAULT_QUERY, DEFAULT_BILAN_QUERY } from "../../content/query";
import styles from "./AdminLayout.module.css";

/** True when `pathname` is the item's route (exact for /admin, prefix otherwise). */
function isItemActive(pathname: string, to: string): boolean {
  const here = pathname.toLowerCase();
  const target = to.toLowerCase();
  const end = to === "/admin";
  return here === target || (!end && here.startsWith(`${target}/`));
}

/**
 * Compact "C" brand mark + label — reused by rail head, top bar and drawer.
 * `kicker` overrides the default "Espace admin" line: on mobile the top bar
 * doubles as the page header (design 8b), so it carries the page's own summary
 * and drops the uppercase treatment.
 */
function BrandMark({ label, kicker }: { label: string; kicker?: string }) {
  return (
    <div className={styles.brand}>
      <span className={styles.brandMark} aria-hidden="true">
        C
      </span>
      <div className={styles.brandText}>
        <span className={styles.brandTitle}>{label}</span>
        <span className={kicker ? `${styles.brandKicker} ${styles.brandKickerPlain}` : styles.brandKicker}>
          {kicker ?? 'Espace admin'}
        </span>
      </div>
    </div>
  );
}

/** A single admin nav link with active treatment, optional badge, and gold dot. */
function AdminNavLink({
  item,
  onNavigate,
}: {
  item: AdminNavItem;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const { pathname: toPathname } = useResolvedPath(item.to);
  const isActive = isItemActive(pathname, toPathname);

  return (
    <Link
      to={item.to}
      className={
        isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
      }
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
    >
      <span className={styles.navLabel}>{item.label}</span>
      {item.badge !== undefined && (
        <span
          className={
            isActive ? `${styles.badge} ${styles.badgeActive}` : styles.badge
          }
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

/** Publications + Pages du site groups, shared by rail and drawer. */
function NavGroups({
  primaryNav,
  onNavigate,
}: {
  primaryNav: AdminNavItem[];
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className={styles.navSectionLabel}>Publications</div>
      <nav className={styles.navGroup} aria-label="Publications">
        {primaryNav.map((item) => (
          <AdminNavLink item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className={styles.navSectionLabel}>Pages du site</div>
      <nav className={styles.navGroup} aria-label="Pages du site">
        {adminPagesNav.map((item) => (
          <AdminNavLink item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </>
  );
}

/** "Voir le site" link, sign-out and theme toggle, shared by rail and drawer. */
function RailFoot({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // Signing out drops the token, which makes RequireAuth reject every /admin
  // path — going to the login page ourselves keeps the transition explicit.
  function onSignOut() {
    onNavigate?.();
    signOut();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className={styles.foot}>
      <div className={styles.footRow}>
        <Link to="/" className={styles.backLink} onClick={onNavigate}>
          ← Voir le site
        </Link>
        {/* Icon only: the label would double the height of the foot for an
            action taken once a session. The name lives in aria-label/title. */}
        <button
          type="button"
          className={styles.footAction}
          onClick={onSignOut}
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <span aria-hidden="true">⏻</span>
        </button>
      </div>
      <ThemeToggle />
    </div>
  );
}

export default function AdminHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);
  const { pathname } = useLocation();
  const pageKicker = useAdminKicker();
  const { data: moderation } = useAdminComments('pending', 1, 1);
  const { data: articles, reload: reloadArticles } = useAdminArticles(DEFAULT_QUERY, 1);
  const { data: bilans, reload: reloadBilans } = useAdminBilans(DEFAULT_BILAN_QUERY, 1);

  // The header mounts once for the whole admin session, so its counts would
  // otherwise go stale the moment a form elsewhere creates, publishes or
  // deletes something — see adminEvents.ts.
  useEffect(() => onArticlesChanged(reloadArticles), [reloadArticles]);
  useEffect(() => onBilansChanged(reloadBilans), [reloadBilans]);

  const primaryNav = useMemo(
    () =>
      adminPrimaryNav.map((item) => {
        if (item.to === '/admin/commentaires') {
          return moderation?.pending ? { ...item, badge: moderation.pending } : item;
        }
        if (item.to === '/admin/articles') {
          return { ...item, badge: articles?.catalogue.total ?? 0 };
        }
        if (item.to === '/admin/bilans') {
          return { ...item, badge: bilans?.catalogue.published ?? 0 };
        }
        return item;
      }),
    [moderation?.pending, articles?.catalogue.total, bilans?.catalogue.published],
  );

  // Mobile top-bar title = the active section's label (defaults to dashboard).
  const activeItem =
    adminNav.find((item) => isItemActive(pathname, item.to)) ?? adminNav[0];

  return (
    <header>
      {/* Desktop left rail */}
      <aside className={styles.rail}>
        <div className={styles.railBrand}>
          <BrandMark label="Clap et chapitre" />
        </div>
        <div className={styles.railDivider} />
        <NavGroups primaryNav={primaryNav} />
        <RailFoot />
      </aside>

      {/* Mobile top bar — the active section over the page's own summary. */}
      <div className={styles.topbar}>
        <BrandMark label={activeItem.label} kicker={pageKicker} />
        <button
          type="button"
          className={styles.hamburger}
          aria-label="Ouvrir le menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          ☰
        </button>
      </div>

      {/* Mobile drawer overlay */}
      <div
        className={
          drawerOpen
            ? `${styles.drawerRoot} ${styles.drawerOpen}`
            : styles.drawerRoot
        }
      >
        <div
          className={styles.scrim}
          onClick={closeDrawer}
          aria-hidden="true"
        />
        <div
          className={styles.drawer}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de l’espace admin"
          aria-hidden={!drawerOpen}
        >
          <div className={styles.drawerHead}>
            <BrandMark label="Clap et chapitre" />
            <button
              type="button"
              className={styles.close}
              aria-label="Fermer le menu"
              onClick={closeDrawer}
            >
              ✕
            </button>
          </div>
          <NavGroups primaryNav={primaryNav} onNavigate={closeDrawer} />
          <RailFoot onNavigate={closeDrawer} />
        </div>
      </div>
    </header>
  );
}
