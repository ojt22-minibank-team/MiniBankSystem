import { type ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { forceLogout } from '../../features/auth/authSlice';
import type { AppDispatch } from '../../lib/redux';
import { useAuth } from '../../features/auth/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogoutSync = () => {
      dispatch(forceLogout());
      navigate('/login', { replace: true });
    };

    const channel = new BroadcastChannel('staff_auth_sync');
    channel.onmessage = (event: MessageEvent) => {
      if (event.data === 'LOGOUT') {
        handleLogoutSync();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'staff_auth_logout_trigger') {
        handleLogoutSync();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [dispatch, navigate]);

  const hasRole = !requiredRole || (() => {
    const rolesToCheck = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return rolesToCheck.some((reqRole) => {
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
  })();

  useEffect(() => {
    if (isAuthenticated && !hasRole) {
      dispatch(forceLogout());
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, hasRole, dispatch, navigate]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole) {
    return null;
  }

  return <>{children}</>;
}
