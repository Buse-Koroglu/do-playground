import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api, { clearAccessToken, setAccessToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const refreshSession = async () => {
    try {
      const response = await api.post('/auth/refresh');
      setAccessToken(response.data.accessToken);
      setUser(response.data.user);
    } catch (error) {
      clearAccessToken();
      setUser(null);
    } finally {
      setInitialized(true);
    }
  };

  useEffect(() => {
    refreshSession();

    const handleLogout = () => {
      setUser(null);
      setInitialized(true);
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const value = useMemo(() => ({
    user,
    initialized,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'ADMIN',
    refreshSession,
    login: async (credentials) => {
      const response = await api.post('/auth/login', credentials);
      setAccessToken(response.data.accessToken);
      setUser(response.data.user);
      return response.data.user;
    },
    register: async (credentials) => {
      const response = await api.post('/auth/register', credentials);
      return response.data.user;
    },
    logout: async () => {
      try {
        await api.post('/auth/logout');
      } finally {
        clearAccessToken();
        setUser(null);
      }
    },
    setUser,
  }), [user, initialized]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export function ProtectedRoute({ children }) {
  const { initialized, user } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return <div style={{ padding: 24 }}>Sayfa hazırlanıyor...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function RoleRoute({ allowedRoles, children }) {
  const { initialized, user } = useAuth();

  if (!initialized) {
    return <div style={{ padding: 24 }}>Erişim hazırlanıyor...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}