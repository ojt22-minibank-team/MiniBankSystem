import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
}

/**
 * Guards a route by checking:
 * 1. isAuthenticated — token present and auth state loaded
 * 2. requiredRole — user must have at least one of the specified roles (e.g. 'ADMIN' or ['ADMIN', 'AUDITOR'])
 *
 * Unauthenticated users are redirected to /login.
 * Authenticated users without the required role are redirected to /unauthorized.
 */
export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const rolesToCheck = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = rolesToCheck.some((reqRole) => {
      const cleanReq = reqRole.replace(/^ROLE_/, '');
      return user?.roles?.some((r) => {
        const cleanRole = r.replace(/^ROLE_/, '');
        return (
          r === reqRole ||
          r === `ROLE_${cleanReq}` ||
          cleanRole === cleanReq
        );
      });
    });

    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
