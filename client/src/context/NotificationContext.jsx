import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE } from '../services/api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [activeOffer, setActiveOffer] = useState(null);

  // Subscribe to user-level SSE notification stream
  useEffect(() => {
    if (!user || !token) {
      setActiveOffer(null);
      return;
    }

    const eventSource = new EventSource(`${API_BASE}/sse/user?token=${token}`);

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'USER_NOTIFICATION') {
          if (payload.type === 'WAITLIST_OFFER_RECEIVED' || payload.waitlistId) {
            setActiveOffer({
              waitlistId: payload.waitlistId,
              showId: payload.showId,
              eventTitle: payload.eventTitle,
              category: payload.category,
              seat: payload.seat,
              expiresAt: payload.expiresAt,
              claimToken: payload.claimToken
            });
            showToast(`🎉 Good news! A ${payload.category} seat just freed up for "${payload.eventTitle}"!`, 'warning');
          } else if (payload.type === 'WAITLIST_OFFER_EXPIRED') {
            setActiveOffer(null);
            showToast(`⏳ Your waitlist claim window for "${payload.eventTitle}" has expired.`, 'error');
          }
        }
      } catch (err) {
        console.error('SSE notification parse error:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [user, token]);

  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const clearOffer = () => {
    setActiveOffer(null);
  };

  return (
    <NotificationContext.Provider value={{ showToast, activeOffer, clearOffer }}>
      {children}

      {/* Toast Notifications Container */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 400
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              padding: '12px 18px',
              borderRadius: '10px',
              background: t.type === 'error' ? '#7f1d1d' : t.type === 'warning' ? '#78350f' : t.type === 'success' ? '#065f46' : '#1e1b4b',
              border: `1px solid ${t.type === 'error' ? '#ef4444' : t.type === 'warning' ? '#f59e0b' : t.type === 'success' ? '#10b981' : '#6366f1'}`,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              animation: 'fadeIn 0.25s ease'
            }}
          >
            <span>{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
}
