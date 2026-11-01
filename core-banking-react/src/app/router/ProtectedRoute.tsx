import { type ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
}

// Token ဖျက်ပြီးမှ Login ကို ညွှန်းပေးမယ့် Helper Component
function RoleRedirect({ logout }: { logout: () => void }) {
  useEffect(() => {
    if (logout) {
      logout();
    }
  }, [logout]);
  
  return <Navigate to="/login" replace />;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, logout } = useAuth();

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
      // Permission မရှိရင် Token ဖျက်ပြီး Login ပြန်ဝင်ခိုင်းမယ်
      return <RoleRedirect logout={logout} />;
    }
  }

  return <>{children}</>;
}