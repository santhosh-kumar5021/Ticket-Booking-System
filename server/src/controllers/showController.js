import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { broadcastSeatUpdate } from '../services/sseService.js';
import { reallocateSeatOrRelease } from '../services/holdWorker.js';

/**
 * Get show details with full real-time interactive seat grid
 */
export function getShow(req, res) {
  const { id } = req.params;
  const currentUserId = req.user ? req.user.id : null;

  const show = db.prepare(`
    SELECT s.*, e.title as event_title, e.category as event_category, e.image_url as event_image,
           e.banner_url as event_banner, e.duration_mins, e.age_restriction,
           v.name as venue_name, v.address as venue_address, v.city as venue_city,
           v.layout_config as venue_layout_config
    FROM shows s
    JOIN events e ON s.event_id = e.id
    JOIN venues v ON s.venue_id = v.id
    WHERE s.id = ?
  `).get(id);

  if (!show) {
    return res.status(404).json({ error: 'Show not found.' });
  }

  const pricingTiers = JSON.parse(show.pricing_tiers || '{}');

  // Query all show seats combined with their physical seat coordinates & layout metadata
  const seats = db.prepare(`
    SELECT ss.id as show_seat_id, ss.show_id, ss.status, ss.held_by_user_id, ss.hold_expires_at,
           s.id as seat_id, s.row_label, s.seat_number, s.section, s.default_category,
           s.is_accessible, s.x_pos, s.y_pos
    FROM show_seats ss
    JOIN seats s ON ss.seat_id = s.id
    WHERE ss.show_id = ?
    ORDER BY s.row_label ASC, s.seat_number ASC
  `).all(id);

  const nowIso = new Date().toISOString();

  // Map seats with real-time active hold resolution & pricing
  const mappedSeats = seats.map(seat => {
    let effectiveStatus = seat.status;
    // Lazy expiry check
    if (seat.status === 'HELD' && seat.hold_expires_at && seat.hold_expires_at < nowIso) {
      effectiveStatus = 'AVAILABLE';
    }

    const isHeldByMe = currentUserId && seat.held_by_user_id === currentUserId && effectiveStatus === 'HELD';
    const price = pricingTiers[seat.default_category] || pricingTiers['STANDARD'] || 50;

    return {
      id: seat.show_seat_id,
      seatId: seat.seat_id,
      row: seat.row_label,
      number: seat.seat_number,
      section: seat.section,
      category: seat.default_category,
      isAccessible: Boolean(seat.is_accessible),
      x: seat.x_pos,
      y: seat.y_pos,
      price,
      status: effectiveStatus,
      isHeldByMe,
      holdExpiresAt: seat.hold_expires_at
    };
  });

  // Calculate tier breakdown & availability
  const categoryStats = {};
  mappedSeats.forEach(s => {
    if (!categoryStats[s.category]) {
      categoryStats[s.category] = { total: 0, available: 0, price: s.price };
    }
    categoryStats[s.category].total++;
    if (s.status === 'AVAILABLE') {
      categoryStats[s.category].available++;
    }
  });

  res.json({
    show: {
      ...show,
      pricing_tiers: pricingTiers,
      venue_layout_config: JSON.parse(show.venue_layout_config || '{}'),
      categoryStats
    },
    seats: mappedSeats
  });
}

/**
 * HARD CONCURRENCY SEAT HOLD ATTEMPT
 * Uses SQLite transaction with BEGIN IMMEDIATE semantics.
 * Two simultaneous requests for the same seat can NEVER both succeed.
 */
export function holdSeats(req, res) {
  const { id: showId } = req.params;
  const { showSeatIds = [] } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(showSeatIds) || showSeatIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one seat to place a hold.' });
  }

  const show = db.prepare('SELECT id, hold_ttl_minutes, pricing_tiers FROM shows WHERE id = ?').get(showId);
  if (!show) {
    return res.status(404).json({ error: 'Show not found.' });
  }

  const ttlMinutes = show.hold_ttl_minutes || 10;
  const holdExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  // Execute atomic seat locking transaction
  const executeHoldTx = db.transaction(() => {
    const placeholders = showSeatIds.map(() => '?').join(',');

    // 1. Lock and inspect requested seats
    const currentSeats = db.prepare(`
      SELECT ss.id, ss.status, ss.held_by_user_id, ss.hold_expires_at, s.row_label, s.seat_number
      FROM show_seats ss
      JOIN seats s ON ss.seat_id = s.id
      WHERE ss.id IN (${placeholders}) AND ss.show_id = ?
    `).all(...showSeatIds, showId);

    if (currentSeats.length !== showSeatIds.length) {
      throw { status: 400, message: 'One or more selected seats do not exist for this show.' };
    }

    // 2. Verify every single requested seat is available (or already held by this user or expired hold)
    const unavailableSeats = [];
    for (const seat of currentSeats) {
      const isAvailable = seat.status === 'AVAILABLE';
      const isExpiredHold = seat.status === 'HELD' && seat.hold_expires_at && seat.hold_expires_at < nowIso;
      const isHeldBySameUser = seat.status === 'HELD' && seat.held_by_user_id === userId;

      if (!isAvailable && !isExpiredHold && !isHeldBySameUser) {
        unavailableSeats.push(`${seat.row_label}-${seat.seat_number} (${seat.status})`);
      }
    }

    if (unavailableSeats.length > 0) {
      throw {
        status: 409,
        message: `Concurrency Conflict: The following seat(s) were just taken by another customer: ${unavailableSeats.join(', ')}`,
        conflictingSeats: unavailableSeats
      };
    }

    // 3. Atomically update all requested seats to HELD
    const updateStmt = db.prepare(`
      UPDATE show_seats
      SET status = 'HELD',
          held_by_user_id = ?,
          hold_expires_at = ?,
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    for (const seat of currentSeats) {
      updateStmt.run(userId, holdExpiresAt, seat.id);
    }

    return {
      heldSeatIds: showSeatIds,
      holdExpiresAt,
      ttlMinutes
    };
  });

  try {
    const result = executeHoldTx();

    // Broadcast update via SSE
    broadcastSeatUpdate(showId, {
      updatedSeats: showSeatIds.map(id => ({ id, status: 'HELD', heldBy: userId })),
      reason: 'SEAT_HELD'
    });

    res.json({
      success: true,
      message: `Held ${showSeatIds.length} seat(s) successfully. Complete checkout before timer expires.`,
      ...result
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, conflictingSeats: err.conflictingSeats });
    }
    console.error('Seat hold transaction error:', err);
    res.status(500).json({ error: 'Failed to lock seats due to concurrent transaction conflict.' });
  }
}

/**
 * Release seat holds placed by user
 */
export function releaseHold(req, res) {
  const { id: showId } = req.params;
  const { showSeatIds = [] } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(showSeatIds) || showSeatIds.length === 0) {
    return res.status(400).json({ error: 'No seat IDs provided.' });
  }

  const releaseTx = db.transaction(() => {
    const placeholders = showSeatIds.map(() => '?').join(',');
    const seatsToRelease = db.prepare(`
      SELECT id FROM show_seats
      WHERE id IN (${placeholders}) AND show_id = ? AND status = 'HELD' AND held_by_user_id = ?
    `).all(...showSeatIds, showId, userId);

    for (const s of seatsToRelease) {
      reallocateSeatOrRelease(s.id, db);
    }

    return seatsToRelease.map(s => s.id);
  });

  try {
    const released = releaseTx();
    res.json({ success: true, releasedSeats: released });
  } catch (err) {
    console.error('Failed to release hold:', err);
    res.status(500).json({ error: 'Failed to release seat hold.' });
  }
}

/**
 * Create a new show for an event
 */
export function createShow(req, res) {
  const {
    event_id,
    venue_id,
    start_time,
    end_time,
    hold_ttl_minutes = 10,
    pricing_tiers = { VIP: 100, PREMIUM: 60, STANDARD: 30 }
  } = req.body;

  if (!event_id || !venue_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Event, venue, start time, and end time are required.' });
  }

  const showId = `show-${uuidv4()}`;

  const createShowTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO shows (id, event_id, venue_id, start_time, end_time, hold_ttl_minutes, pricing_tiers)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      showId,
      event_id,
      venue_id,
      start_time,
      end_time,
      parseInt(hold_ttl_minutes, 10),
      JSON.stringify(pricing_tiers)
    );

    // Populate show_seats from venue seats
    const venueSeats = db.prepare('SELECT id FROM seats WHERE venue_id = ?').all(venue_id);
    const insertShowSeat = db.prepare(`
      INSERT INTO show_seats (id, show_id, seat_id, status)
      VALUES (?, ?, ?, 'AVAILABLE')
    `);

    for (const seat of venueSeats) {
      const showSeatId = `ss-${showId}-${seat.id}`;
      insertShowSeat.run(showSeatId, showId, seat.id);
    }

    return { showId, totalSeats: venueSeats.length };
  });

  try {
    const result = createShowTx();
    res.status(201).json({ show: result });
  } catch (err) {
    console.error('Failed to create show:', err);
    res.status(500).json({ error: 'Failed to schedule show.' });
  }
}
