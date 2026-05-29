import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { LoginResponse } from '../types';

// Normalize roles: backend có thể trả về string[] hoặc {role_name: string}[]
function normalizeRoles(roles: unknown[]): string[] {
  if (!Array.isArray(roles)) return [];
  return roles.map(r => {
    if (typeof r === 'string') return r;
    if (r && typeof r === 'object' && 'role_name' in r) return (r as { role_name: string }).role_name;
    return '';
  }).filter(Boolean);
}

interface AuthUser {
  id: number;
  username: string;
  roles: string[];
  assigned_area_id?: number | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  signIn: (data: LoginResponse) => void;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser & { roles: unknown[] };
    // Normalize roles phòng trường hợp dữ liệu cũ trong localStorage
    return { ...parsed, roles: normalizeRoles(parsed.roles) };
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
    const u: AuthUser = {
      id: data.id,
      username: data.username,
      roles: normalizeRoles(data.roles as unknown[]),
      assigned_area_id: data.assigned_area_id ?? null,
    };
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(data.access_token);
    setUser(u);
  }, []);

  const signOut = useCallback(() => {
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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
