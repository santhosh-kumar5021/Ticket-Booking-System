import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import {
  Mail,
  Trash2,
  RefreshCw,
  Clock,
  QrCode,
  Sparkles,
  ArrowRight,
  Inbox
} from 'lucide-react';

export function MailboxPage({ onClaimWaitlist }) {
  const { showToast } = useNotification();
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const res = await api.getEmails();
      setEmails(res.emails || []);
      if (res.emails?.length > 0 && !selectedEmail) {
        // Load details for first email
        loadEmailDetails(res.emails[0].id);
      }
    } catch (err) {
      console.error('Failed to load emails:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmailDetails = async (id) => {
    try {
      const res = await api.getEmail(id);
      setSelectedEmail(res.email);
    } catch (err) {
      console.error('Failed to load email details:', err);
    }
  };

  const handleClear = async () => {
    try {
      await api.clearEmails();
      setEmails([]);
      setSelectedEmail(null);
      showToast('Mailbox cleared', 'info');
    } catch (err) {
      showToast('Failed to clear mailbox', 'error');
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: 20, color: '#a5b4fc', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
            <Sparkles size={14} /> Built-In In-App Mailbox Previewer
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: 0 }}>
            Simulated Inbox & QR Ticket Emails
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Inspect all dispatched booking confirmations, signed QR passes, and time-limited waitlist reallocation alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchEmails} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: 13 }}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          {emails.length > 0 && (
            <button onClick={handleClear} className="btn btn-ghost" style={{ color: '#ef4444', padding: '8px 14px', fontSize: 13 }}>
              <Trash2 size={15} />
              <span>Clear Inbox</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          Loading mailbox...
        </div>
      ) : emails.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <Inbox size={28} color="#818cf8" />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Mailbox is Empty</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto' }}>
            When you complete a booking or receive a waitlist allocation, the generated HTML ticket email will appear here immediately.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 24, minHeight: 600 }}>
          {/* Email List Left Panel */}
          <div className="glass-card" style={{ padding: 16, overflowY: 'auto', maxHeight: 700 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '6px 8px 12px 8px' }}>
              Messages ({emails.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {emails.map(em => {
                const isSelected = selectedEmail?.id === em.id;
                const isWaitlist = em.type === 'WAITLIST_OFFER';

                return (
                  <div
                    key={em.id}
                    onClick={() => loadEmailDetails(em.id)}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: isSelected ? 'rgba(99, 102, 241, 0.18)' : '#0b1120',
                      border: isSelected ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className={`badge ${isWaitlist ? 'badge-amber' : em.type === 'BOOKING_CONFIRMATION' ? 'badge-primary' : 'badge-rose'}`} style={{ fontSize: 10 }}>
                        {em.type.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(em.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>
                      {em.subject}
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      To: {em.recipient_name} ({em.recipient_email})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Email HTML Viewer Right Panel */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            {selectedEmail ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Email Header Info */}
                <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16, marginBottom: 20 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
                    {selectedEmail.subject}
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span><strong>To:</strong> {selectedEmail.recipient_name} &lt;{selectedEmail.recipient_email}&gt;</span>
                    <span>•</span>
                    <span><strong>Sent:</strong> {new Date(selectedEmail.sent_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* HTML Render Container */}
                <div style={{
                  flex: 1,
                  background: '#07090e',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflowY: 'auto',
                  maxHeight: 520,
                  padding: 12
                }}>
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Select a message from the list to view its formatted HTML email pass
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
