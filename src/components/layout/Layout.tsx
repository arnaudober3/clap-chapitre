import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { ActiveMediumProvider } from './activeMedium';
import useReveal from '../../anim/useReveal';
import styles from './Layout.module.css';

/**
 * Shared Salon shell: desktop rail / mobile top bar + drawer, main outlet, footer.
 *
 * The provider wraps both the header and the outlet because it carries a signal
 * that travels upward: the avis page says which medium it is showing, and the
 * rail — a sibling mounted above it — is what reads that.
 */
export default function Layout() {
  // Keying <main> on the location remounts the outlet on every navigation, so
  // the cascade replays even when the same component stays on screen: /films →
  // /series renders the very same HomePage. `search` is in the key because
  // BilanCulturel is the one-page driven by a query param (?mois=).
  const { pathname, search } = useLocation();
  const routeKey = `${pathname}${search}`;

  // Arms the reveal over the whole outlet subtree — no page has to know.
  const mainRef = useRef<HTMLElement>(null);
  useReveal(mainRef, routeKey);

  // The avis view ends in a comment thread whose composer is a bar fixed to
  // the viewport bottom below lg — .content needs room reserved so it doesn't
  // cover the footer. No other route renders that fixed composer.
  const hasFixedComposer = pathname.startsWith('/article/');
  const contentClass = hasFixedComposer
    ? `${styles.content} ${styles.contentWithComposer}`
    : styles.content;

  return (
    <ActiveMediumProvider>
      <div className={styles.shell}>
        <Header />
        <div className={contentClass}>
          <main className={styles.main} key={routeKey} ref={mainRef}>
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </ActiveMediumProvider>
  );
}
