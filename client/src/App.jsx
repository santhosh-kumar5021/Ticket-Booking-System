import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { MessageSquare } from 'lucide-react';

import { EventCatalog } from './pages/EventCatalog';
import { ShowBookingPage } from './pages/ShowBookingPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { MyWaitlistPage } from './pages/MyWaitlistPage';
import { ClaimWaitlistPage } from './pages/ClaimWaitlistPage';
import { OrganiserDashboard } from './pages/OrganiserDashboard';
import { AdminLayoutBuilder } from './pages/AdminLayoutBuilder';
import { ScannerPage } from './pages/ScannerPage';
import { MailboxPage } from './pages/MailboxPage';

function AppContent() {
  const { user, isOrganiser, isAdmin } = useAuth();
  const getInitialPage = () => {
    const path = window.location.pathname.replace('/', '');
    if (path && ['events', 'my-bookings', 'my-waitlist', 'organiser', 'admin', 'scanner', 'mailbox'].includes(path)) {
      return path;
    }
    return 'events';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [claimOfferData, setClaimOfferData] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Automatically adjust view when role changes ONLY if they are on a restricted page or default
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN' && (currentPage === 'events' || currentPage === 'my-bookings' || currentPage === 'my-waitlist')) {
        setCurrentPage('admin');
      } else if (user.role === 'ORGANISER' && (currentPage === 'events' || currentPage === 'my-bookings' || currentPage === 'my-waitlist')) {
        setCurrentPage('organiser');
      }
    }
  }, [user?.role]); // only run when role changes, not on every page navigation


  const handleNavigate = (page, data = null) => {
    if (page === 'show-booking' && data?.showId) {
      setSelectedShowId(data.showId);
    } else if (page === 'claim-waitlist' && data) {
      setClaimOfferData(data);
    }
    setCurrentPage(page);
    window.history.pushState({}, '', `/${page}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Top Navigation */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenAuthModal={() => setShowAuthModal(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, backgroundColor: 'var(--bg-primary)' }}>
        {currentPage === 'events' && (
          <EventCatalog
            onSelectEvent={(event) => {}}
            onSelectShow={(showId) => handleNavigate('show-booking', { showId })}
          />
        )}

        {currentPage === 'show-booking' && selectedShowId && (
          <ShowBookingPage
            showId={selectedShowId}
            onBack={() => handleNavigate('events')}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}

        {currentPage === 'my-bookings' && (
          <MyBookingsPage
            onExploreEvents={() => handleNavigate('events')}
          />
        )}

        {currentPage === 'my-waitlist' && (
          <MyWaitlistPage
            onClaimOffer={(waitlistId, claimToken) => handleNavigate('claim-waitlist', { waitlistId, claimToken })}
            onExploreEvents={() => handleNavigate('events')}
          />
        )}

        {currentPage === 'claim-waitlist' && claimOfferData && (
          <ClaimWaitlistPage
            waitlistId={claimOfferData.waitlistId}
            claimToken={claimOfferData.claimToken}
            onDone={() => handleNavigate('my-bookings')}
          />
        )}

        {currentPage === 'organiser' && (
          <OrganiserDashboard
            onOpenScanner={() => handleNavigate('scanner')}
            onSelectShow={(showId) => handleNavigate('show-booking', { showId })}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}

        {currentPage === 'admin' && (
          <AdminLayoutBuilder
            onDone={() => handleNavigate('organiser')}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}

        {currentPage === 'scanner' && (
          <ScannerPage
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}

        {currentPage === 'mailbox' && (
          <MailboxPage
            onClaimWaitlist={(waitlistId, claimToken) => handleNavigate('claim-waitlist', { waitlistId, claimToken })}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: '#07090e',
        borderTop: '1px solid var(--border-subtle)',
        padding: '28px 24px',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--text-muted)'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>TicketPass</strong> — High-Concurrency Seated Event Ticketing Engine
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            PostgreSQL Concurrency · Auto-Releasing Seat Holds · Real-Time Waitlist Pipeline
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}

      {/* Floating Chat Support Widget matching screenshot */}
      <button
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: '#00b894',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          boxShadow: '0 6px 20px rgba(0, 184, 148, 0.4)',
          cursor: 'pointer',
          zIndex: 90,
          transition: 'transform 0.2s ease, background-color 0.2s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="Live Support & Feedback"
      >
        <MessageSquare size={20} />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
