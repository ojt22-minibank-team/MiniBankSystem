import React, { createContext, useContext, useState, useEffect } from 'react';

interface StaffUser {
  id?: number | string;
  username: string;
  fullName?: string;
  role?: string;
  token?: string;
}

interface AuthContextValue {
  token: string | null;
  user: StaffUser | null;
  isAuthenticated: boolean;
  login: (token: string, userData: Partial<StaffUser>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<StaffUser | null>(() => {
    const saved = localStorage.getItem('staff_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = (newToken: string, userData: Partial<StaffUser>) => {
    localStorage.setItem('token', newToken);
    const completeUser: StaffUser = {
      username: userData.username || 'staff_teller',
      fullName: userData.fullName || userData.username || 'Bank Officer',
      role: userData.role || 'ROLE_STAFF',
      id: userData.id || 1,
      ...userData,
    };
    localStorage.setItem('staff_user', JSON.stringify(completeUser));
    setToken(newToken);
    setUser(completeUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('staff_user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    // If no token exists on load, we can set default mock user for convenience or keep unauthenticated
    // Check if token exists in localStorage
    const savedToken = localStorage.getItem('token');
    if (savedToken && !user) {
      const savedUser = localStorage.getItem('staff_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // fallback
        }
      }
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
