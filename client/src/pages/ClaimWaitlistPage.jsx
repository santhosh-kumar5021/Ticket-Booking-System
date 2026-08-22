import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { CheckoutModal } from '../components/CheckoutModal';
import { DigitalTicketPass } from '../components/DigitalTicketPass';
import {
  Clock,
  Calendar,
  MapPin,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  XCircle,
  CheckCircle2
} from 'lucide-react';

export function ClaimWaitlistPage({ waitlistId, claimToken, onDone }) {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [offer, setOffer] = useState(null);
  const [show, setShow] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    fetchOfferDetails();
  }, [waitlistId]);

  const fetchOfferDetails = async () => {
    setIsLoading(true);
    try {
      const res = await api.getWaitlistOffer(waitlistId);
      setOffer(res.offer);

      const showRes = await api.getShow(res.offer.show_id);
      setShow(showRes.show);
    } catch (err) {
      console.error('Failed to fetch offer:', err);
      showToast(err.message || 'Waitlist offer not found', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Countdown ticker
  useEffect(() => {
    if (!offer || !offer.offer_expires_at) return;

    const tick = () => {
      const remainingMs = new Date(offer.offer_expires_at).getTime() - Date.now();
      if (remainingMs <= 0) {
        setCountdown('00:00');
        setIsExpired(true);
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setCountdown(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [offer]);

  const handleClaim = () => {
    setShowCheckout(true);
  };

  const handleDecline = async () => {
    try {
      await api.declineWaitlistOffer(waitlistId);
      showToast('Offer declined. The seat has been cascaded to the next person in line.', 'info');
      onDone();
    } catch (err) {
      showToast(err.message || 'Failed to decline', 'error');
    }
  };

  if (isLoading || !offer) {
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', textAlign: 'center', color: '#fff' }}>
        <h3>Loading Waitlist Allocation Offer...</h3>
      </div>
    );
  }

  const heldSeatObject = {
    id: offer.offered_show_seat_id,
    row: offer.row_label,
    number: offer.seat_number,
    section: offer.section,
    category: offer.seat_category,
    price: offer.price
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 80px 24px' }}>
      <div className="glass-card" style={{ padding: 32, border: '1px solid #f59e0b', borderRadius: 20, boxShadow: '0 20px 40px rgba(245, 158, 11, 0.15)' }}>
        {/* Banner */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 16px',
            background: 'rgba(245, 158, 11, 0.2)',
            borderRadius: 20,
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fde68a',
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 12
          }}>
            <Sparkles size={14} color="#fbbf24" /> Exclusive Waitlist Reallocation
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0 }}>
            Your Reserved Seat is Ready!
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>
            A seat just opened up due to a cancellation. It has been temporarily held for you.
          </p>
        </div>

        {/* Expiry Countdown Card */}
        <div style={{
          background: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.12)',
          border: isExpired ? '1px solid #ef4444' : '1px solid #f59e0b',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Clock size={24} color={isExpired ? '#ef4444' : '#f59e0b'} />
            <div>
              <div style={{ fontSize: 11, color: isExpired ? '#fca5a5' : '#fde68a', fontWeight: 700, textTransform: 'uppercase' }}>
                {isExpired ? 'Offer Window Expired' : 'Claim Window Countdown'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {isExpired ? 'This offer has cascaded to the next fan.' : 'Expires automatically after 5 minutes.'}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: isExpired ? '#ef4444' : '#f59e0b', letterSpacing: 1 }}>
            {countdown}
          </div>
        </div>

        {/* Event & Seat Details */}
        <div style={{ background: '#0b1120', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
            {offer.event_title}
          </h3>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            📍 {offer.venue_name} • {new Date(offer.start_time).toLocaleString()}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#131b2e',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Allocated Seat</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                Row {offer.row_label}, Seat {offer.seat_number}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Tier & Price</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>
                ${offer.price} <span style={{ fontSize: 12, color: '#a5b4fc' }}>({offer.seat_category})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleDecline}
            disabled={isExpired}
            className="btn btn-outline"
            style={{ flex: 1, padding: 14, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          >
            Decline Offer
          </button>

          <button
            onClick={handleClaim}
            disabled={isExpired}
            className="btn btn-warning"
            style={{ flex: 2, padding: 14, fontSize: 16, fontWeight: 800 }}
          >
            <span>Proceed to Checkout</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && show && (
        <CheckoutModal
          show={show}
          heldSeats={[heldSeatObject]}
          onClose={() => setShowCheckout(false)}
          onBookingSuccess={(booking) => {
            setShowCheckout(false);
            setConfirmedBooking(booking);
          }}
        />
      )}

      {/* Digital Ticket Pass */}
      {confirmedBooking && (
        <DigitalTicketPass
          booking={confirmedBooking}
          onClose={() => {
            setConfirmedBooking(null);
            onDone();
          }}
        />
      )}
    </div>
  );
}
