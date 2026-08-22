import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Layers,
  Plus,
  Trash2,
  Save,
  Eye,
  CheckCircle,
  Sparkles,
  MapPin,
  Lock
} from 'lucide-react';

export function AdminLayoutBuilder({ onDone }) {
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();
  const [name, setName] = useState('Starlight Premiere Cinema');
  const [address, setAddress] = useState('100 Broadway Avenue');
  const [city, setCity] = useState('New York');
  const [screenLabel, setScreenLabel] = useState('Dolby Vision Giant Screen');
  const [sections, setSections] = useState([
    { name: 'Royal VIP Recliners', rows: ['A', 'B'], cols: 10, defaultCategory: 'EXECUTIVE' },
    { name: 'Center Premium', rows: ['C', 'D', 'E'], cols: 12, defaultCategory: 'PREMIUM' },
    { name: 'General Stalls', rows: ['F', 'G', 'H'], cols: 12, defaultCategory: 'BALCONY' }
  ]);
  const [aislesAfterCols, setAislesAfterCols] = useState([4, 8]);
  const [isSaving, setIsSaving] = useState(false);

  // Add section
  const handleAddSection = () => {
    setSections(prev => [
      ...prev,
      { name: `Section ${prev.length + 1}`, rows: ['I', 'J'], cols: 10, defaultCategory: 'BALCONY' }
    ]);
  };

  const handleUpdateSection = (index, field, value) => {
    setSections(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveSection = (index) => {
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveVenue = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.createVenue({
        name,
        address,
        city,
        screenLabel,
        sections,
        aislesAfterCols
      });
      showToast(`Venue "${name}" created with ${res.venue.capacity} seats!`, 'success');
      if (onDone) onDone();
    } catch (err) {
      console.error('Failed to create venue:', err);
      showToast(err.message || 'Failed to create venue', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Compute total capacity
  const totalCapacity = sections.reduce((sum, sec) => sum + (sec.rows.length * (sec.cols || 10)), 0);

  // Auth guard
  if (!user || !isAdmin) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: 48, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👑</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fbbf24', marginBottom: 8 }}>Admin Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            The Venue & Seat Layout Builder is only accessible to <strong style={{ color: '#fbbf24' }}>Admin</strong> accounts.
            Use the role switcher bar at the top to switch to the Admin account.
          </p>
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 10,
            padding: '12px 18px',
            fontSize: 13,
            color: '#fcd34d'
          }}>
            <strong>👑 Admin:</strong> admin@ticketpass.app &nbsp;/&nbsp; Password@123
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--bg-secondary)', borderRadius: 20, color: 'var(--accent-gold)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
            <Sparkles size={14} /> Admin Visual Venue Architect
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            Venue & Seat Layout Builder
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Design custom seating grids, configure tier zones (Executive, Premium, Balcony), and preview live SVG maps.
          </p>
        </div>

        <button
          onClick={handleSaveVenue}
          disabled={isSaving || sections.length === 0}
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: 14, fontWeight: 800 }}
        >
          <Save size={16} />
          <span>{isSaving ? 'Building Venue...' : `Save Venue (${totalCapacity} Seats)`}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 460px) 1fr', gap: 24 }}>
        {/* Left Column: Form Configuration */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
            1. Venue Information
          </h3>

          <div className="form-group">
            <label className="form-label">Venue Name</label>
            <input
              type="text"
              required
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                type="text"
                required
                className="form-input"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                required
                className="form-input"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Stage / Screen Display Label</label>
            <input
              type="text"
              className="form-input"
              value={screenLabel}
              onChange={e => setScreenLabel(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              2. Seating Sections ({sections.length})
            </h3>
            <button onClick={handleAddSection} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>
              <Plus size={14} />
              <span>Add Section</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sections.map((sec, idx) => (
              <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>Section {idx + 1}</strong>
                  {sections.length > 1 && (
                    <button onClick={() => handleRemoveSection(idx)} className="btn btn-ghost" style={{ padding: 4, color: '#ef4444' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Section Name"
                    value={sec.name}
                    onChange={e => handleUpdateSection(idx, 'name', e.target.value)}
                    style={{ fontSize: 13, padding: '8px 10px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cols</label>
                    <input
                      type="number"
                      min={4}
                      max={20}
                      className="form-input"
                      value={sec.cols}
                      onChange={e => handleUpdateSection(idx, 'cols', parseInt(e.target.value, 10))}
                      style={{ fontSize: 12, padding: '6px 8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rows (CSV)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={sec.rows.join(',')}
                      onChange={e => handleUpdateSection(idx, 'rows', e.target.value.split(',').map(r => r.trim()).filter(Boolean))}
                      style={{ fontSize: 12, padding: '6px 8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Category Tier</label>
                    <select
                      className="form-select"
                      value={sec.defaultCategory}
                      onChange={e => handleUpdateSection(idx, 'defaultCategory', e.target.value)}
                      style={{ fontSize: 12, padding: '6px 8px' }}
                    >
                      <option value="EXECUTIVE">Executive (Gold)</option>
                      <option value="PREMIUM">Premium (Indigo)</option>
                      <option value="BALCONY">Balcony (Emerald)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live SVG Seating Preview */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              Live Layout SVG Preview
            </h3>
            <span className="badge badge-emerald">
              Total: {totalCapacity} Seats
            </span>
          </div>

          <div style={{
            flex: 1,
            minHeight: 450,
            background: 'var(--bg-primary)',
            borderRadius: 14,
            border: '1px solid var(--border-subtle)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'auto'
          }}>
            {/* Screen Banner */}
            <div style={{
              width: 380,
              padding: '6px 16px',
              background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)',
              borderTop: '2px solid var(--accent-primary)',
              borderRadius: '80px 80px 0 0',
              textAlign: 'center',
              color: 'var(--accent-primary)',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 24
            }}>
              {screenLabel || 'Screen Area'}
            </div>

            {/* Render Simulated Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', alignItems: 'center' }}>
              {sections.map((sec, sIdx) => (
                <div key={sIdx} style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    {sec.name} ({sec.defaultCategory})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                    {sec.rows.map((rowLabel) => (
                      <div key={rowLabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', width: 16, textAlign: 'right' }}>
                          {rowLabel}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {Array.from({ length: sec.cols || 10 }, (_, cIdx) => {
                            const isAisle = aislesAfterCols.includes(cIdx + 1);
                            const color = sec.defaultCategory === 'EXECUTIVE' ? 'var(--accent-gold)' : sec.defaultCategory === 'PREMIUM' ? 'var(--accent-primary)' : 'var(--accent-emerald)';

                            return (
                              <React.Fragment key={cIdx}>
                                <div
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    background: color,
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 8,
                                    fontWeight: 800,
                                    color: '#ffffff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                  }}
                                >
                                  {cIdx + 1}
                                </div>
                                {isAisle && <div style={{ width: 14 }} />}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
