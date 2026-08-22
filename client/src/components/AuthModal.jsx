import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { UserCheck, LogIn, UserPlus, X, AlertCircle, Sparkles, Shield, User } from 'lucide-react';

export function AuthModal({ onClose, onSuccess }) {
  const { login, register, switchUser, demoUsers } = useAuth();
  const { showToast } = useNotification();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CUSTOMER'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await register(formData);
        showToast('Account created successfully!', 'success');
      } else {
        await login(formData.email, formData.password);
        showToast('Welcome back!', 'success');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (userId) => {
    setIsLoading(true);
    try {
      await switchUser(userId);
      showToast('Logged in as demo user', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 480,
          background: '#111827',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.85), 0 0 30px rgba(99, 102, 241, 0.2)',
          borderRadius: 16
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isRegister ? <UserPlus size={18} color="#818cf8" /> : <LogIn size={18} color="#818cf8" />}
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                {isRegister ? 'Create TicketPass Account' : 'Welcome to TicketPass'}
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {isRegister ? 'Register as Customer or Organiser' : 'Sign in to manage and book tickets'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {/* Quick 1-Click Demo User Switcher */}
          {!isRegister && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 12,
              padding: 14,
              marginBottom: 20
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color="#fbbf24" />
                <span>Quick 1-Click Demo Login:</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('usr-cust-1')}
                  className="btn btn-outline"
                  style={{ padding: '8px 6px', fontSize: 11, fontWeight: 700, borderColor: 'rgba(16,185,129,0.3)', color: '#34d399', textAlign: 'center', flexDirection: 'column' }}
                >
                  <span>🎟️ Customer</span>
                  <span style={{ fontSize: 9, opacity: 0.7 }}>Alex Johnson</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('usr-org-1')}
                  className="btn btn-outline"
                  style={{ padding: '8px 6px', fontSize: 11, fontWeight: 700, borderColor: 'rgba(99,102,241,0.4)', color: '#a5b4fc', textAlign: 'center', flexDirection: 'column' }}
                >
                  <span>🎭 Organiser</span>
                  <span style={{ fontSize: 9, opacity: 0.7 }}>Starlight Cinema</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('usr-admin-1')}
                  className="btn btn-outline"
                  style={{ padding: '8px 6px', fontSize: 11, fontWeight: 700, borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24', textAlign: 'center', flexDirection: 'column' }}
                >
                  <span>👑 Admin</span>
                  <span style={{ fontSize: 9, opacity: 0.7 }}>System Admin</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              color: '#fca5a5',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Sarah Connor"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Role</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="CUSTOMER">Customer (Book & hold tickets)</option>
                    <option value="ORGANISER">Organiser (Create events & shows)</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, marginTop: 6 }}
            >
              {isLoading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              style={{ background: 'transparent', border: 'none', color: '#a5b4fc', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
