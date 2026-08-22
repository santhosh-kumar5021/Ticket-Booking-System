import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { UserCheck, LogIn, UserPlus, X, AlertCircle, Shield, User, Sparkles, CheckCircle2 } from 'lucide-react';

export function AuthModal({ onClose, onSuccess }) {
  const { login, register, switchUser, demoUsers } = useAuth();
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'demo'
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
      if (activeTab === 'register') {
        await register(formData);
        showToast('Account created successfully', 'success');
      } else {
        await login(formData.email, formData.password);
        showToast('Signed in successfully', 'success');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSelect = async (userId) => {
    setIsLoading(true);
    setError(null);
    try {
      await switchUser(userId);
      showToast('Signed in successfully', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError('Unable to authenticate demo account. Please try again in a few moments.');
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
          maxWidth: 460,
          background: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
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
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>
              {activeTab === 'register' ? 'Create Account' : activeTab === 'demo' ? 'Quick Demo Profiles' : 'Welcome to TicketPass'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              {activeTab === 'register' ? 'Register as Customer or Organiser' : activeTab === 'demo' ? 'Select a pre-configured profile for evaluation' : 'Sign in to access your bookings and tickets'}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6, color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '4px 20px'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(null); }}
            style={{
              padding: '10px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'login' ? '2px solid #818cf8' : '2px solid transparent',
              color: activeTab === 'login' ? '#fff' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(null); }}
            style={{
              padding: '10px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'register' ? '2px solid #818cf8' : '2px solid transparent',
              color: activeTab === 'register' ? '#fff' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('demo'); setError(null); }}
            style={{
              padding: '10px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'demo' ? '2px solid #fbbf24' : '2px solid transparent',
              color: activeTab === 'demo' ? '#fbbf24' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <span>Demo Profiles</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24 }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
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

          {/* Tab: Demo Accounts */}
          {activeTab === 'demo' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Choose a role profile to test its features:
              </div>

              {/* Customer Profile */}
              <button
                type="button"
                onClick={() => handleDemoSelect('usr-cust-1')}
                disabled={isLoading}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Alex Johnson</span>
                    <span className="badge badge-emerald" style={{ fontSize: 10 }}>Customer</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Book tickets, hold seats, join category waitlist
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>Select →</div>
              </button>

              {/* Organiser Profile */}
              <button
                type="button"
                onClick={() => handleDemoSelect('usr-org-1')}
                disabled={isLoading}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Starlight Cinema</span>
                    <span className="badge badge-primary" style={{ fontSize: 10 }}>Organiser</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Create events, schedule shows, view revenue
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 700 }}>Select →</div>
              </button>

              {/* Admin Profile */}
              <button
                type="button"
                onClick={() => handleDemoSelect('usr-admin-1')}
                disabled={isLoading}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>System Administrator</span>
                    <span className="badge badge-gold" style={{ fontSize: 10 }}>Admin</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Design venue seat layouts, manage categories
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700 }}>Select →</div>
              </button>
            </div>
          ) : (
            /* Tab: Login / Register Form */
            <form onSubmit={handleSubmit}>
              {activeTab === 'register' && (
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
                      <option value="CUSTOMER">Customer (Book and hold tickets)</option>
                      <option value="ORGANISER">Organiser (Publish events and shows)</option>
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
                style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, marginTop: 8 }}
              >
                {isLoading ? 'Authenticating...' : activeTab === 'register' ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
