import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './connection.js';
import { initDatabase } from './init.js';
import { generateSignedQRCode } from '../utils/qr.js';

export async function seedDatabase() {
  console.log('--- Starting Database Seeding ---');
  initDatabase();

  // Clear existing records to ensure clean reproducible state
  db.exec(`
    DELETE FROM emails_log;
    DELETE FROM waitlist_entries;
    DELETE FROM booking_seats;
    DELETE FROM bookings;
    DELETE FROM show_seats;
    DELETE FROM shows;
    DELETE FROM events;
    DELETE FROM seats;
    DELETE FROM venues;
    DELETE FROM users;
  `);

  console.log('Cleared existing data.');

  // 1. Seed Users
  const passwordHash = await bcrypt.hash('Password@123', 10);
  const adminHash = await bcrypt.hash('Admin@123', 10);

  const users = [
    { id: 'usr-admin-1', name: 'System Administrator', email: 'admin@ticketpass.app', password_hash: adminHash, role: 'ADMIN' },
    { id: 'usr-org-1', name: 'Starlight Cinema & Theatres', email: 'cinema@starlight.com', password_hash: passwordHash, role: 'ORGANISER' },
    { id: 'usr-org-2', name: 'LivePulse Concerts & Sports', email: 'events@livepulse.com', password_hash: passwordHash, role: 'ORGANISER' },
    { id: 'usr-cust-1', name: 'Alex Johnson', email: 'alex.johnson@example.com', password_hash: passwordHash, role: 'CUSTOMER' },
    { id: 'usr-cust-2', name: 'Samantha Reed', email: 'samantha.reed@example.com', password_hash: passwordHash, role: 'CUSTOMER' },
    { id: 'usr-cust-3', name: 'Marcus Chen', email: 'marcus.chen@example.com', password_hash: passwordHash, role: 'CUSTOMER' },
    { id: 'usr-cust-4', name: 'Elena Rostova', email: 'elena.rostova@example.com', password_hash: passwordHash, role: 'CUSTOMER' }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, u.password_hash, u.role);
  }
  console.log(`Seeded ${users.length} users.`);

  // 2. Helper to generate Venue + Layout + Seats
  const insertVenue = db.prepare(`
    INSERT INTO venues (id, name, address, city, capacity, layout_config)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertSeat = db.prepare(`
    INSERT INTO seats (id, venue_id, row_label, seat_number, section, default_category, is_accessible, x_pos, y_pos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 2. Helper to generate Venue + Layout + Seats
  const standardVenueConfig = {
    screenLabel: 'Main Stage / Screen',
    sections: [
      { name: 'Balcony', rows: ['A', 'B', 'C', 'D'], cols: 12, defaultCategory: 'BALCONY' },
      { name: 'Premium', rows: ['E', 'F'], cols: 12, defaultCategory: 'PREMIUM' },
      { name: 'Executive', rows: ['G', 'H', 'I', 'J'], cols: 12, defaultCategory: 'EXECUTIVE' }
    ],
    aislesAfterCols: [6]
  };

  const venue1Id = 'ven-cineplex-imax';
  const venue2Id = 'ven-broadway-theatre';
  const venue3Id = 'ven-apex-arena';

  const venuesToSeed = [
    { id: venue1Id, name: 'Cineplex Grand IMAX Arena', address: '742 Evergreen Blvd, Downtown', city: 'New York' },
    { id: venue2Id, name: 'Royal Broadway Heritage Theatre', address: '230 West 44th Street, Manhattan', city: 'New York' },
    { id: venue3Id, name: 'Apex Grand Multi-Event Arena', address: '1000 Olympic Parkway', city: 'Los Angeles' }
  ];

  for (const v of venuesToSeed) {
    insertVenue.run(v.id, v.name, v.address, v.city, 120, JSON.stringify(standardVenueConfig));
    
    const allRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    allRows.forEach((row, rIdx) => {
      let cat = 'EXECUTIVE';
      let section = 'Executive';
      if (['A', 'B', 'C', 'D'].includes(row)) {
        cat = 'BALCONY';
        section = 'Balcony';
      } else if (['E', 'F'].includes(row)) {
        cat = 'PREMIUM';
        section = 'Premium';
      }

      for (let col = 1; col <= 12; col++) {
        const seatId = `seat-${v.id}-${row}-${col}`;
        insertSeat.run(seatId, v.id, row, col, section, cat, 0, col * 40, rIdx * 35);
      }
    });
  }

  console.log('Seeded 3 Venues and comprehensive seat layouts.');

  // 3. Seed Events
  const insertEvent = db.prepare(`
    INSERT INTO events (id, organiser_id, title, description, category, image_url, banner_url, duration_mins, age_restriction, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const events = [
    {
      id: 'evt-interstellar',
      organiser_id: 'usr-org-1',
      title: 'Interstellar: 10th Anniversary IMAX 70mm',
      description: 'Experience Christopher Nolan’s breathtaking sci-fi masterpiece remastered in IMAX 70mm with ground-shaking 12-channel surround sound. Mankind was born on Earth, it was never meant to die here.',
      category: 'MOVIE',
      image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
      banner_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80',
      duration_mins: 169,
      age_restriction: 'PG-13',
      status: 'ACTIVE'
    },
    {
      id: 'evt-coldplay',
      organiser_id: 'usr-org-2',
      title: 'Coldplay: Music of the Spheres World Tour',
      description: 'The monumental global stadium tour featuring sensational light displays, kinetic dance floors, and anthems including Yellow, Viva La Vida, Fix You, and higher power.',
      category: 'CONCERT',
      image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
      banner_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&auto=format&fit=crop&q=80',
      duration_mins: 150,
      age_restriction: 'All Ages',
      status: 'ACTIVE'
    },
    {
      id: 'evt-hamilton',
      organiser_id: 'usr-org-1',
      title: 'Hamilton: The Broadway Musical',
      description: 'Lin-Manuel Miranda’s Pulitzer Prize-winning revolutionary musical telling the story of Alexander Hamilton through hip-hop, jazz, and R&B. An unforgettable theatrical phenomenon.',
      category: 'THEATRE',
      image_url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=80',
      banner_url: 'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?w=1600&auto=format&fit=crop&q=80',
      duration_mins: 165,
      age_restriction: '10+',
      status: 'ACTIVE'
    },
    {
      id: 'evt-ucl-final',
      organiser_id: 'usr-org-2',
      title: 'UEFA Champions League Semifinal: Madrid vs Bayern',
      description: 'European football at its highest pinnacle. 90 minutes of sheer drama, world-class tactics, and electric atmosphere under the stadium floodlights.',
      category: 'SPORTS',
      image_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
      banner_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&auto=format&fit=crop&q=80',
      duration_mins: 120,
      age_restriction: 'All Ages',
      status: 'ACTIVE'
    },
    {
      id: 'evt-trevor-noah',
      organiser_id: 'usr-org-2',
      title: 'Trevor Noah: "Off The Record" Live Comedy',
      description: 'Emmy-winning comedian and former Daily Show host Trevor Noah returns with an all-new stand-up hour exploring international culture, politics, and modern absurdities.',
      category: 'COMEDY',
      image_url: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&auto=format&fit=crop&q=80',
      banner_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&auto=format&fit=crop&q=80',
      duration_mins: 90,
      age_restriction: '16+',
      status: 'ACTIVE'
    },
    {
      id: 'evt-ai-summit',
      organiser_id: 'usr-org-1',
      title: 'NextGen AI & Autonomous Systems Summit 2026',
      description: 'Keynotes from world-leading AI researchers, live interactive demos of agentic coding & robotics, and premier networking with industry architects.',
      category: 'CONFERENCE',
      image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
      banner_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&auto=format&fit=crop&q=80',
      duration_mins: 480,
      age_restriction: 'Professional',
      status: 'ACTIVE'
    }
  ];

  for (const e of events) {
    insertEvent.run(e.id, e.organiser_id, e.title, e.description, e.category, e.image_url, e.banner_url, e.duration_mins, e.age_restriction, e.status);
  }
  console.log(`Seeded ${events.length} Events.`);

  // 4. Seed Shows
  const insertShow = db.prepare(`
    INSERT INTO shows (id, event_id, venue_id, start_time, end_time, hold_ttl_minutes, pricing_tiers, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const tomorrowNight = new Date(now.getTime() + 24 * 3600 * 1000);
  tomorrowNight.setHours(19, 30, 0, 0);

  const weekendNight = new Date(now.getTime() + 72 * 3600 * 1000);
  weekendNight.setHours(20, 0, 0, 0);

  const shows = [
    {
      id: 'show-interstellar-1',
      event_id: 'evt-interstellar',
      venue_id: venue1Id,
      start_time: new Date(now.getTime() + 6 * 3600 * 1000).toISOString(),
      end_time: new Date(now.getTime() + 9 * 3600 * 1000).toISOString(),
      hold_ttl_minutes: 10,
      pricing_tiers: JSON.stringify({ EXECUTIVE: 35, PREMIUM: 25, BALCONY: 18 }),
      status: 'SCHEDULED'
    },
    {
      id: 'show-interstellar-2',
      event_id: 'evt-interstellar',
      venue_id: venue1Id,
      start_time: tomorrowNight.toISOString(),
      end_time: new Date(tomorrowNight.getTime() + 3 * 3600 * 1000).toISOString(),
      hold_ttl_minutes: 10,
      pricing_tiers: JSON.stringify({ EXECUTIVE: 38, PREMIUM: 28, BALCONY: 20 }),
      status: 'SCHEDULED'
    },
    {
      id: 'show-coldplay-1',
      event_id: 'evt-coldplay',
      venue_id: venue3Id,
      start_time: weekendNight.toISOString(),
      end_time: new Date(weekendNight.getTime() + 3 * 3600 * 1000).toISOString(),
      hold_ttl_minutes: 8,
      pricing_tiers: JSON.stringify({ EXECUTIVE: 250, PREMIUM: 140, BALCONY: 75 }),
      status: 'SCHEDULED'
    },
    {
      id: 'show-hamilton-1',
      event_id: 'evt-hamilton',
      venue_id: venue2Id,
      start_time: tomorrowNight.toISOString(),
      end_time: new Date(tomorrowNight.getTime() + 3 * 3600 * 1000).toISOString(),
      hold_ttl_minutes: 10,
      pricing_tiers: JSON.stringify({ EXECUTIVE: 175, PREMIUM: 110, BALCONY: 65 }),
      status: 'SCHEDULED'
    },
    {
      id: 'show-ucl-1',
      event_id: 'evt-ucl-final',
      venue_id: venue3Id,
      start_time: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      end_time: new Date(now.getTime() + 51 * 3600 * 1000).toISOString(),
      hold_ttl_minutes: 5,
      pricing_tiers: JSON.stringify({ EXECUTIVE: 320, PREMIUM: 180, BALCONY: 95 }),
      status: 'SCHEDULED'
    },
    {
      id: 'show-ai-summit-1',
      event_id: 'evt-ai-summit',
      venue_id: venue2Id,
      start_time: new Date(now.getTime() + 120 * 3600 * 1000).toISOString(),
      end_time: new Date(now.getTime() + 128 * 3600 * 1000).toISOString(),
      hold_ttl_minutes: 15,
      pricing_tiers: JSON.stringify({ EXECUTIVE: 499, PREMIUM: 299, BALCONY: 149 }),
      status: 'SCHEDULED'
    }
  ];

  for (const s of shows) {
    insertShow.run(s.id, s.event_id, s.venue_id, s.start_time, s.end_time, s.hold_ttl_minutes, s.pricing_tiers, s.status);
  }
  console.log(`Seeded ${shows.length} Shows.`);

  // 5. Initialize Show Seats for all shows based on their venue's seat layout
  const insertShowSeat = db.prepare(`
    INSERT INTO show_seats (id, show_id, seat_id, status, held_by_user_id, hold_expires_at, booking_id, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const venueSeatsMap = {};
  const allSeats = db.prepare('SELECT * FROM seats').all();
  for (const seat of allSeats) {
    if (!venueSeatsMap[seat.venue_id]) venueSeatsMap[seat.venue_id] = [];
    venueSeatsMap[seat.venue_id].push(seat);
  }

  for (const show of shows) {
    const seatsForVenue = venueSeatsMap[show.venue_id] || [];
    for (const seat of seatsForVenue) {
      const showSeatId = `ss-${show.id}-${seat.id}`;
      insertShowSeat.run(showSeatId, show.id, seat.id, 'AVAILABLE', null, null, null, 0);
    }
  }
  console.log('Populated all ShowSeats in AVAILABLE state.');

  // 6. Create some sample Bookings, Holds, and a Sold-Out EXECUTIVE section with Active Waitlist
  // For show-interstellar-1: Book 3 seats for Alex Johnson
  const booking1Ref = 'TKT-2026-INT901';
  const booking1Id = 'bk-int-alex-1';
  const qrData1 = await generateSignedQRCode({
    bookingReference: booking1Ref,
    showId: 'show-interstellar-1',
    eventTitle: 'Interstellar: 10th Anniversary IMAX 70mm',
    venueName: 'Cineplex Grand IMAX Arena',
    customerName: 'Alex Johnson',
    seats: ['G-5 (EXECUTIVE)', 'G-6 (EXECUTIVE)'],
    totalAmount: 70
  });

  db.prepare(`
    INSERT INTO bookings (id, booking_reference, user_id, show_id, total_amount, status, qr_code_data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(booking1Id, booking1Ref, 'usr-cust-1', 'show-interstellar-1', 70, 'CONFIRMED', qrData1);

  // Update show_seats and insert booking_seats
  const bookedSeatIds = ['ss-show-interstellar-1-seat-ven-cineplex-imax-G-5', 'ss-show-interstellar-1-seat-ven-cineplex-imax-G-6'];
  for (const ssid of bookedSeatIds) {
    db.prepare(`
      UPDATE show_seats
      SET status = 'BOOKED', booking_id = ?
      WHERE id = ?
    `).run(booking1Id, ssid);

    db.prepare(`
      INSERT INTO booking_seats (id, booking_id, show_seat_id, price_paid, seat_category)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), booking1Id, ssid, 35, 'EXECUTIVE');
  }

  // Also place an active HOLD on seats G-7, G-8 by Samantha Reed (expiring in 8 minutes)
  const holdExpiry = new Date(Date.now() + 8 * 60 * 1000).toISOString();
  db.prepare(`
    UPDATE show_seats
    SET status = 'HELD', held_by_user_id = 'usr-cust-2', hold_expires_at = ?
    WHERE id IN ('ss-show-interstellar-1-seat-ven-cineplex-imax-G-7', 'ss-show-interstellar-1-seat-ven-cineplex-imax-G-8')
  `).run(holdExpiry);

  // Create Hamilton Show Booking (Sold out EXECUTIVE boxes + Waitlist entries)
  const hamiltonShowId = 'show-hamilton-1';
  const hamiltonExecSeats = db.prepare(`
    SELECT ss.id, s.row_label, s.seat_number, s.default_category
    FROM show_seats ss
    JOIN seats s ON ss.seat_id = s.id
    WHERE ss.show_id = ? AND s.default_category = 'EXECUTIVE'
  `).all(hamiltonShowId);

  // Book all EXECUTIVE seats in Hamilton to demonstrate waitlist auto-assignment
  for (let i = 0; i < hamiltonExecSeats.length; i++) {
    const seat = hamiltonExecSeats[i];
    const bId = `bk-ham-exec-${i}`;
    const bRef = `TKT-HAM-EXEC${100 + i}`;
    const qr = await generateSignedQRCode({
      bookingReference: bRef,
      showId: hamiltonShowId,
      eventTitle: 'Hamilton: The Broadway Musical',
      venueName: 'Royal Broadway Heritage Theatre',
      customerName: 'Elena Rostova',
      seats: [`${seat.row_label}-${seat.seat_number} (EXECUTIVE)`],
      totalAmount: 175
    });

    db.prepare(`
      INSERT INTO bookings (id, booking_reference, user_id, show_id, total_amount, status, qr_code_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(bId, bRef, 'usr-cust-4', hamiltonShowId, 175, 'CONFIRMED', qr);

    db.prepare(`
      UPDATE show_seats SET status = 'BOOKED', booking_id = ? WHERE id = ?
    `).run(bId, seat.id);

    db.prepare(`
      INSERT INTO booking_seats (id, booking_id, show_seat_id, price_paid, seat_category)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), bId, seat.id, 175, 'EXECUTIVE');
  }

  // Insert 2 customers on the Waitlist for Hamilton EXECUTIVE
  db.prepare(`
    INSERT INTO waitlist_entries (id, show_id, user_id, seat_category, status, priority_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('wl-ham-1', hamiltonShowId, 'usr-cust-2', 'EXECUTIVE', 'WAITING', 1, new Date(Date.now() - 3600 * 1000).toISOString());

  db.prepare(`
    INSERT INTO waitlist_entries (id, show_id, user_id, seat_category, status, priority_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('wl-ham-2', hamiltonShowId, 'usr-cust-3', 'EXECUTIVE', 'WAITING', 2, new Date(Date.now() - 1800 * 1000).toISOString());

  // Log initial confirmation email
  db.prepare(`
    INSERT INTO emails_log (id, recipient_email, recipient_name, subject, type, html_body, qr_code_data, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'em-seed-1',
    'alex.johnson@example.com',
    'Alex Johnson',
    '🎟️ Booking Confirmed: Interstellar 10th Anniversary IMAX (TKT-2026-INT901)',
    'BOOKING_CONFIRMATION',
    `<div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #fff; border-radius: 12px;">
      <h2 style="color: #6366f1;">Your Ticket Booking is Confirmed!</h2>
      <p>Thank you Alex! Your seats <strong>G-5, G-6 (EXECUTIVE)</strong> are reserved.</p>
      <p>Booking Reference: <strong>TKT-2026-INT901</strong></p>
      <p>Venue: Cineplex Grand IMAX Arena</p>
      <div style="margin: 20px 0; text-align: center;">
        <img src="${qrData1}" alt="Ticket QR Code" style="width: 200px; height: 200px; background: white; padding: 10px; border-radius: 8px;" />
      </div>
      <p style="color: #94a3b8; font-size: 12px;">Present this QR code at the entrance for entry.</p>
    </div>`,
    qrData1,
    JSON.stringify({ bookingReference: booking1Ref, showId: 'show-interstellar-1' })
  );

  console.log('--- Database Seeding Completed Successfully ---');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
