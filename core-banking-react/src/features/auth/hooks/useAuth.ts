import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../lib/redux';
import { loginThunk, logoutThunk, clearError } from '../authSlice';
import type { LoginRequest } from '../../../types/api.types';

// ============================================================
// Typed hooks for auth state with robust RBAC checks
// ============================================================

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);

  const login = (credentials: LoginRequest) => {
    return dispatch(loginThunk(credentials));
  };

  const logout = () => {
    return dispatch(logoutThunk());
  };

  const dismissError = () => {
    dispatch(clearError());
  };

  const roles = authState.user?.roles ?? [];

  const hasRole = (role: string) => {
    const cleanRole = role.replace(/^ROLE_/, '');
    return roles.some(
      (r) =>
        r === role ||
        r === cleanRole ||
        r === `ROLE_${cleanRole}` ||
        r.replace(/^ROLE_/, '') === cleanRole,
    );
  };

  const isAdmin = hasRole('ADMIN');
  const isTeller = hasRole('TELLER');
  const isAuditor = hasRole('AUDITOR');

  return {
    ...authState,
    login,
    logout,
    dismissError,
    hasRole,
    isAdmin,
    isTeller,
    isAuditor,
  };
}
