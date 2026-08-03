import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { ActiveMediumProvider } from './activeMedium';
import styles from './Layout.module.css';

/**
 * Shared Salon shell: desktop rail / mobile top bar + drawer, main outlet, footer.
 *
 * The provider wraps both the header and the outlet because it carries a signal
 * that travels upward: the avis page says which medium it is showing, and the
 * rail — a sibling mounted above it — is what reads that.
 */
export default function Layout() {
  return (
    <ActiveMediumProvider>
      <div className={styles.shell}>
        <Header />
        <div className={styles.content}>
          <main className={styles.main}>
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </ActiveMediumProvider>
  );
}
