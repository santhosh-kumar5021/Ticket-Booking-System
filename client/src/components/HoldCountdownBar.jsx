import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';

export function HoldCountdownBar({
  heldSeats = [],
  selectedSeats = [],
  holdExpiresAt,
  onRelease,
  onProceedToCheckout,
  onHoldAndProceed,
  isHolding = false
}) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!holdExpiresAt) {
      setTimeLeft('');
      setIsUrgent(false);
      return;
    }

    const tick = () => {
      const remainingMs = new Date(holdExpiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('00:00');
        setIsUrgent(true);
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        setIsUrgent(remainingMs < 60000); // less than 1 min
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  const activeSeats = heldSeats.length > 0 ? heldSeats : selectedSeats;
  if (activeSeats.length === 0) return null;

  const totalPrice = activeSeats.reduce((sum, s) => sum + (s.price || 0), 0);
  const isAlreadyHeld = heldSeats.length > 0 && Boolean(holdExpiresAt);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)',
        maxWidth: 900,
        zIndex: 40,
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        className="glass-card"
        style={{
          padding: '16px 24px',
          background: 'var(--bg-primary)',
          border: isUrgent ? '1px solid var(--accent-red)' : isAlreadyHeld ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
          boxShadow: isUrgent ? '0 10px 30px rgba(239, 68, 68, 0.4)' : isAlreadyHeld ? '0 10px 30px rgba(139, 92, 246, 0.3)' : 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        {/* Left Side: Seat List & Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            background: isAlreadyHeld ? 'rgba(139, 92, 246, 0.2)' : 'rgba(99, 102, 241, 0.2)',
            border: `1px solid ${isAlreadyHeld ? '#8b5cf6' : '#6366f1'}`,
            borderRadius: 10,
            padding: '8px 12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{activeSeats.length}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              {activeSeats.length === 1 ? 'Seat' : 'Seats'}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              {activeSeats.slice(0, 4).map(s => (
                <span
                  key={s.id}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: s.category === 'EXECUTIVE' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: s.category === 'EXECUTIVE' ? '#fbbf24' : '#a5b4fc',
                    border: `1px solid ${s.category === 'EXECUTIVE' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                  }}
                >
                  {s.row}-{s.number} ({s.category})
                </span>
              ))}
              {activeSeats.length > 4 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                  +{activeSeats.length - 4} more
                </span>
              )}
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Total: <strong style={{ color: '#10b981', fontSize: 16 }}>${totalPrice.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Center: Live Countdown Timer (if held) */}
        {isAlreadyHeld && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${isUrgent ? '#ef4444' : '#f59e0b'}`,
            padding: '6px 14px',
            borderRadius: 8
          }}>
            {isUrgent ? <AlertTriangle size={18} color="#ef4444" /> : <Clock size={18} color="#f59e0b" />}
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: isUrgent ? '#fca5a5' : '#fde68a' }}>
                Hold Time Remaining
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isUrgent ? '#ef4444' : '#f59e0b', letterSpacing: 1 }}>
                {timeLeft}
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onRelease}
            className="btn btn-ghost"
            style={{ color: '#ef4444', padding: '10px 14px', fontSize: 13 }}
            title="Clear selection and release holds"
          >
            <Trash2 size={16} />
            <span>Clear</span>
          </button>

          {isAlreadyHeld ? (
            <button
              onClick={onProceedToCheckout}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: 14, fontWeight: 800 }}
            >
              <span>Complete Booking</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={onHoldAndProceed}
              disabled={isHolding}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: 14, fontWeight: 800 }}
            >
              <span>{isHolding ? 'Locking Seats...' : 'Hold & Proceed'}</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
