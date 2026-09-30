// ============================================================
// Auth state stored in Redux
// ============================================================

export interface AuthUser {
  username: string;
  roles: string[];
  permissions: string[];
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================================
// RBAC helpers
// ============================================================

export type AppRole = 'ADMIN' | 'TELLER' | 'AUDITOR';

export function hasRole(roles: string[], role: AppRole): boolean {
  return roles.includes(role);
}

export function isAdmin(roles: string[]): boolean {
  return hasRole(roles, 'ADMIN');
}
