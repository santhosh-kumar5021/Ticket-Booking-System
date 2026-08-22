import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { Clock, Users, CheckCircle, AlertCircle, X, Sparkles } from 'lucide-react';

export function WaitlistModal({ show, initialCategory = 'BALCONY', onClose, onSuccess }) {
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
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Join Show Waitlist</h3>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Automated FIFO seat reassignment</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
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

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{show.event_title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{show.venue_name} • {new Date(show.start_time).toLocaleString()}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Preferred Seat Tier Category:</label>
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
                    background: category === cat ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                    border: `1px solid ${category === cat ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer'
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
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cat} Tier</span>
                  </div>
                  <span style={{ fontWeight: 800, color: '#10b981' }}>${pricingTiers[cat] || 50}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            fontSize: 12,
            color: 'var(--accent-primary)',
            lineHeight: 1.4
          }}>
            ⚡ <strong>How it works:</strong> The moment any customer cancels their ticket in your requested category, you will receive an instant email and push notification with a 5-minute exclusive window to claim and checkout the seat.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-warning"
            style={{ width: '100%', padding: '12px', fontSize: 15, fontWeight: 800 }}
          >
            {isSubmitting ? 'Joining Queue...' : 'Join Waitlist Queue'}
          </button>
        </form>
      </div>
    </div>
  );
}
