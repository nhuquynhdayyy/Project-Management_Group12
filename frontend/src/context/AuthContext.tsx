import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { logout } from '../api/auth';
import type { LoginResponse } from '../types';

interface AuthUser {
  id: number;
  username: string;
  roles: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  signIn: (data: LoginResponse) => void;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('access_token'),
  );

  const signIn = useCallback((data: LoginResponse) => {
    const u: AuthUser = { id: data.id, username: data.username, roles: data.roles };
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(data.access_token);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Local logout must still happen if the server token is already invalid.
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, signIn, signOut, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
