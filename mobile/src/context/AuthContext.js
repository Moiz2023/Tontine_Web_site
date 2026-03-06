import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      // First try to load from storage
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('auth_token');
      
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }

      // Then verify with server
      const response = await authAPI.getMe();
      setUser(response.data);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      // If server check fails but we have stored data, keep it
      const storedToken = await AsyncStorage.getItem('auth_token');
      if (!storedToken) {
        setUser(null);
        setIsAuthenticated(false);
        await AsyncStorage.removeItem('user');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const userData = response.data;
    
    if (userData.token) {
      await AsyncStorage.setItem('auth_token', userData.token);
    }
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    const userData = response.data;
    
    if (userData.token) {
      await AsyncStorage.setItem('auth_token', userData.token);
    }
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = async (userData) => {
    const updated = { ...user, ...userData };
    setUser(updated);
    await AsyncStorage.setItem('user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
      updateUser,
      checkAuth,
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
