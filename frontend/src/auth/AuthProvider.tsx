import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '@/api/auth';
import { AUTH_EXPIRED_EVENT, getSessionToken, setSessionToken } from '@/api/client';
import { queryClient } from '@/api/query';
import type { AuthSessionPayload } from '@/types/api';

interface AuthContextValue {
  checking: boolean;
  authenticated: boolean;
  mustChangePassword: boolean;
  username: string;
  login: (username: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [username, setUsername] = useState('admin');

  const applySession = useCallback((payload: AuthSessionPayload) => {
    setSessionToken(payload.token);
    setUsername(payload.username || 'admin');
    setMustChangePassword(Boolean(payload.mustChangePassword));
    setAuthenticated(true);
  }, []);

  const clearSession = useCallback(() => {
    setSessionToken('');
    setAuthenticated(false);
    setMustChangePassword(false);
    queryClient.clear();
  }, []);

  useEffect(() => {
    const handleExpired = () => clearSession();
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [clearSession]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const status = await authApi.publicStatus();
        if (!active) return;
        setUsername(status.auth.username || 'admin');
        if (!getSessionToken()) return;
        const auth = await authApi.status();
        if (!active) return;
        setAuthenticated(auth.authenticated);
        setMustChangePassword(auth.mustChangePassword);
      } catch {
        clearSession();
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [clearSession]);

  const login = useCallback(async (name: string, password: string) => {
    applySession(await authApi.login(name, password));
  }, [applySession]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    applySession(await authApi.changePassword(currentPassword, newPassword));
  }, [applySession]);

  const resetPassword = useCallback(async (newPassword: string) => {
    applySession(await authApi.resetPassword(newPassword));
  }, [applySession]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* local sign out still succeeds */ }
    clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({
    checking, authenticated, mustChangePassword, username, login, changePassword, resetPassword, logout,
  }), [checking, authenticated, mustChangePassword, username, login, changePassword, resetPassword, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
