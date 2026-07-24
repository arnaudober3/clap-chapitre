import { useState } from "react";
import { Link, useLocation, useResolvedPath } from "react-router-dom";
import {
  adminPrimaryNav,
  adminPagesNav,
  adminNav,
  type AdminNavItem,
} from "./adminNav";
import { ThemeToggle } from "../ui";
import styles from "./AdminLayout.module.css";

/** True when `pathname` is the item's route (exact for /admin, prefix otherwise). */
function isItemActive(pathname: string, to: string): boolean {
  const here = pathname.toLowerCase();
  const target = to.toLowerCase();
  const end = to === "/admin";
  return here === target || (!end && here.startsWith(`${target}/`));
}

/** Compact "C" brand mark + label — reused by rail head, top bar and drawer. */
function BrandMark({ label }: { label: string }) {
  return (
    <div className={styles.brand}>
      <span className={styles.brandMark} aria-hidden="true">
        C
      </span>
      <div className={styles.brandText}>
        <span className={styles.brandTitle}>{label}</span>
        <span className={styles.brandKicker}>Espace admin</span>
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
function NavGroups({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className={styles.navSectionLabel}>Publications</div>
      <nav className={styles.navGroup} aria-label="Publications">
        {adminPrimaryNav.map((item) => (
          <AdminNavLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className={styles.navSectionLabel}>Pages du site</div>
      <nav className={styles.navGroup} aria-label="Pages du site">
        {adminPagesNav.map((item) => (
          <AdminNavLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </>
  );
}

/** "Voir le site" link + Marie-Zoé identity block, shared by rail and drawer. */
function RailFoot({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className={styles.foot}>
      <Link to="/" className={styles.backLink} onClick={onNavigate}>
        ← Voir le site
      </Link>
      <ThemeToggle />
    </div>
  );
}

export default function AdminHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);
  const { pathname } = useLocation();

  // Mobile top-bar title = the active section's label (defaults to dashboard).
  const activeItem =
    adminNav.find((item) => isItemActive(pathname, item.to)) ?? adminNav[0];

  return (
    <header className={styles.header}>
      {/* Desktop left rail */}
      <aside className={styles.rail}>
        <div className={styles.railBrand}>
          <BrandMark label="Clap et chapitre" />
        </div>
        <div className={styles.railDivider} />
        <NavGroups />
        <RailFoot />
      </aside>

      {/* Mobile top bar */}
      <div className={styles.topbar}>
        <BrandMark label={activeItem.label} />
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
          <NavGroups onNavigate={closeDrawer} />
          <RailFoot onNavigate={closeDrawer} />
        </div>
      </div>
    </header>
  );
}
