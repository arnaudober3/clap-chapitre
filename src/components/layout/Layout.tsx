import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import styles from './Layout.module.css';

/** Shared Salon shell: desktop rail / mobile top bar + drawer, main outlet, footer. */
export default function Layout() {
  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.content}>
        <main className={styles.main}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
