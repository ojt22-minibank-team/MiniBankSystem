import { Navigate, type ReactNode } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

/**
 * Guards a route by checking:
 * 1. isAuthenticated — token present and auth state loaded
 * 2. requiredRole — user must have the specified role (e.g. 'ADMIN')
 *
 * Unauthenticated users are redirected to /login.
 * Authenticated users without the required role are redirected to /login.
 */
export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !user?.roles?.includes(requiredRole)) {
    // Authenticated but wrong role — send back to login
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
