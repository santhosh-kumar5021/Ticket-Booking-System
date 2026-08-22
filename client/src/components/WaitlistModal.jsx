import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { Clock, Users, CheckCircle, AlertCircle, X, Sparkles, UserCheck } from 'lucide-react';

export function WaitlistModal({ show, initialCategory = 'BALCONY', onClose, onSuccess, onOpenAuthModal }) {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [category, setCategory] = useState(initialCategory);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!show) return null;

  const pricingTiers = show.pricing_tiers || {};
  const categories = Object.keys(pricingTiers).length > 0 ? Object.keys(pricingTiers) : ['EXECUTIVE', 'PREMIUM', 'BALCONY'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.joinWaitlist(show.id, category);
      showToast(res.message || 'Joined waitlist successfully!', 'success');
      if (onSuccess) onSuccess(res.entry);
      onClose();
    } catch (err) {
      console.error('Waitlist join error:', err);
      setError(err.message || 'Failed to join waitlist.');
      setIsSubmitting(false);
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
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>Join Show Waitlist</h3>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Automated FIFO seat reassignment</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {!user ? (
            <div style={{
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc', marginBottom: 8 }}>
                🔑 Sign In Required to Join Waitlist
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                You must be logged in so we can send your instant seat offer notification when a ticket frees up.
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenAuthModal) onOpenAuthModal();
                }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: 14, fontWeight: 700 }}
              >
                <UserCheck size={16} />
                <span>Sign In or Use Demo Account →</span>
              </button>
            </div>
          ) : null}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 18,
              color: '#fca5a5',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>{show.event_title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {show.venue_name} • {new Date(show.start_time).toLocaleString()}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Select Preferred Seat Tier Category:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {categories.map(cat => (
                <label
                  key={cat}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: category === cat ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${category === cat ? '#6366f1' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="radio"
                      name="waitlist_category"
                      value={cat}
                      checked={category === cat}
                      onChange={() => setCategory(cat)}
                      style={{ accentColor: '#6366f1' }}
                    />
                    <span style={{ fontWeight: 700, color: '#ffffff' }}>{cat} Tier</span>
                  </div>
                  <span style={{ fontWeight: 800, color: '#10b981' }}>${pricingTiers[cat] || 50}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            fontSize: 12,
            color: '#93c5fd',
            lineHeight: 1.4
          }}>
            ⚡ <strong>How it works:</strong> The moment any customer cancels their ticket in your requested category, you will receive an instant email and push notification with a 5-minute exclusive window to claim and checkout the seat.
          </div>

          {user && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-warning"
              style={{ width: '100%', padding: '12px', fontSize: 15, fontWeight: 800 }}
            >
              {isSubmitting ? 'Joining Queue...' : 'Join Waitlist Queue'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
