import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../lib/redux';
import { loginThunk, logoutThunk, clearError } from '../authSlice';
import type { LoginRequest } from '../../../types/api.types';

// ============================================================
// Typed hooks for auth state
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

  const isAdmin = authState.user?.roles?.includes('ADMIN') ?? false;
  const isTeller = authState.user?.roles?.includes('TELLER') ?? false;
  const isAuditor = authState.user?.roles?.includes('AUDITOR') ?? false;

  return {
    ...authState,
    login,
    logout,
    dismissError,
    isAdmin,
    isTeller,
    isAuditor,
  };
}
