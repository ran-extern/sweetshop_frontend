import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate, Navigate, Outlet } from 'react-router-dom';
import * as api from '../lib/api';

/*
  AuthContext

  Provides application-wide authentication state and helpers:
  - `login` / `register` wrappers that call the API module and surface
    parsed validation errors to the UI.
  - `logout` to clear local state and tokens.
  - `isAuthenticated` / `isAdmin` flags useful for guarding routes.

  Also includes two route wrappers that work with React Router's nested
  `Outlet` pattern: `ProtectedRoute` (requires auth) and `AdminRoute`.
*/

const AuthContext = createContext(null);

export const isUserAdmin = (user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (Array.isArray(user.roles)) {
    return user.roles.includes('admin');
  }
  if (user.roles && typeof user.roles.includes === 'function') {
    return user.roles.includes('admin');
  }
  return false;
};

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
      // Prefer the server-provided user object, but fall back to decoding the
      // access token when needed for lightweight client-side checks.
  const resolvedUser = loggedUser || api.getUserFromAccess();
  setUser(resolvedUser);
  return { ok: true, user: resolvedUser };
    } catch (err) {
      // return parsed DRF errors to callers for better UX
      const parsed = api.parseDRFErrors(err);
      return { ok: false, error: parsed };
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async ({ name, email, password }) => {
    setLoading(true);
    try {
      const { user: newUser } = await api.register({ name, email, password });
      // After successful registration the backend returns tokens + user.
      // Persist the minimal state we need on the client and mark as
      // authenticated.
    const resolvedUser = newUser || api.getUserFromAccess();
    setUser(resolvedUser);
    return { ok: true, user: resolvedUser };
    } catch (err) {
      const parsed = api.parseDRFErrors(err);
      return { ok: false, error: parsed };
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    // Clear stored tokens/profile and reset auth state. Redirect to login.
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
  isAdmin: isUserAdmin(user),
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

export function CustomerRoute({ redirectTo = '/admin' }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}

export default AuthContext;
