import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import useReveal from '../../anim/useReveal';
import styles from './Layout.module.css';

/** Shared Salon shell: desktop rail / mobile top bar + drawer, main outlet, footer. */
export default function Layout() {
  // Keying <main> on the location remounts the outlet on every navigation, so
  // the cascade replays even when the same component stays on screen: /films →
  // /series renders the very same HomePage. `search` is in the key because
  // BilanCulturel is the one page driven by a query param (?mois=).
  const { pathname, search } = useLocation();
  const routeKey = `${pathname}${search}`;

  // Arms the reveal over the whole outlet subtree — no page has to know.
  const mainRef = useRef<HTMLElement>(null);
  useReveal(mainRef, routeKey);

  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.content}>
        <main className={styles.main} key={routeKey} ref={mainRef}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
