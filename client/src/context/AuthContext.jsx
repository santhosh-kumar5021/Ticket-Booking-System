import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

// Hardcoded demo users as fallback when backend is sleeping
const FALLBACK_DEMO_USERS = [
  { id: 'usr-admin-1', name: 'System Administrator', email: 'admin@ticketpass.app', role: 'ADMIN' },
  { id: 'usr-org-1', name: 'Starlight Cinema', email: 'cinema@starlight.com', role: 'ORGANISER' },
  { id: 'usr-org-2', name: 'Metropolis Events', email: 'metropolis@events.com', role: 'ORGANISER' },
  { id: 'usr-cust-1', name: 'Alex Johnson', email: 'alex.johnson@example.com', role: 'CUSTOMER' },
  { id: 'usr-cust-2', name: 'Priya Sharma', email: 'priya.sharma@example.com', role: 'CUSTOMER' },
  { id: 'usr-cust-3', name: 'Marcus Chen', email: 'marcus.chen@example.com', role: 'CUSTOMER' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ticketpass_token') || null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState(FALLBACK_DEMO_USERS);
  const [backendOnline, setBackendOnline] = useState(null); // null = unknown, true/false

  useEffect(() => {
    loadDemoUsers();
    if (token) {
      api.getMe()
        .then(res => {
          setUser(res.user);
          setBackendOnline(true);
        })
        .catch(() => {
          localStorage.removeItem('ticketpass_token');
          setToken(null);
          setUser(null);
          setBackendOnline(false);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadDemoUsers = async () => {
    try {
      const res = await api.getDemoUsers();
      if (res.users && res.users.length > 0) {
        setDemoUsers(res.users);
        setBackendOnline(true);
      }
    } catch (err) {
      // Keep fallback demo users — backend is sleeping
      console.warn('Backend sleeping — using local demo user data');
      setBackendOnline(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('ticketpass_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setBackendOnline(true);
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    localStorage.setItem('ticketpass_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setBackendOnline(true);
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
    setBackendOnline(true);
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
        backendOnline,
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
