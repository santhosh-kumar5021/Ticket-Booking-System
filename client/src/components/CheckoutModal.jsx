import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle,
  X,
  Ticket,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export function CheckoutModal({
  show,
  heldSeats = [],
  onClose,
  onBookingSuccess
}) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');

  if (!show || heldSeats.length === 0) return null;

  const totalPrice = heldSeats.reduce((sum, s) => sum + (s.price || 0), 0);
  const serviceFee = Math.round(totalPrice * 0.05 * 100) / 100;
  const finalTotal = totalPrice + serviceFee;

  const showDate = new Date(show.start_time).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const showTime = new Date(show.start_time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleConfirm = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      const showSeatIds = heldSeats.map(s => s.id);
      const res = await api.confirmBooking(show.id, showSeatIds, {
        method: paymentMethod,
        cardLast4: '4242'
      });

      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });

      onBookingSuccess(res.booking);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Booking confirmation failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 540,
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
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={18} color="#818cf8" />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>Confirm Ticket Purchase</h3>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Instant QR Pass Issued to Email</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} style={{ padding: 24 }}>
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

          {/* Event Summary Card */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16, marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>
              {show.event_title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={13} /> {showDate} at {showTime}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} /> {show.venue_name}
              </span>
            </div>
          </div>

          {/* Seat Breakdown */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
              Selected Seats ({heldSeats.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {heldSeats.map(s => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 13
                  }}
                >
                  <div>
                    <strong style={{ color: '#ffffff' }}>Row {s.row}, Seat {s.number}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>({s.category})</span>
                  </div>
                  <strong style={{ color: '#10b981' }}>${s.price}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <span>Subtotal ({heldSeats.length} tickets):</span>
              <span style={{ color: '#ffffff' }}>${totalPrice.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              <span>Service & Facility Fee:</span>
              <span style={{ color: '#ffffff' }}>${serviceFee.toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 18,
              fontWeight: 800,
              color: '#ffffff',
              borderTop: '1px dashed var(--border-subtle)',
              paddingTop: 12
            }}>
              <span>Total Amount:</span>
              <span style={{ color: '#10b981' }}>${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer & Email Confirmation Notice */}
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} color="#10b981" />
            <span>Digital QR-Code Ticket will be dispatched to <strong style={{ color: '#ffffff' }}>{user?.email}</strong></span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isProcessing}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 800 }}
          >
            {isProcessing ? 'Issuing Cryptographic QR Pass...' : `Pay $${finalTotal.toFixed(2)} & Confirm Booking`}
          </button>
        </form>
      </div>
    </div>
  );
}
