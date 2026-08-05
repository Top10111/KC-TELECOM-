import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, clearToken, getToken, setToken, type LoginPayload, type RegisterPayload } from '../lib/api';
import type { AuthUser } from '../types';

const USER_KEY = 'kc_telecom_user';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const storedUser = localStorage.getItem(USER_KEY);
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        clearToken();
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const persist = (accessToken: string, authUser: AuthUser) => {
    setToken(accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  const login = async (payload: LoginPayload) => {
    const res = await authApi.login(payload);
    persist(res.accessToken, res.user);
    return res.user;
  };

  const register = async (payload: RegisterPayload) => {
    const res = await authApi.register(payload);
    persist(res.accessToken, res.user);
    return res.user;
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
