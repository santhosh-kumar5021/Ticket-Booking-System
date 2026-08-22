import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  Clock,
  BarChart3
} from 'lucide-react';

export function ScannerPage({ onOpenAuthModal }) {
  const { user, isOrganiser, isAdmin } = useAuth();
  const [bookingRef, setBookingRef] = useState('');
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

  // Auth guard — scanner is a staff-only tool
  if (!user || (!isOrganiser && !isAdmin)) {
    return (
      <div style={{
        background: 'var(--bg-primary)',
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px'
      }}>
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <div className="glass-card" style={{ padding: '40px 32px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20
            }}>
              <ShieldCheck size={30} color="#10b981" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
              Gate Staff Access Required
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              The Gate Entry & Validation Terminal is restricted to Organisers and Admins — venue staff responsible for verifying attendee tickets at entry points.
            </p>
            <button
              onClick={onOpenAuthModal}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
            >
              Sign In as Organiser or Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-primary)',
      minHeight: 'calc(100vh - 120px)',
      padding: '40px 24px 80px 24px'
    }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 14px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 20, color: '#6ee7b7',
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
            marginBottom: 14
          }}>
            <ShieldCheck size={13} color="#10b981" /> Gate Entry & Validation Terminal
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            Ticket QR Scanner & Check-In
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 500, margin: '10px auto 0 auto', lineHeight: 1.6 }}>
            Cryptographic signature verification preventing counterfeit passes and duplicate admissions in real time.
          </p>
        </div>

        {/* Scanner Input Card */}
        <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (bookingRef) handleScan(bookingRef);
            }}
          >
            <label className="form-label" style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, display: 'block' }}>
              Enter Booking Reference or scan QR code payload:
            </label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. TKT-2026-INT901 or paste signed payload..."
                  value={bookingRef}
                  onChange={e => setBookingRef(e.target.value)}
                  style={{ paddingLeft: 42, fontSize: 15, fontWeight: 600, letterSpacing: 0.3 }}
                />
              </div>
              <button
                type="submit"
                disabled={isScanning}
                className="btn btn-primary"
                style={{ padding: '0 24px', fontSize: 14, fontWeight: 800, minWidth: 150 }}
              >
                <QrCode size={16} />
                <span>{isScanning ? 'Verifying...' : 'Validate Entry'}</span>
              </button>
            </div>
          </form>

          {/* Quick Sample Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600 }}>Quick Test:</span>
            <button
              onClick={() => handleQuickTest('TKT-2026-INT901')}
              className="btn btn-ghost"
              style={{ padding: '4px 10px', fontSize: 11, border: '1px solid var(--border-subtle)', color: '#34d399' }}
            >
              ✓ Valid Ticket (Alex)
            </button>
            <button
              onClick={() => handleQuickTest('TKT-HAM-VIP100')}
              className="btn btn-ghost"
              style={{ padding: '4px 10px', fontSize: 11, border: '1px solid var(--border-subtle)', color: '#a5b4fc' }}
            >
              ✓ Valid Ticket (VIP)
            </button>
            <button
              onClick={() => handleQuickTest('TKT-FAKE-INVALID')}
              className="btn btn-ghost"
              style={{ padding: '4px 10px', fontSize: 11, border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
            >
              ✗ Invalid / Fake
            </button>
          </div>
        </div>

        {/* Validation Result */}
        {scanResult && (
          <div
            className="glass-card"
            style={{
              padding: 28,
              border: `2px solid ${scanResult.success ? '#10b981' : '#ef4444'}`,
              background: scanResult.success ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
              animation: 'scaleUp 0.25s ease'
            }}
          >
            {scanResult.success ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={28} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>ENTRY APPROVED — VALID TICKET</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Cryptographic signature verified · Checked in at {new Date(scanResult.data.checked_in_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 20, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Attendee</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{scanResult.data.customer_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{scanResult.data.customer_email}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Event & Venue</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{scanResult.data.event_title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{scanResult.data.venue_name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Reference</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#38bdf8', letterSpacing: 1 }}>{scanResult.data.booking_reference}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Seats Admitted</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {(scanResult.data.seats || []).map((s, idx) => (
                          <span key={idx} style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#a5b4fc', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                            {s.row_label}-{s.seat_number} ({s.seat_category})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <XCircle size={28} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444' }}>ENTRY DENIED — {scanResult.status}</div>
                    <div style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>{scanResult.error}</div>
                  </div>
                </div>

                {scanResult.data && (
                  <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 16, border: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    Original ticket holder: <strong style={{ color: 'var(--text-primary)' }}>{scanResult.data.customer_name}</strong> ({scanResult.data.customer_email})
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
