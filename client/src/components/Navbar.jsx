import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import {
  IconExplore,
  IconTickets,
  IconOffers,
  IconHelp,
  IconSignIn,
  IconEvents
} from './NavIcons';
import {
  Layers,
  BarChart3,
  QrCode,
  Mail,
  LogOut,
  ChevronDown,
  Clock,
  Ticket,
  Crown
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

      {/* Main Navigation Bar */}
      <header className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
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
              <Crown size={18} color="#ffffff" />
            </div>
            <span>TicketPass</span>
          </div>

          {/* Events Pill */}
          <button
            onClick={() => onNavigate('events')}
            className={`nav-link ${currentPage === 'events' ? 'active' : ''}`}
            style={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 8,
              padding: '6px 14px'
            }}
          >
            <IconEvents size={17} />
            <span>Events</span>
          </button>
        </div>

        {/* Center & Right Navigation Links with Futuristic Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <nav className="nav-links">
            {/* Explore Link */}
            <button
              onClick={() => onNavigate('events')}
              className={`nav-link ${currentPage === 'events' ? 'active' : ''}`}
            >
              <IconExplore size={18} />
              <span>Explore</span>
            </button>

            {/* My Tickets Link */}
            <button
              onClick={() => {
                if (!user) onOpenAuthModal();
                else onNavigate('my-bookings');
              }}
              className={`nav-link ${currentPage === 'my-bookings' ? 'active' : ''}`}
            >
              <IconTickets size={18} />
              <span>My Tickets</span>
            </button>

            {/* Offers / Waitlist Link */}
            <button
              onClick={() => {
                if (!user) onOpenAuthModal();
                else onNavigate('my-waitlist');
              }}
              className={`nav-link ${currentPage === 'my-waitlist' ? 'active' : ''}`}
            >
              <IconOffers size={18} />
              <span>Offers</span>
            </button>

            {/* Help / Mailbox Link */}
            <button
              onClick={() => {
                if (!user) onOpenAuthModal();
                else onNavigate('mailbox');
              }}
              className={`nav-link ${currentPage === 'mailbox' ? 'active' : ''}`}
            >
              <IconHelp size={18} />
              <span>Help</span>
            </button>

            {/* Organiser Hub */}
            {isOrganiser && (
              <button
                onClick={() => onNavigate('organiser')}
                className={`nav-link ${currentPage === 'organiser' ? 'active' : ''}`}
              >
                <BarChart3 size={17} className="nav-svg-icon" />
                <span>Organiser Hub</span>
              </button>
            )}

            {/* Admin Venue Builder */}
            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`}
              >
                <Layers size={17} className="nav-svg-icon" />
                <span>Venue Builder</span>
              </button>
            )}

            {/* Gate Scanner */}
            {(isOrganiser || isAdmin) && (
              <button
                onClick={() => onNavigate('scanner')}
                className={`nav-link ${currentPage === 'scanner' ? 'active' : ''}`}
              >
                <QrCode size={17} className="nav-svg-icon" />
                <span>Gate Scanner</span>
              </button>
            )}
          </nav>

          {/* User Profile Menu or Sign In Button */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="btn btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 8
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00b894, #06b6d4)',
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

              {/* User Dropdown Menu */}
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
                    <button
                      onClick={() => { onNavigate('my-bookings'); setShowUserMenu(false); }}
                      className="btn btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 12 }}
                    >
                      <IconTickets size={15} />
                      <span>My Tickets</span>
                    </button>
                    <button
                      onClick={() => { onNavigate('my-waitlist'); setShowUserMenu(false); }}
                      className="btn btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 12 }}
                    >
                      <IconOffers size={15} />
                      <span>Waitlist & Offers</span>
                    </button>
                    <button
                      onClick={() => { onNavigate('mailbox'); setShowUserMenu(false); }}
                      className="btn btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 12 }}
                    >
                      <Mail size={15} />
                      <span>In-App Mailbox {emailCount > 0 && `(${emailCount})`}</span>
                    </button>
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
            <button
              onClick={onOpenAuthModal}
              className="nav-btn-signin"
            >
              <IconSignIn size={18} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
}
