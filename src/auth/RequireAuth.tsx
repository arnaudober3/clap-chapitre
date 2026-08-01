import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

/**
 * Route guard for the admin shell. An anonymous visitor is sent to
 * /admin/login, with the requested location stashed in the navigation state so
 * the login page can land them where they were headed.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'anonymous') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
