import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DigitalTicketPass } from '../components/DigitalTicketPass';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  QrCode,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export function MyBookingsPage({ onExploreEvents }) {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPass, setSelectedPass] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMyBookings();
      setBookings(res.bookings || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 80px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
            My Tickets & Digital Passes
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            View your confirmed entry passes, download high-res QR codes, or cancel reservations.
          </p>
        </div>

        <button onClick={onExploreEvents} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}>
          <span>Browse More Shows</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          Loading your tickets...
        </div>
      ) : bookings.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <Ticket size={28} color="#818cf8" />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>No Bookings Yet</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 20px auto' }}>
            You haven't reserved any tickets yet. Explore current movies, concerts, and stadium matches!
          </p>
          <button onClick={onExploreEvents} className="btn btn-primary" style={{ padding: '10px 20px' }}>
            Explore Events
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {bookings.map(booking => {
            const showDate = new Date(booking.start_time).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
            const showTime = new Date(booking.start_time).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={booking.id}
                className="glass-card"
                style={{
                  padding: 20,
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
                    background: '#131b2e',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' }}>
                      {new Date(booking.start_time).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                      {new Date(booking.start_time).getDate()}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={`badge ${booking.status === 'CHECKED_IN' ? 'badge-emerald' : booking.status === 'CONFIRMED' ? 'badge-primary' : 'badge-rose'}`}>
                        {booking.status === 'CHECKED_IN' ? 'Checked In' : booking.status}
                      </span>
                      <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                        Ref: {booking.booking_reference}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                      {booking.event_title}
                    </h3>

                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>📍 {booking.venue_name}</span>
                      <span>•</span>
                      <span>⏰ {showTime}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {(booking.seats || []).map((s, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#a5b4fc',
                            padding: '2px 8px',
                            borderRadius: 4
                          }}
                        >
                          Row {s.row_label}-{s.seat_number} ({s.seat_category})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Paid</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>
                      ${booking.total_amount.toFixed(2)}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPass(booking)}
                    className="btn btn-primary"
                    style={{ padding: '10px 18px', fontSize: 13, fontWeight: 700 }}
                  >
                    <QrCode size={16} />
                    <span>View QR Pass</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Pass Modal */}
      {selectedPass && (
        <DigitalTicketPass
          booking={selectedPass}
          onClose={() => setSelectedPass(null)}
          onBookingCancelled={() => {
            fetchBookings();
            setSelectedPass(null);
          }}
        />
      )}
    </div>
  );
}
