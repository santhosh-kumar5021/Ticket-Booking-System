import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';

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
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('events');
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [claimOfferData, setClaimOfferData] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleNavigate = (page, data = null) => {
    if (page === 'show-booking' && data?.showId) {
      setSelectedShowId(data.showId);
    } else if (page === 'claim-waitlist' && data) {
      setClaimOfferData(data);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenAuthModal={() => setShowAuthModal(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
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
          />
        )}

        {currentPage === 'admin' && (
          <AdminLayoutBuilder
            onDone={() => handleNavigate('organiser')}
          />
        )}

        {currentPage === 'scanner' && (
          <ScannerPage />
        )}

        {currentPage === 'mailbox' && (
          <MailboxPage
            onClaimWaitlist={(waitlistId, claimToken) => handleNavigate('claim-waitlist', { waitlistId, claimToken })}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(7, 9, 14, 0.95)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '32px 24px',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--text-muted)'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <strong>TicketPass Platform</strong> — Real-Time High-Concurrency Seated Event Engine
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
