import db from './connection.js';

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CUSTOMER',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      layout_config TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS seats (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      row_label TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      section TEXT NOT NULL,
      default_category TEXT NOT NULL,
      is_accessible INTEGER DEFAULT 0,
      x_pos REAL,
      y_pos REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      organiser_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      image_url TEXT,
      banner_url TEXT,
      duration_mins INTEGER NOT NULL DEFAULT 120,
      age_restriction TEXT DEFAULT 'All Ages',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shows (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      hold_ttl_minutes INTEGER NOT NULL DEFAULT 10,
      pricing_tiers TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_reference TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      qr_code_data TEXT NOT NULL,
      checked_in_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS show_seats (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      held_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      hold_expires_at DATETIME,
      booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
      version INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS booking_seats (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      show_seat_id TEXT NOT NULL REFERENCES show_seats(id) ON DELETE CASCADE,
      price_paid REAL NOT NULL,
      seat_category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS waitlist_entries (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seat_category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'WAITING',
      priority_order INTEGER NOT NULL,
      offer_expires_at DATETIME,
      offered_show_seat_id TEXT REFERENCES show_seats(id) ON DELETE SET NULL,
      claim_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS emails_log (
      id TEXT PRIMARY KEY,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      subject TEXT NOT NULL,
      type TEXT NOT NULL,
      html_body TEXT NOT NULL,
      qr_code_data TEXT,
      metadata TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indices for high performance concurrent transactions
    CREATE INDEX IF NOT EXISTS idx_show_seats_show_status ON show_seats(show_id, status);
    CREATE INDEX IF NOT EXISTS idx_show_seats_held_expires ON show_seats(status, hold_expires_at);
    CREATE INDEX IF NOT EXISTS idx_show_seats_seat ON show_seats(seat_id);
    CREATE INDEX IF NOT EXISTS idx_waitlist_lookup ON waitlist_entries(show_id, seat_category, status, priority_order);
    CREATE INDEX IF NOT EXISTS idx_waitlist_offer_expires ON waitlist_entries(status, offer_expires_at);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(booking_reference);
    CREATE INDEX IF NOT EXISTS idx_seats_venue ON seats(venue_id);
    CREATE INDEX IF NOT EXISTS idx_shows_event ON shows(event_id);
    CREATE INDEX IF NOT EXISTS idx_shows_venue ON shows(venue_id);
  `);

  console.log('Database initialized successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('init.js')) {
  initDatabase();
}
