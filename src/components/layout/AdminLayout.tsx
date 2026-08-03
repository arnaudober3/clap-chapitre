import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import useReveal from '../../anim/useReveal';
import { AdminPageMetaProvider } from './adminPageMeta';
import styles from './AdminLayout.module.css';

/**
 * Espace admin shell (design 6b / 6h / 7a): a sober back-office in the Salon
 * world, kept separate from the public Layout. Desktop = left rail; mobile =
 * top bar + slide-in drawer. The rail/drawer live in <AdminHeader>; pages
 * render through the <Outlet>.
 */
export default function AdminLayout() {
  // Same as the public Layout, deliberately: remounting the outlet replays the
  // cascade, and the ref arms the reveal over the subtree. The two shells are
  // near-copies — a change here belongs in Layout.tsx too.
  const { pathname, search } = useLocation();
  const routeKey = `${pathname}${search}`;

  const mainRef = useRef<HTMLElement>(null);
  useReveal(mainRef, routeKey);

  return (
    <AdminPageMetaProvider>
      <div className={styles.shell}>
        <AdminHeader />
        <div className={styles.content}>
          <main className={styles.main} key={routeKey} ref={mainRef}>
            <Outlet />
          </main>
        </div>
      </div>
    </AdminPageMetaProvider>
  );
}
