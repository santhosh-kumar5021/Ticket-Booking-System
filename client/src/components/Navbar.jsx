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
  Clock,
  User
} from 'lucide-react';

export function Navbar({ currentPage, onNavigate, onOpenAuthModal }) {
  const { user, logout, isOrganiser, isAdmin, isCustomer } = useAuth();
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
  }, [activeOffer, clearOffer]);

  return (
    <>
      {/* Top Banner when a Waitlist Offer is Active (Only for Customers who received an offer) */}
      {activeOffer && isCustomer && (
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

      {/* Main Navigation Bar — Filtered Strictly by Role */}
      <header className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* Brand Logo */}
          <div
            className="nav-brand"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (isAdmin) onNavigate('admin');
              else if (isOrganiser) onNavigate('organiser');
              else onNavigate('events');
            }}
          >
            <div className="nav-brand-icon">
              <Ticket size={20} color="#ffffff" />
            </div>
            <span>Ticket<span style={{ color: '#818cf8' }}>Pass</span></span>
          </div>

          {/* Navigation Links — Strictly Role-Based */}
          <nav className="nav-links">
            {/* 1. Everyone sees Event Catalog */}
            <button
              onClick={() => onNavigate('events')}
              className={`nav-link ${currentPage === 'events' ? 'active' : ''}`}
            >
              <Calendar size={15} />
              <span>Events</span>
            </button>

            {/* 2. Customer specific views */}
            {user && user.role === 'CUSTOMER' && (
              <>
                <button
                  onClick={() => onNavigate('my-bookings')}
                  className={`nav-link ${currentPage === 'my-bookings' ? 'active' : ''}`}
                >
                  <Ticket size={15} />
                  <span>My Tickets</span>
                </button>

                <button
                  onClick={() => onNavigate('my-waitlist')}
                  className={`nav-link ${currentPage === 'my-waitlist' ? 'active' : ''}`}
                >
                  <Clock size={15} />
                  <span>Waitlist</span>
                </button>
              </>
            )}

            {/* 3. Organiser specific views */}
            {isOrganiser && (
              <button
                onClick={() => onNavigate('organiser')}
                className={`nav-link ${currentPage === 'organiser' ? 'active' : ''}`}
              >
                <BarChart3 size={15} />
                <span>Organiser Hub</span>
              </button>
            )}

            {/* 4. Admin specific views */}
            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`}
              >
                <Layers size={15} />
                <span>Venue Builder</span>
              </button>
            )}

            {/* 5. Gate Scanner only for Organiser and Admin (Venue Staff) */}
            {(isOrganiser || isAdmin) && (
              <button
                onClick={() => onNavigate('scanner')}
                className={`nav-link ${currentPage === 'scanner' ? 'active' : ''}`}
              >
                <QrCode size={15} />
                <span>Gate Scanner</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right side Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* In-App Mailbox */}
          {user && (
            <button
              onClick={() => onNavigate('mailbox')}
              className={`btn ${currentPage === 'mailbox' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '7px 14px', fontSize: 13, position: 'relative' }}
              title="View In-App Emails & QR Code tickets"
            >
              <Mail size={15} />
              <span>Mailbox</span>
              {emailCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {emailCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile Menu */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="btn btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px'
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {user.name.charAt(0)}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{user.name.split(' ')[0]}</div>
                </div>
                <ChevronDown size={14} color="var(--text-secondary)" />
              </button>

              {/* Clean User Dropdown Menu */}
              {showUserMenu && (
                <div
                  className="glass-card"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 240,
                    padding: '12px',
                    zIndex: 100,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.85)',
                    border: '1px solid rgba(255,255,255,0.12)'
                  }}
                >
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    <div style={{ marginTop: 6 }}>
                      <span className={`badge ${user.role === 'ADMIN' ? 'badge-gold' : user.role === 'ORGANISER' ? 'badge-primary' : 'badge-emerald'}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>

                  {/* Quick role shortcuts */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
                    {user.role === 'CUSTOMER' && (
                      <>
                        <button
                          onClick={() => { onNavigate('my-bookings'); setShowUserMenu(false); }}
                          className="btn btn-ghost"
                          style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 12 }}
                        >
                          <Ticket size={14} />
                          <span>My Tickets</span>
                        </button>
                        <button
                          onClick={() => { onNavigate('my-waitlist'); setShowUserMenu(false); }}
                          className="btn btn-ghost"
                          style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 12 }}
                        >
                          <Clock size={14} />
                          <span>Waitlist</span>
                        </button>
                      </>
                    )}

                    {isOrganiser && (
                      <button
                        onClick={() => { onNavigate('organiser'); setShowUserMenu(false); }}
                        className="btn btn-ghost"
                        style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 12 }}
                      >
                        <BarChart3 size={14} />
                        <span>Organiser Hub</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => { onNavigate('admin'); setShowUserMenu(false); }}
                        className="btn btn-ghost"
                        style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 12 }}
                      >
                        <Layers size={14} />
                        <span>Venue Builder</span>
                      </button>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                        onNavigate('events');
                      }}
                      className="btn btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', color: '#ef4444', padding: '6px 10px', fontSize: 12 }}
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={onOpenAuthModal} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
              <UserCheck size={15} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
}
