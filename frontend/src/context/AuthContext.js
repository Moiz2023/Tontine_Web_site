import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Configure axios to always send credentials and include token in header
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }

    // Check if we have a stored token
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedUser && storedToken) {
      // First, restore from localStorage for immediate UI
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        // Invalid stored data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
      setIsAuthenticated(true);
      // Update localStorage with fresh data
      localStorage.setItem('auth_user', JSON.stringify(response.data));
    } catch (error) {
      // If API fails but we have stored data, keep using it (offline support)
      if (!storedToken) {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password }, {
      withCredentials: true
    });
    // Store token in localStorage as backup for mobile
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    localStorage.setItem('auth_user', JSON.stringify(response.data));
    setUser(response.data);
    setIsAuthenticated(true);
    return response.data;
  };

  const register = async (userData) => {
    const response = await axios.post(`${API}/auth/register`, userData, {
      withCredentials: true
    });
    // Store token in localStorage as backup for mobile
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    localStorage.setItem('auth_user', JSON.stringify(response.data));
    setUser(response.data);
    setIsAuthenticated(true);
    return response.data;
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const exchangeSession = async (sessionId) => {
    const response = await axios.post(`${API}/auth/session`, { session_id: sessionId }, {
      withCredentials: true
    });
    // Store session for mobile fallback
    if (response.data.session_token) {
      localStorage.setItem('auth_token', response.data.session_token);
    }
    localStorage.setItem('auth_user', JSON.stringify(response.data));
    setUser(response.data);
    setIsAuthenticated(true);
    return response.data;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
    // Clear localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData) => {
    setUser(prev => {
      const updated = { ...prev, ...userData };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      register,
      loginWithGoogle,
      exchangeSession,
      logout,
      updateUser,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
