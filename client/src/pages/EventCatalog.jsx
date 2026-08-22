import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Film,
  Music,
  Tv,
  Trophy,
  Smile,
  Briefcase,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Experiences', icon: Layers },
  { id: 'MOVIE', label: 'Movies & IMAX', icon: Film },
  { id: 'CONCERT', label: 'Concerts & Music', icon: Music },
  { id: 'THEATRE', label: 'Broadway & Theatre', icon: Tv },
  { id: 'SPORTS', label: 'Sports Matches', icon: Trophy },
  { id: 'COMEDY', label: 'Stand-up Comedy', icon: Smile },
  { id: 'CONFERENCE', label: 'Tech & Summits', icon: Briefcase }
];

export function EventCatalog({ onSelectEvent, onSelectShow }) {
  const [events, setEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [eventShows, setEventShows] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, searchQuery, selectedCity]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await api.getEvents({
        category: selectedCategory,
        search: searchQuery,
        city: selectedCity
      });
      setEvents(res.events || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEvent = async (event) => {
    setSelectedEventModal(event);
    try {
      const res = await api.getEvent(event.id);
      setEventShows(res.shows || []);
    } catch (err) {
      console.error('Failed to load event shows:', err);
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px 24px' }}>
      {/* Hero Banner with Rich Glassmorphism */}
      <div
        className="glass-card"
        style={{
          padding: '48px 36px',
          marginBottom: 40,
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 24,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: 760, position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: 'rgba(99, 102, 241, 0.2)',
            borderRadius: 20,
            border: '1px solid rgba(99, 102, 241, 0.4)',
            fontSize: 12,
            fontWeight: 800,
            color: '#a5b4fc',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 16
          }}>
            <Sparkles size={14} color="#fbbf24" /> Event-Agnostic High-Concurrency Booking Engine
          </div>

          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, lineHeight: 1.15, marginBottom: 16 }}>
            Book Real-Time Tickets for <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Movies, Concerts, Sports & Shows</span>
          </h1>

          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
            Interactive SVG seat maps with 10-minute hold TTLs, atomic concurrency guarantees, automated FIFO waitlist cascade on cancellations, and instant cryptographic QR tickets.
          </p>

          {/* Key Metric Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 13, color: '#cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="#10b981" />
              <span>Hard Concurrency Locking</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="#f59e0b" />
              <span>Configurable Hold TTL Auto-Release</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} color="#818cf8" />
              <span>Automated Waitlist Cascade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 8,
        marginBottom: 28
      }}>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
              style={{
                borderRadius: 24,
                padding: '10px 18px',
                fontSize: 13,
                whiteSpace: 'nowrap',
                fontWeight: isActive ? 800 : 600
              }}
            >
              <Icon size={16} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 32
      }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search events by title, artist, or team..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 42 }}
          />
        </div>

        <div style={{ width: 200, position: 'relative' }}>
          <MapPin size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <select
            className="form-select"
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            style={{ paddingLeft: 42 }}
          >
            <option value="">All Cities</option>
            <option value="New York">New York</option>
            <option value="Los Angeles">Los Angeles</option>
            <option value="London">London</option>
          </select>
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Loading experiences...</div>
        </div>
      ) : events.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>No events found</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Try adjusting your search criteria or category filter.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 24
        }}>
          {events.map(event => (
            <div
              key={event.id}
              className="glass-card glass-card-interactive"
              onClick={() => handleOpenEvent(event)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 16
              }}
            >
              {/* Event Image Banner */}
              <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
                <img
                  src={event.image_url || event.banner_url}
                  alt={event.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.4s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, transparent 40%, rgba(7, 9, 14, 0.95) 100%)'
                }} />

                <div style={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  display: 'flex',
                  gap: 6
                }}>
                  <span className="badge badge-primary">
                    {event.category}
                  </span>
                  {event.age_restriction && (
                    <span className="badge" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                      {event.age_restriction}
                    </span>
                  )}
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 14,
                  right: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end'
                }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#e2e8f0',
                    background: 'rgba(15, 23, 42, 0.8)',
                    padding: '4px 8px',
                    borderRadius: 6,
                    backdropFilter: 'blur(4px)'
                  }}>
                    ⏱️ {event.duration_mins} mins
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#a5b4fc',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    padding: '4px 8px',
                    borderRadius: 6
                  }}>
                    {event.show_count} {event.show_count === 1 ? 'Showtime' : 'Showtimes'}
                  </span>
                </div>
              </div>

              {/* Event Body */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 8 }}>
                    {event.title}
                  </h3>
                  <p style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: 16
                  }}>
                    {event.description}
                  </p>
                </div>

                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Organised by <strong style={{ color: 'var(--text-secondary)' }}>{event.organiser_name}</strong>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700 }}
                  >
                    <span>View Shows</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Showtimes Selection Modal */}
      {selectedEventModal && (
        <div className="modal-overlay" onClick={() => setSelectedEventModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: 8 }}>
                  {selectedEventModal.category}
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>
                  {selectedEventModal.title}
                </h2>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Select an available date & time to open the visual seat map.
                </div>
              </div>
              <button onClick={() => setSelectedEventModal(null)} className="btn btn-ghost" style={{ padding: 6 }}>
                ✕
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>
                Available Showtimes ({eventShows.length})
              </div>

              {eventShows.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No scheduled shows currently listed.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  {eventShows.map(show => {
                    const isSoldOut = show.available_seats_count === 0;
                    const dateStr = new Date(show.start_time).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    });
                    const timeStr = new Date(show.start_time).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={show.id}
                        style={{
                          background: '#0b1120',
                          border: isSoldOut ? '1px solid #7f1d1d' : '1px solid var(--border-subtle)',
                          borderRadius: 12,
                          padding: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 12
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <strong style={{ fontSize: 16, color: '#fff' }}>{dateStr} at {timeStr}</strong>
                            {isSoldOut ? (
                              <span className="badge badge-rose">Sold Out</span>
                            ) : (
                              <span className="badge badge-emerald">
                                {show.available_seats_count} Seats Available
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            📍 {show.venue_name} ({show.venue_city})
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tiers from</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>
                              ${show.pricing_tiers.STANDARD || Object.values(show.pricing_tiers)[0] || 40}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedEventModal(null);
                              onSelectShow(show.id);
                            }}
                            className={`btn ${isSoldOut ? 'btn-warning' : 'btn-primary'}`}
                            style={{ padding: '10px 18px', fontSize: 13, fontWeight: 700 }}
                          >
                            {isSoldOut ? 'Join Waitlist' : 'Select Seats →'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
