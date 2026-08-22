import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ticketpass_token') || null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState([]);

  useEffect(() => {
    loadDemoUsers();
    if (token) {
      api.getMe()
        .then(res => setUser(res.user))
        .catch(() => {
          localStorage.removeItem('ticketpass_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadDemoUsers = async () => {
    try {
      const res = await api.getDemoUsers();
      setDemoUsers(res.users || []);
    } catch (err) {
      console.error('Failed to load demo users:', err);
    }
  };

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('ticketpass_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    localStorage.setItem('ticketpass_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('ticketpass_token');
    setToken(null);
    setUser(null);
  };

  const switchUser = async (userId) => {
    const res = await api.switchUser(userId);
    localStorage.setItem('ticketpass_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const isCustomer = user?.role === 'CUSTOMER';
  const isOrganiser = user?.role === 'ORGANISER' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        demoUsers,
        login,
        register,
        logout,
        switchUser,
        isCustomer,
        isOrganiser,
        isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
