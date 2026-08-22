import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import {
  Ticket,
  Calendar,
  Layers,
  BarChart3,
  QrCode,
  Mail,
  UserCheck,
  LogOut,
  ChevronDown,
  Shield,
  Clock,
  Sparkles
} from 'lucide-react';

export function Navbar({ currentPage, onNavigate, onOpenAuthModal }) {
  const { user, logout, switchUser, demoUsers, isOrganiser, isAdmin } = useAuth();
  const { activeOffer, clearOffer } = useNotification();
  const [emailCount, setEmailCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [offerCountdown, setOfferCountdown] = useState('');

  // Fetch emails count for badge
  useEffect(() => {
    const fetchEmails = () => {
      api.getEmails()
        .then(res => setEmailCount(res.emails?.length || 0))
        .catch(() => {});
    };
    fetchEmails();
    const interval = setInterval(fetchEmails, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle countdown for active waitlist offer banner
  useEffect(() => {
    if (!activeOffer || !activeOffer.expiresAt) return;

    const tick = () => {
      const remainingMs = new Date(activeOffer.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setOfferCountdown('Expired');
        clearOffer();
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setOfferCountdown(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeOffer]);

  return (
    <>
      {/* Top Banner when a Waitlist Offer is Active */}
      {activeOffer && (
        <div className="top-alert-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div>
              <strong>Seat Available:</strong> A {activeOffer.category} seat ({activeOffer.seat}) freed up for <em>"{activeOffer.eventTitle}"</em>!
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Time left: {offerCountdown}
            </div>
            <button
              onClick={() => onNavigate('claim-waitlist', { waitlistId: activeOffer.waitlistId, claimToken: activeOffer.claimToken })}
              className="btn"
              style={{ background: '#ffffff', color: '#b45309', padding: '6px 14px', fontSize: 13, fontWeight: 800 }}
            >
              Claim Seat Now →
            </button>
            <button
              onClick={clearOffer}
              style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: 16 }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <header className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* Logo */}
          <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => onNavigate('events')}>
            <div className="nav-brand-icon">
              <Ticket size={22} color="#ffffff" />
            </div>
            <span>Ticket<span style={{ color: '#818cf8' }}>Pass</span></span>
          </div>

          {/* Navigation Links */}
          <nav className="nav-links">
            <button
              onClick={() => onNavigate('events')}
              className={`nav-link ${currentPage === 'events' ? 'active' : ''}`}
            >
              <Calendar size={16} />
              Events
            </button>

            {user && (
              <>
                <button
                  onClick={() => onNavigate('my-bookings')}
                  className={`nav-link ${currentPage === 'my-bookings' ? 'active' : ''}`}
                >
                  <Ticket size={16} />
                  My Tickets
                </button>

                <button
                  onClick={() => onNavigate('my-waitlist')}
                  className={`nav-link ${currentPage === 'my-waitlist' ? 'active' : ''}`}
                >
                  <Clock size={16} />
                  Waitlist
                </button>
              </>
            )}

            {isOrganiser && (
              <button
                onClick={() => onNavigate('organiser')}
                className={`nav-link ${currentPage === 'organiser' ? 'active' : ''}`}
              >
                <BarChart3 size={16} />
                Organiser Hub
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`}
              >
                <Layers size={16} />
                Venue Builder
              </button>
            )}

            <button
              onClick={() => onNavigate('scanner')}
              className={`nav-link ${currentPage === 'scanner' ? 'active' : ''}`}
            >
              <QrCode size={16} />
              Gate Scanner
            </button>
          </nav>
        </div>

        {/* Right side utilities & User switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* In-App Mailbox Quick Button */}
          <button
            onClick={() => onNavigate('mailbox')}
            className={`btn ${currentPage === 'mailbox' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '7px 12px', fontSize: 13, position: 'relative' }}
            title="View In-App Emails & QR Code tickets"
          >
            <Mail size={16} />
            <span>Mailbox</span>
            {emailCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                width: 18,
                height: 18,
                fontSize: 10,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
              }}>
                {emailCount}
              </span>
            )}
          </button>

          {/* User Profile / Quick Switcher */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="btn btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderColor: user.role === 'ADMIN' ? '#fbbf24' : user.role === 'ORGANISER' ? '#8b5cf6' : 'rgba(255,255,255,0.1)'
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: user.role === 'ADMIN' ? '#d97706' : user.role === 'ORGANISER' ? '#6366f1' : '#10b981',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {user.name.charAt(0)}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{user.name.split(' ')[0]}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{user.role}</div>
                </div>
                <ChevronDown size={14} color="var(--text-secondary)" />
              </button>

              {/* User Menu & 1-Click Role Switcher */}
              {showUserMenu && (
                <div
                  className="glass-card"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 280,
                    padding: '12px',
                    zIndex: 100,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
                    border: '1px solid rgba(255,255,255,0.12)'
                  }}
                >
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{user.email}</div>
                    <div style={{ marginTop: 6 }}>
                      <span className={`badge ${user.role === 'ADMIN' ? 'badge-gold' : user.role === 'ORGANISER' ? 'badge-primary' : 'badge-emerald'}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 10px', letterSpacing: 0.5 }}>
                    Switch Demo Account:
                  </div>

                  <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {demoUsers.map(du => (
                      <button
                        key={du.id}
                        onClick={() => {
                          switchUser(du.id);
                          setShowUserMenu(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: du.id === user.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                          border: 'none',
                          borderRadius: 6,
                          color: du.id === user.id ? '#a5b4fc' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: 12,
                          marginBottom: 2
                        }}
                      >
                        <span style={{ fontWeight: du.id === user.id ? 700 : 500 }}>{du.name}</span>
                        <span style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.7 }}>{du.role}</span>
                      </button>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 8 }}>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="btn btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', color: '#ef4444', padding: '6px 10px', fontSize: 12 }}
                    >
                      <LogOut size={14} />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={onOpenAuthModal} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
              <UserCheck size={16} />
              Sign In / Register
            </button>
          )}
        </div>
      </header>
    </>
  );
}
