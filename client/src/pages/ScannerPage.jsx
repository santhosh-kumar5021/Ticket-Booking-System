import React, { useState } from 'react';
import { api } from '../services/api';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Sparkles,
  Ticket,
  Calendar,
  MapPin,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export function ScannerPage() {
  const [bookingRef, setBookingRef] = useState('');
  const [qrPayloadInput, setQrPayloadInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async (refOrPayload) => {
    setIsScanning(true);
    setScanResult(null);

    try {
      let body = {};
      if (refOrPayload.startsWith('{')) {
        body = { qrPayload: refOrPayload };
      } else {
        body = { bookingReference: refOrPayload.trim() };
      }

      const res = await api.scanTicket(body);
      setScanResult({
        success: true,
        data: res.booking,
        message: res.message
      });
    } catch (err) {
      console.error('Scan error:', err);
      setScanResult({
        success: false,
        status: err.data?.status || 'ERROR',
        error: err.message || 'Validation failed',
        data: err.data?.booking
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleQuickTest = (ref) => {
    setBookingRef(ref);
    handleScan(ref);
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '32px 24px 80px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 14px',
          background: 'rgba(16, 185, 129, 0.15)',
          borderRadius: 20,
          color: '#6ee7b7',
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
          marginBottom: 10
        }}>
          <ShieldCheck size={14} color="#10b981" /> Gate Entry & Validation Terminal
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0 }}>
          Ticket QR Scanner & Check-In
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 520, margin: '8px auto 0 auto' }}>
          Cryptographic signature verification preventing counterfeit passes and duplicate admissions in real time.
        </p>
      </div>

      {/* Main Scanner Box */}
      <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (bookingRef) handleScan(bookingRef);
          }}
        >
          <label className="form-label" style={{ fontSize: 14, color: '#fff' }}>
            Enter Booking Reference or Scan Code:
          </label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. TKT-2026-INT901 or paste signed payload..."
                value={bookingRef}
                onChange={e => setBookingRef(e.target.value)}
                style={{ paddingLeft: 42, fontSize: 16, fontWeight: 600, letterSpacing: 0.5 }}
              />
            </div>

            <button
              type="submit"
              disabled={isScanning}
              className="btn btn-primary"
              style={{ padding: '0 24px', fontSize: 15, fontWeight: 800 }}
            >
              <QrCode size={18} />
              <span>{isScanning ? 'Verifying...' : 'Validate Entry'}</span>
            </button>
          </div>
        </form>

        {/* Quick Sample Test Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          fontSize: 12,
          color: 'var(--text-muted)'
        }}>
          <span>Quick Test Pass:</span>
          <button
            onClick={() => handleQuickTest('TKT-2026-INT901')}
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: 11, background: '#0b1120', border: '1px solid var(--border-subtle)' }}
          >
            Interstellar (Alex Johnson)
          </button>
          <button
            onClick={() => handleQuickTest('TKT-HAM-VIP100')}
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: 11, background: '#0b1120', border: '1px solid var(--border-subtle)' }}
          >
            Hamilton VIP (Elena Rostova)
          </button>
          <button
            onClick={() => handleQuickTest('TKT-FAKE-INVALID')}
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: 11, background: '#0b1120', border: '1px solid var(--border-subtle)', color: '#ef4444' }}
          >
            Invalid / Fake Ticket
          </button>
        </div>
      </div>

      {/* Validation Result Banner & Attendee Pass Card */}
      {scanResult && (
        <div
          className="glass-card"
          style={{
            padding: 28,
            border: scanResult.success ? '2px solid #10b981' : '2px solid #ef4444',
            background: scanResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            animation: 'scaleUp 0.25s ease'
          }}
        >
          {scanResult.success ? (
            <div>
              {/* Success Result */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={28} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>
                    ENTRY APPROVED — VALID TICKET
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1' }}>
                    Cryptographic signature verified • Checked in at {new Date(scanResult.data.checked_in_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Attendee Details Card */}
              <div style={{ background: '#0b1120', borderRadius: 12, padding: 20, border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Attendee</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{scanResult.data.customer_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{scanResult.data.customer_email}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Event & Venue</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{scanResult.data.event_title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{scanResult.data.venue_name}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Reference</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#38bdf8', letterSpacing: 1 }}>{scanResult.data.booking_reference}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Seats Admitted</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {(scanResult.data.seats || []).map((s, idx) => (
                        <span key={idx} style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid #6366f1', color: '#a5b4fc', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                          Row {s.row_label}-{s.seat_number} ({s.seat_category})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Rejection / Duplicate Result */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <XCircle size={28} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444' }}>
                    ENTRY DENIED — {scanResult.status}
                  </div>
                  <div style={{ fontSize: 14, color: '#fca5a5', fontWeight: 600 }}>
                    {scanResult.error}
                  </div>
                </div>
              </div>

              {scanResult.data && (
                <div style={{ background: '#0b1120', borderRadius: 12, padding: 16, border: '1px solid var(--border-subtle)', fontSize: 13 }}>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Original ticket holder: <strong style={{ color: '#fff' }}>{scanResult.data.customer_name}</strong> ({scanResult.data.customer_email})
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
