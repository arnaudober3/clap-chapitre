import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { primaryNav, secondaryNav, type NavItem } from './nav';
import styles from './Layout.module.css';

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

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <header className={styles.header}>
      {/* Desktop left rail */}
      <aside className={styles.rail}>
        <div className={styles.railBrand}>
          <Brand stacked />
        </div>
        <NavGroups />
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
          <NavGroups onNavigate={closeDrawer} />
        </div>
      </div>
    </header>
  );
}
