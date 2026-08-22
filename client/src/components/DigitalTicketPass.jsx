import React, { useState } from 'react';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  QrCode,
  Download,
  Printer,
  X,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';

export function DigitalTicketPass({ booking, onClose, onBookingCancelled }) {
  const { showToast } = useNotification();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!booking) return null;

  const showDate = new Date(booking.start_time || booking.showTime).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const showTime = new Date(booking.start_time || booking.showTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCancelBooking = async () => {
    setIsCancelling(true);
    try {
      await api.cancelBooking(booking.id);
      showToast('Booking cancelled. Freed seats auto-assigned to waiting customers.', 'info');
      if (onBookingCancelled) onBookingCancelled(booking.id);
      onClose();
    } catch (err) {
      console.error('Cancellation error:', err);
      showToast(err.message || 'Failed to cancel booking', 'error');
      setIsCancelling(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 440,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0
        }}
      >
        {/* Apple Wallet Style Pass Card */}
        <div style={{
          background: '#111827',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 40px rgba(99, 102, 241, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          {/* Top Event Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
            padding: '24px 20px',
            position: 'relative',
            color: '#fff'
          }}>
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: 'rgba(0,0,0,0.3)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <div style={{
              display: 'inline-block',
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 8
            }}>
              Official Entry Pass
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2, margin: 0 }}>
              {booking.event_title || booking.title}
            </h2>
          </div>

          {/* Middle Body */}
          <div style={{ padding: '24px 20px' }}>
            {/* Reference & Total */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px dashed #374151',
              paddingBottom: 16,
              marginBottom: 16
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>
                  Booking Reference
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#38bdf8', letterSpacing: 1 }}>
                  {booking.booking_reference}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>
                  Status
                </div>
                <span className={`badge ${booking.status === 'CHECKED_IN' ? 'badge-emerald' : booking.status === 'CONFIRMED' ? 'badge-primary' : 'badge-rose'}`}>
                  {booking.status === 'CHECKED_IN' ? 'Checked In' : booking.status}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18, fontSize: 13 }}>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Date</div>
                <div style={{ fontWeight: 700, color: '#fff' }}>{showDate}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Time</div>
                <div style={{ fontWeight: 700, color: '#fff' }}>{showTime}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Venue</div>
                <div style={{ fontWeight: 700, color: '#fff' }}>{booking.venue_name}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Reserved Seats
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(booking.seats || []).map((s, idx) => {
                    const label = typeof s === 'string' ? s : `Row ${s.row_label || s.row}-${s.seat_number || s.number} (${s.seat_category || s.category || 'Standard'})`;
                    return (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.35)',
                          color: '#a5b4fc',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* High-Resolution Signed QR Code Box */}
            <div style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 16,
              textAlign: 'center',
              margin: '20px 0 12px 0',
              boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
            }}>
              {booking.qr_code_data ? (
                <img
                  src={booking.qr_code_data}
                  alt="Ticket QR Pass"
                  style={{ width: 180, height: 180, display: 'block', margin: '0 auto' }}
                />
              ) : (
                <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  <QrCode size={64} />
                </div>
              )}
              <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, marginTop: 8 }}>
                ⚡ Scan at entrance for instant gate verification
              </div>
            </div>

            {/* Actions: Print & Cancel */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={handlePrint}
                className="btn btn-outline"
                style={{ flex: 1, padding: '10px', fontSize: 13 }}
              >
                <Printer size={15} />
                <span>Print / Save PDF</span>
              </button>

              {booking.status === 'CONFIRMED' && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="btn btn-ghost"
                  style={{ color: '#ef4444', padding: '10px', fontSize: 13 }}
                >
                  <span>Cancel Booking</span>
                </button>
              )}
            </div>

            {/* Cancel Confirmation Dialog */}
            {showCancelConfirm && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: 10,
                padding: 14,
                marginTop: 14,
                animation: 'fadeIn 0.2s ease'
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                  <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.4 }}>
                    Are you sure you want to cancel this booking? Your seats will be released immediately and reallocated to fans on the waitlist.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleCancelBooking}
                    disabled={isCancelling}
                    className="btn btn-danger"
                    style={{ padding: '6px 14px', fontSize: 12, fontWeight: 800 }}
                  >
                    {isCancelling ? 'Releasing Seats...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
