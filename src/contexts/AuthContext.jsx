import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate, Navigate, Outlet } from 'react-router-dom';
import * as api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => api.getCachedUserProfile() || api.getUserFromAccess() || null);
  const [loading, setLoading] = useState(false);

  // Keep user in sync with localStorage changes (other tabs / manual clears)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === null) return; // ignore clear-all events
      if (e.key === 'access_token' || e.key === 'refresh_token' || e.key === 'user_profile') {
        const cached = api.getCachedUserProfile();
        const decoded = api.getUserFromAccess();
        setUser(cached || decoded || null);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogin = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      const { user: loggedUser } = await api.login({ email, password });
      setUser(loggedUser || api.getUserFromAccess());
      return { ok: true };
    } catch (err) {
      // return parsed DRF errors to callers for better UX
      const parsed = api.parseDRFErrors(err);
      return { ok: false, error: parsed };
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async ({ username, email, password }) => {
    setLoading(true);
    try {
      const { user: newUser } = await api.register({ username, email, password });
      setUser(newUser || api.getUserFromAccess());
      return { ok: true };
    } catch (err) {
      const parsed = api.parseDRFErrors(err);
      return { ok: false, error: parsed };
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    api.logout();
    api.clearCachedUserProfile();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated: !!user,
    isAdmin: !!user && (user.role === 'admin' || (user.roles && user.roles.includes && user.roles.includes('admin'))),
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// Route wrappers
export function ProtectedRoute({ redirectTo = '/login' }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Outlet />;
  return <Navigate to={redirectTo} replace />;
}

export function AdminRoute({ redirectTo = '/' }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (isAuthenticated && isAdmin) return <Outlet />;
  return <Navigate to={redirectTo} replace />;
}

export default AuthContext;
