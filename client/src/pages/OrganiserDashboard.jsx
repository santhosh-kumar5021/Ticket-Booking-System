import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import {
  BarChart3,
  DollarSign,
  Users,
  Ticket,
  Percent,
  PlusCircle,
  Calendar,
  Clock,
  Layers,
  MapPin,
  Sparkles,
  CheckCircle,
  QrCode
} from 'lucide-react';

export function OrganiserDashboard({ onOpenScanner, onSelectShow }) {
  const { showToast } = useNotification();
  const [analytics, setAnalytics] = useState(null);
  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeedingData, setIsSeedingData] = useState(false);

  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showScheduleShowModal, setShowScheduleShowModal] = useState(false);

  // New Event Form
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    category: 'CONCERT',
    duration_mins: 120,
    age_restriction: 'All Ages',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800'
  });

  // New Show Form
  const [showForm, setShowForm] = useState({
    event_id: '',
    venue_id: '',
    start_time: '',
    end_time: '',
    hold_ttl_minutes: 10,
    pricing_executive: 120,
    pricing_premium: 80,
    pricing_balcony: 40
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, venuesRes, eventsRes] = await Promise.all([
        api.getOrganiserAnalytics(),
        api.getVenues(),
        api.getOrganiserEvents()
      ]);
      setAnalytics(analyticsRes);
      const venueList = venuesRes.venues || [];
      const eventList = eventsRes.events || [];
      setVenues(venueList);
      setEvents(eventList);

      if (eventList.length > 0) {
        setShowForm(prev => ({ ...prev, event_id: eventList[0].id }));
      }
      if (venueList.length > 0) {
        setShowForm(prev => ({ ...prev, venue_id: venueList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load organiser dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeedingData(true);
    try {
      await api.seedSampleData();
      showToast('✅ Demo data seeded! 3 venues, 6 events, 6 shows loaded.', 'success');
      await fetchDashboardData();
    } catch (err) {
      showToast('Failed to seed data: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSeedingData(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await api.createEvent(eventForm);
      showToast('Event created successfully!', 'success');
      setShowCreateEventModal(false);
      fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to create event', 'error');
    }
  };

  const handleScheduleShow = async (e) => {
    e.preventDefault();
    try {
      await api.createShow({
        event_id: showForm.event_id,
        venue_id: showForm.venue_id,
        start_time: new Date(showForm.start_time).toISOString(),
        end_time: new Date(showForm.end_time || showForm.start_time).toISOString(),
        hold_ttl_minutes: parseInt(showForm.hold_ttl_minutes, 10),
        pricing_tiers: {
          EXECUTIVE: parseFloat(showForm.pricing_executive),
          PREMIUM: parseFloat(showForm.pricing_premium),
          BALCONY: parseFloat(showForm.pricing_balcony)
        }
      });
      showToast('Show scheduled with seat layout!', 'success');
      setShowScheduleShowModal(false);
      fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to schedule show', 'error');
    }
  };

  if (isLoading || !analytics) {
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px', textAlign: 'center', color: 'var(--text-primary)' }}>
        <h3>Loading Organiser Analytics & Sales Metrics...</h3>
      </div>
    );
  }

  const summary = analytics.summary || {};
  const shows = analytics.shows || [];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--bg-secondary)', borderRadius: 20, color: 'var(--accent-primary)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
            <Sparkles size={14} /> Organiser Control Center
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            Revenue & Show Analytics
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleSeedData}
            disabled={isSeedingData}
            className="btn btn-outline"
            style={{ padding: '10px 18px', borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24' }}
            title="Load demo events, venues & shows into the database"
          >
            <Sparkles size={16} />
            <span>{isSeedingData ? 'Seeding...' : 'Load Demo Data'}</span>
          </button>

          <button onClick={() => setShowCreateEventModal(true)} className="btn btn-outline" style={{ padding: '10px 18px' }}>
            <PlusCircle size={16} />
            <span>Create Event</span>
          </button>

          <button onClick={() => setShowScheduleShowModal(true)} className="btn btn-primary" style={{ padding: '10px 18px' }}>
            <Calendar size={16} />
            <span>Schedule New Show</span>
          </button>

          <button onClick={onOpenScanner} className="btn btn-success" style={{ padding: '10px 18px' }}>
            <QrCode size={16} />
            <span>Gate Scanner</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20,
        marginBottom: 36
      }}>
        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Gross Revenue</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#10b981', lineHeight: 1.1 }}>
            ${summary.total_revenue?.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Across all scheduled shows
          </div>
        </div>

        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Confirmed Bookings</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={20} color="#818cf8" />
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {summary.total_bookings || 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Total tickets sold
          </div>
        </div>

        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Gate Check-In Rate</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#06b6d4" />
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#38bdf8', lineHeight: 1.1 }}>
            {summary.check_in_rate || 0}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {summary.total_checked_in || 0} attendees scanned at gate
          </div>
        </div>

        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Experiences</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#fbbf24', lineHeight: 1.1 }}>
            {summary.total_shows || 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Across {summary.total_events || 0} live events
          </div>
        </div>
      </div>

      {/* Shows & Real-time Seat Occupancy Breakdown Table */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
          Live Show Performance & Seat Map Breakdown
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Event & Date</th>
                <th style={{ padding: '12px 16px' }}>Venue</th>
                <th style={{ padding: '12px 16px' }}>Booked / Total</th>
                <th style={{ padding: '12px 16px' }}>Live Holds</th>
                <th style={{ padding: '12px 16px' }}>Waitlist Queue</th>
                <th style={{ padding: '12px 16px' }}>Revenue</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shows.map(show => {
                const totalSeats = (show.booked_seats || 0) + (show.available_seats || 0) + (show.held_seats || 0);
                const occupancyPct = totalSeats > 0 ? Math.round(((show.booked_seats || 0) / totalSeats) * 100) : 0;

                return (
                  <tr key={show.show_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{show.event_title}</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(show.start_time).toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {show.venue_name}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{show.booked_seats} / {totalSeats}</span>
                        <span className={`badge ${occupancyPct > 80 ? 'badge-emerald' : occupancyPct > 40 ? 'badge-primary' : 'badge'}`} style={{ fontSize: 10 }}>
                          {occupancyPct}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {show.held_seats > 0 ? (
                        <span className="badge badge-amber pulse-amber">{show.held_seats} active holds</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0 holds</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {show.active_waitlist_count > 0 ? (
                        <span className="badge badge-gold">⚡ {show.active_waitlist_count} waiting</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0 waiting</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#10b981' }}>
                      ${show.revenue?.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => onSelectShow(show.show_id)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        View Live Grid →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="modal-overlay" onClick={() => setShowCreateEventModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Create New Event</h3>
              <button onClick={() => setShowCreateEventModal(false)} className="btn btn-ghost" style={{ padding: 6 }}>✕</button>
            </div>
            <form onSubmit={handleCreateEvent} style={{ padding: 24 }}>
              <div className="form-group">
                <label className="form-label">Event Title</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Glastonbury Music Festival 2026"
                  value={eventForm.title}
                  onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Event Category</label>
                <select
                  className="form-select"
                  value={eventForm.category}
                  onChange={e => setEventForm({ ...eventForm, category: e.target.value })}
                >
                  <option value="CONCERT">Concert / Live Music</option>
                  <option value="MOVIE">Movie / Cinema Screening</option>
                  <option value="THEATRE">Theatre / Musical</option>
                  <option value="SPORTS">Sports Match / Stadium Game</option>
                  <option value="COMEDY">Stand-up Comedy</option>
                  <option value="CONFERENCE">Conference / Summit</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Event details, artist highlights, and synopsis..."
                  value={eventForm.description}
                  onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Runtime (Minutes)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={eventForm.duration_mins}
                    onChange={e => setEventForm({ ...eventForm, duration_mins: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Age Restriction</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. PG-13, 18+, All Ages"
                    value={eventForm.age_restriction}
                    onChange={e => setEventForm({ ...eventForm, age_restriction: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Poster Image URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={eventForm.image_url}
                  onChange={e => setEventForm({ ...eventForm, image_url: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15, fontWeight: 700 }}>
                Publish Event
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Show Modal */}
      {showScheduleShowModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Schedule Show at Venue</h3>
              <button onClick={() => setShowScheduleShowModal(false)} className="btn btn-ghost" style={{ padding: 6 }}>✕</button>
            </div>
            <form onSubmit={handleScheduleShow} style={{ padding: 24 }}>
              <div className="form-group">
                <label className="form-label">Select Event</label>
                <select
                  className="form-select"
                  value={showForm.event_id}
                  onChange={e => setShowForm({ ...showForm, event_id: e.target.value })}
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title} ({ev.category})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Venue (Seat Layout)</label>
                {venues.length === 0 ? (
                  <div style={{
                    padding: '12px 14px',
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 8,
                    color: '#fbbf24',
                    fontSize: 13
                  }}>
                    ⚠️ No venues found. Click <strong>"Load Demo Data"</strong> first to populate venues, or ask an Admin to create a venue.
                  </div>
                ) : (
                  <select
                    className="form-select"
                    value={showForm.venue_id}
                    onChange={e => setShowForm({ ...showForm, venue_id: e.target.value })}
                    required
                  >
                    <option value="" disabled>-- Select a Venue --</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name} — {v.city} ({v.capacity} seats)</option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="form-input"
                    value={showForm.start_time}
                    onChange={e => setShowForm({ ...showForm, start_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hold TTL (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className="form-input"
                    value={showForm.hold_ttl_minutes}
                    onChange={e => setShowForm({ ...showForm, hold_ttl_minutes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
                <label className="form-label" style={{ marginBottom: 10 }}>Tier-Based Pricing ($)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--accent-gold)', fontWeight: 700 }}>Executive</label>
                    <input
                      type="number"
                      className="form-input"
                      value={showForm.pricing_executive}
                      onChange={e => setShowForm({ ...showForm, pricing_executive: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 700 }}>Premium</label>
                    <input
                      type="number"
                      className="form-input"
                      value={showForm.pricing_premium}
                      onChange={e => setShowForm({ ...showForm, pricing_premium: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--accent-emerald)', fontWeight: 700 }}>Balcony</label>
                    <input
                      type="number"
                      className="form-input"
                      value={showForm.pricing_balcony}
                      onChange={e => setShowForm({ ...showForm, pricing_balcony: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15, fontWeight: 700 }}>
                Schedule Show & Initialize Seat Grid
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
