import { type ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { forceLogout, isLogoutTargetingCurrentUser, getLogoutTargetInfo } from '../../features/auth/authSlice';
import { clearBankingMemoryCache } from '../../hooks/useBankingData';
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
    const handleLogoutSync = (reason?: string | null) => {
      if (reason) {
        sessionStorage.setItem('cb_logout_reason', reason);
      }
      clearBankingMemoryCache();
      dispatch(forceLogout());
      const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
      navigate(`/login${query}`, { replace: true });
    };

    const channel = new BroadcastChannel('staff_auth_sync');
    channel.onmessage = (event: MessageEvent) => {
      if (isLogoutTargetingCurrentUser(event.data, user?.username)) {
        const { reason } = getLogoutTargetInfo(event.data);
        handleLogoutSync(reason);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === 'staff_auth_logout_trigger' &&
        isLogoutTargetingCurrentUser(event.newValue, user?.username)
      ) {
        const { reason } = getLogoutTargetInfo(event.newValue);
        handleLogoutSync(reason);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [dispatch, navigate, user?.username]);

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

  if (!isAuthenticated) {
    const reason = sessionStorage.getItem('cb_logout_reason');
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return <Navigate to={`/login${query}`} replace />;
  }

  if (!hasRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
