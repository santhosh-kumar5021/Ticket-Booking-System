import React, { useState, useEffect, useCallback } from 'react';
import { api, API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { SeatMap } from '../components/SeatMap';
import { HoldCountdownBar } from '../components/HoldCountdownBar';
import { CheckoutModal } from '../components/CheckoutModal';
import { DigitalTicketPass } from '../components/DigitalTicketPass';
import { WaitlistModal } from '../components/WaitlistModal';
import {
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  ShieldAlert,
  Users,
  Sparkles,
  Zap
} from 'lucide-react';

export function ShowBookingPage({ showId, onBack, onOpenAuthModal }) {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [heldSeatIds, setHeldSeatIds] = useState([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHolding, setIsHolding] = useState(false);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

  // Fetch show details & seat map
  const fetchShowData = useCallback(async () => {
    try {
      const res = await api.getShow(showId);
      setShow(res.show);
      setSeats(res.seats || []);

      // Check if user already holds any seats from previous session
      if (user) {
        const myHeld = res.seats.filter(s => s.isHeldByMe);
        if (myHeld.length > 0) {
          setHeldSeatIds(myHeld.map(s => s.id));
          setSelectedSeatIds(myHeld.map(s => s.id));
          setHoldExpiresAt(myHeld[0].holdExpiresAt);
        }
      }
    } catch (err) {
      console.error('Failed to load show data:', err);
      showToast('Failed to load show data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showId, user, showToast]);

  useEffect(() => {
    fetchShowData();
  }, [fetchShowData]);

  // Real-time SSE live updates for this show
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/sse/shows/${showId}`);

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'SEAT_UPDATE') {
          // Delta seat update
          fetchShowData();
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [showId, fetchShowData]);

  // Toggle seat selection
  const handleToggleSeat = (seat) => {
    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds(prev => prev.filter(id => id !== seat.id));
      // If was held, release hold
      if (heldSeatIds.includes(seat.id)) {
        api.releaseHold(showId, [seat.id]).catch(() => {});
        setHeldSeatIds(prev => prev.filter(id => id !== seat.id));
      }
    } else {
      setSelectedSeatIds(prev => [...prev, seat.id]);
    }
  };

  // Hold seats with atomic transaction
  const handleHoldAndProceed = async () => {
    if (!user) {
      onOpenAuthModal();
      return;
    }

    if (selectedSeatIds.length === 0) return;

    setIsHolding(true);
    try {
      const res = await api.holdSeats(showId, selectedSeatIds);
      setHeldSeatIds(res.heldSeatIds);
      setHoldExpiresAt(res.holdExpiresAt);
      showToast(res.message, 'success');
      setShowCheckoutModal(true);
    } catch (err) {
      console.error('Hold error:', err);
      showToast(err.message || 'Seat is no longer available.', 'error');
      // Refresh latest seats
      fetchShowData();
    } finally {
      setIsHolding(false);
    }
  };

  // Clear & release all held seats
  const handleRelease = async () => {
    if (heldSeatIds.length > 0 && user) {
      try {
        await api.releaseHold(showId, heldSeatIds);
      } catch (err) {
        console.error('Failed to release hold:', err);
      }
    }
    setSelectedSeatIds([]);
    setHeldSeatIds([]);
    setHoldExpiresAt(null);
    fetchShowData();
  };

  if (isLoading || !show) {
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Connecting to Live Seat Grid...</div>
      </div>
    );
  }

  const selectedSeatsObjects = seats.filter(s => selectedSeatIds.includes(s.id));
  const heldSeatsObjects = seats.filter(s => heldSeatIds.includes(s.id));

  const totalSeatsCount = seats.length;
  const availableSeatsCount = seats.filter(s => s.status === 'AVAILABLE').length;
  const isSoldOut = availableSeatsCount === 0;

  const showDate = new Date(show.start_time).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const showTime = new Date(show.start_time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 120px 24px' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onBack} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}>
          <ArrowLeft size={16} />
          <span>Back to Events</span>
        </button>

        {/* Live SSE Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 20,
          padding: '6px 14px',
          fontSize: 12,
          fontWeight: 700,
          color: '#6ee7b7'
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span>Live Synchronized Seat Map</span>
        </div>
      </div>

      {/* Show Header Summary */}
      <div
        className="glass-card"
        style={{
          padding: 24,
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20
        }}
      >
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <span className="badge badge-primary">{show.event_category}</span>
            {isSoldOut ? (
              <span className="badge badge-rose">Sold Out</span>
            ) : (
              <span className="badge badge-emerald">{availableSeatsCount} / {totalSeatsCount} Seats Available</span>
            )}
            <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
              TTL: {show.hold_ttl_minutes} min hold window
            </span>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
            {show.event_title}
          </h1>

          <div style={{ display: 'flex', gap: 18, fontSize: 13, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} color="#818cf8" /> {showDate} at {showTime}
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={15} color="#818cf8" /> {show.venue_name} ({show.venue_city})
            </span>
          </div>
        </div>

        {/* Waitlist Callout if Sold Out or user wants to join */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isSoldOut ? (
            <button
              onClick={() => setShowWaitlistModal(true)}
              className="btn btn-warning"
              style={{ padding: '12px 24px', fontSize: 14, fontWeight: 800 }}
            >
              <Users size={16} />
              <span>Join Show Waitlist Queue</span>
            </button>
          ) : (
            <button
              onClick={() => setShowWaitlistModal(true)}
              className="btn btn-outline"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              <Users size={15} />
              <span>Join Category Waitlist</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Seat Map Component */}
      <SeatMap
        seats={seats}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={handleToggleSeat}
        venueLayoutConfig={show.venue_layout_config}
        pricingTiers={show.pricing_tiers}
        currentUserId={user?.id}
      />

      {/* Floating Hold & Checkout Bottom Bar */}
      <HoldCountdownBar
        heldSeats={heldSeatsObjects}
        selectedSeats={selectedSeatsObjects}
        holdExpiresAt={holdExpiresAt}
        onRelease={handleRelease}
        onHoldAndProceed={handleHoldAndProceed}
        onProceedToCheckout={() => setShowCheckoutModal(true)}
        isHolding={isHolding}
      />

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <CheckoutModal
          show={show}
          heldSeats={heldSeatsObjects.length > 0 ? heldSeatsObjects : selectedSeatsObjects}
          onClose={() => setShowCheckoutModal(false)}
          onBookingSuccess={(booking) => {
            setShowCheckoutModal(false);
            setConfirmedBooking(booking);
            handleRelease();
          }}
        />
      )}

      {/* Digital Ticket Pass Modal */}
      {confirmedBooking && (
        <DigitalTicketPass
          booking={confirmedBooking}
          onClose={() => setConfirmedBooking(null)}
          onBookingCancelled={() => {
            setConfirmedBooking(null);
            fetchShowData();
          }}
        />
      )}

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <WaitlistModal
          show={show}
          onClose={() => setShowWaitlistModal(false)}
          onSuccess={() => {
            setShowWaitlistModal(false);
          }}
        />
      )}
    </div>
  );
}
