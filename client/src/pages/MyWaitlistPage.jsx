import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import {
  Clock,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export function MyWaitlistPage({ onClaimOffer, onExploreEvents }) {
  const { showToast } = useNotification();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWaitlist();
    const interval = setInterval(fetchWaitlist, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchWaitlist = async () => {
    try {
      const res = await api.getMyWaitlist();
      setEntries(res.entries || []);
    } catch (err) {
      console.error('Failed to load waitlist entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async (id) => {
    try {
      await api.declineWaitlistOffer(id);
      showToast('Offer declined. Seat cascaded to the next person in line.', 'info');
      fetchWaitlist();
    } catch (err) {
      showToast(err.message || 'Failed to decline offer', 'error');
    }
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 80px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
            My Show Waitlist Queues
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Track your position in line for high-demand sold out shows. Automatic seat reassignment on cancellation.
          </p>
        </div>

        <button onClick={onExploreEvents} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}>
          <span>Explore Shows</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          Loading waitlist entries...
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <Clock size={28} color="#f59e0b" />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>No Active Waitlist Entries</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 20px auto' }}>
            When a show or seat category sells out, you can join the queue to be automatically offered freed seats upon cancellation.
          </p>
          <button onClick={onExploreEvents} className="btn btn-warning" style={{ padding: '10px 20px' }}>
            Browse Sold-Out Shows
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {entries.map(entry => {
            const isOfferActive = entry.status === 'OFFERED' && entry.isOfferActive;

            return (
              <div
                key={entry.id}
                className="glass-card"
                style={{
                  padding: 20,
                  border: isOfferActive ? '1.5px solid #f59e0b' : '1px solid var(--border-subtle)',
                  background: isOfferActive ? 'rgba(245, 158, 11, 0.06)' : 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 280 }}>
                  <div style={{
                    width: 70,
                    height: 70,
                    borderRadius: 12,
                    background: isOfferActive ? 'rgba(245, 158, 11, 0.2)' : '#131b2e',
                    border: `1px solid ${isOfferActive ? '#f59e0b' : 'var(--border-subtle)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isOfferActive ? '#fbbf24' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Position
                    </span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: isOfferActive ? '#fbbf24' : '#fff', lineHeight: 1 }}>
                      #{entry.priority_order}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={`badge ${
                        entry.status === 'OFFERED' ? 'badge-amber' :
                        entry.status === 'ACCEPTED' ? 'badge-emerald' :
                        entry.status === 'EXPIRED' ? 'badge-rose' : 'badge-primary'
                      }`}>
                        {entry.status === 'OFFERED' ? '⚡ Seat Offered (Action Required)' : entry.status}
                      </span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        Requested: <strong style={{ color: '#fff' }}>{entry.seat_category}</strong> Tier
                      </span>
                    </div>

                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                      {entry.event_title}
                    </h3>

                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      📍 {entry.venue_name} • {new Date(entry.start_time).toLocaleString()}
                    </div>

                    {isOfferActive && (
                      <div style={{
                        marginTop: 10,
                        padding: '6px 12px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#fef3c7',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <Sparkles size={14} color="#fbbf24" />
                        <span>Offered Seat: <strong>Row {entry.row_label}-{entry.seat_number}</strong> (${entry.price})</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isOfferActive ? (
                    <>
                      <button
                        onClick={() => handleDecline(entry.id)}
                        className="btn btn-ghost"
                        style={{ color: '#ef4444', padding: '10px 14px', fontSize: 13 }}
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => onClaimOffer(entry.id, entry.claim_token)}
                        className="btn btn-warning"
                        style={{ padding: '10px 20px', fontSize: 14, fontWeight: 800 }}
                      >
                        <span>Claim & Checkout →</span>
                      </button>
                    </>
                  ) : entry.status === 'WAITING' ? (
                    <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={16} />
                      <span>Standing by in queue</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
