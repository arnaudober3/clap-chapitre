import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { primaryNav, secondaryNav, drawerNav, type NavItem } from './nav';
import { ThemeToggle } from '../ui';
import styles from './Layout.module.css';

/**
 * Feed routes = the home route plus each medium route (derived from primaryNav so
 * the list never drifts from the nav model). The mobile medium tab strip is the
 * feed's switcher, so it renders only on these paths.
 */
const feedRoutes = new Set<string>(['/', ...primaryNav.map((item) => item.to)]);

/** Brand wordmark: "Clap et chapitre" with an italic terracotta "et". */
function Brand({ stacked, onNavigate }: { stacked?: boolean; onNavigate?: () => void }) {
  return (
    <div className={styles.brand}>
      <Link to="/" className={styles.wordmark} onClick={onNavigate}>
        Clap <span className={styles.brandEt}>et</span>
        {stacked ? <br /> : ' '}
        chapitre
      </Link>
      <span className={styles.underlineMark} aria-hidden="true" />
      <div className={styles.tagline}>Trouve ta prochaine histoire</div>
    </div>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
}

function tabClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.mediumTab} ${styles.mediumTabActive}` : styles.mediumTab;
}

/**
 * Mobile-only medium tab strip below the top bar. Reuses primaryNav so the tab
 * matching the current route gets the active treatment (via NavLink). Hidden at
 * desktop widths where the left rail already carries the medium nav.
 */
function MediumTabs() {
  return (
    <nav className={styles.mediumTabs} aria-label="Médias">
      {primaryNav.map((item) => (
        <NavLink key={item.to} to={item.to} className={tabClass}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** A NavLink that shows the active gold dot when current. */
function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink to={item.to} className={navLinkClass} onClick={onNavigate} end={item.to === '/'}>
      <span className={styles.navDot} aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

function NavGroups({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav className={styles.navGroup} aria-label="Médias">
        {primaryNav.map((item) => (
          <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className={styles.navDivider} />
      <nav className={styles.navGroup} aria-label="Pages">
        {secondaryNav.map((item) => (
          <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </>
  );
}

/**
 * Mobile drawer nav: a single flat list (Accueil + standalone pages, per design
 * frame 3a). No media links and no divider — the mediums live in the tab strip.
 */
function DrawerNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className={styles.navGroup} aria-label="Menu">
      {drawerNav.map((item) => (
        <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);
  const { pathname } = useLocation();
  const isFeedRoute = feedRoutes.has(pathname);

  return (
    <header className={styles.header}>
      {/* Desktop left rail */}
      <aside className={styles.rail}>
        <div className={styles.railBrand}>
          <Brand stacked />
        </div>
        <NavGroups />
        <div className={styles.railFoot}>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className={styles.topbar}>
        <button
          type="button"
          className={styles.hamburger}
          aria-label="Ouvrir le menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          ☰
        </button>
        <Link to="/" className={styles.topbarWordmark}>
          Clap <span className={styles.brandEt}>et</span> chapitre
        </Link>
        <span className={styles.topbarSpacer} aria-hidden="true" />
      </div>

      {/* Mobile medium tab strip (feed routes only; hidden on desktop) */}
      {isFeedRoute && <MediumTabs />}

      {/* Mobile drawer overlay */}
      <div className={drawerOpen ? `${styles.drawerRoot} ${styles.drawerOpen}` : styles.drawerRoot}>
        <div className={styles.scrim} onClick={closeDrawer} aria-hidden="true" />
        <div
          className={styles.drawer}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
          aria-hidden={!drawerOpen}
        >
          <div className={styles.drawerHead}>
            <Brand stacked onNavigate={closeDrawer} />
            <button
              type="button"
              className={styles.close}
              aria-label="Fermer le menu"
              onClick={closeDrawer}
            >
              ✕
            </button>
          </div>
          <DrawerNav onNavigate={closeDrawer} />
          <div className={styles.drawerFoot}>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
