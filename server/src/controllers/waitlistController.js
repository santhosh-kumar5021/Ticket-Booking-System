import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { reallocateSeatOrRelease } from '../services/holdWorker.js';

/**
 * Customer joins waitlist for a specific show and seat tier category
 */
export function joinWaitlist(req, res) {
  const { showId, seatCategory } = req.body;
  const userId = req.user.id;

  if (!showId || !seatCategory) {
    return res.status(400).json({ error: 'Show ID and Seat Category are required to join the waitlist.' });
  }

  const show = db.prepare(`
    SELECT s.*, e.title as event_title, v.name as venue_name
    FROM shows s
    JOIN events e ON s.event_id = e.id
    JOIN venues v ON s.venue_id = v.id
    WHERE s.id = ?
  `).get(showId);

  if (!show) {
    return res.status(404).json({ error: 'Show not found.' });
  }

  // Check if user already has an active waiting or offered entry for this show & category
  const existing = db.prepare(`
    SELECT * FROM waitlist_entries
    WHERE show_id = ? AND user_id = ? AND seat_category = ? AND status IN ('WAITING', 'OFFERED')
  `).get(showId, userId, seatCategory);

  if (existing) {
    return res.status(400).json({
      error: `You are already on the waitlist for ${seatCategory} seats (Status: ${existing.status}, Position: #${existing.priority_order}).`
    });
  }

  // Calculate next priority order in FIFO queue
  const nextOrderResult = db.prepare(`
    SELECT COALESCE(MAX(priority_order), 0) + 1 as next_order
    FROM waitlist_entries
    WHERE show_id = ? AND seat_category = ?
  `).get(showId, seatCategory);

  const priorityOrder = nextOrderResult ? nextOrderResult.next_order : 1;
  const waitlistId = `wl-${uuidv4()}`;

  db.prepare(`
    INSERT INTO waitlist_entries (id, show_id, user_id, seat_category, status, priority_order)
    VALUES (?, ?, ?, ?, 'WAITING', ?)
  `).run(waitlistId, showId, userId, seatCategory, priorityOrder);

  // Get active queue position ahead
  const aheadCount = db.prepare(`
    SELECT COUNT(*) as count FROM waitlist_entries
    WHERE show_id = ? AND seat_category = ? AND status = 'WAITING' AND priority_order < ?
  `).get(showId, seatCategory, priorityOrder).count;

  res.status(201).json({
    success: true,
    message: `Successfully joined waitlist for ${seatCategory} seats!`,
    entry: {
      id: waitlistId,
      show_id: showId,
      event_title: show.event_title,
      venue_name: show.venue_name,
      seat_category: seatCategory,
      status: 'WAITING',
      position: aheadCount + 1
    }
  });
}

/**
 * Get all waitlist entries for the logged-in customer
 */
export function getUserWaitlist(req, res) {
  const userId = req.user.id;

  const entries = db.prepare(`
    SELECT w.*,
           s.start_time, s.pricing_tiers,
           e.title as event_title, e.category as event_category, e.image_url as event_image,
           v.name as venue_name,
           ss.id as offered_show_seat_id,
           sec.row_label, sec.seat_number, sec.section
    FROM waitlist_entries w
    JOIN shows s ON w.show_id = s.id
    JOIN events e ON s.event_id = e.id
    JOIN venues v ON s.venue_id = v.id
    LEFT JOIN show_seats ss ON w.offered_show_seat_id = ss.id
    LEFT JOIN seats sec ON ss.seat_id = sec.id
    WHERE w.user_id = ?
    ORDER BY w.created_at DESC
  `).all(userId);

  const mapped = entries.map(entry => {
    const pricing = JSON.parse(entry.pricing_tiers || '{}');
    const price = pricing[entry.seat_category] || 50;

    return {
      ...entry,
      price,
      isOfferActive: entry.status === 'OFFERED' && entry.offer_expires_at && new Date(entry.offer_expires_at) > new Date()
    };
  });

  res.json({ entries: mapped });
}

/**
 * Get single waitlist offer by ID / claim token
 */
export function getWaitlistOffer(req, res) {
  const { id } = req.params;

  const entry = db.prepare(`
    SELECT w.*,
           s.start_time, s.pricing_tiers,
           e.title as event_title, e.category as event_category, e.image_url as event_image,
           v.name as venue_name, v.address as venue_address,
           sec.row_label, sec.seat_number, sec.section
    FROM waitlist_entries w
    JOIN shows s ON w.show_id = s.id
    JOIN events e ON s.event_id = e.id
    JOIN venues v ON s.venue_id = v.id
    LEFT JOIN show_seats ss ON w.offered_show_seat_id = ss.id
    LEFT JOIN seats sec ON ss.seat_id = sec.id
    WHERE w.id = ?
  `).get(id);

  if (!entry) {
    return res.status(404).json({ error: 'Waitlist offer not found.' });
  }

  const pricing = JSON.parse(entry.pricing_tiers || '{}');
  const price = pricing[entry.seat_category] || 50;
  const isExpired = !entry.offer_expires_at || new Date(entry.offer_expires_at) <= new Date();

  res.json({
    offer: {
      ...entry,
      price,
      isExpired
    }
  });
}

/**
 * Customer claims waitlist seat offer to proceed directly to checkout
 */
export function claimOffer(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  const entry = db.prepare('SELECT * FROM waitlist_entries WHERE id = ?').get(id);
  if (!entry) {
    return res.status(404).json({ error: 'Waitlist entry not found.' });
  }

  if (entry.user_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized to claim this waitlist offer.' });
  }

  if (entry.status !== 'OFFERED') {
    return res.status(400).json({ error: `Offer is not in claimable state (Current status: ${entry.status}).` });
  }

  if (entry.offer_expires_at && new Date(entry.offer_expires_at) <= new Date()) {
    return res.status(400).json({ error: 'This waitlist offer has expired and cascaded to the next customer.' });
  }

  res.json({
    success: true,
    message: 'Offer ready for checkout.',
    showId: entry.show_id,
    showSeatId: entry.offered_show_seat_id,
    seatCategory: entry.seat_category,
    offerExpiresAt: entry.offer_expires_at
  });
}

/**
 * Customer declines waitlist seat offer -> immediately cascades to next in queue
 */
export function declineOffer(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  const entry = db.prepare('SELECT * FROM waitlist_entries WHERE id = ?').get(id);
  if (!entry) {
    return res.status(404).json({ error: 'Waitlist entry not found.' });
  }

  if (entry.user_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const declineTx = db.transaction(() => {
    db.prepare(`
      UPDATE waitlist_entries
      SET status = 'DECLINED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    if (entry.offered_show_seat_id) {
      // Instantly cascade to the next person in line!
      reallocateSeatOrRelease(entry.offered_show_seat_id, db);
    }
  });

  try {
    declineTx();
    res.json({
      success: true,
      message: 'Offer declined. The seat has been cascaded to the next person waiting in line.'
    });
  } catch (err) {
    console.error('Decline offer error:', err);
    res.status(500).json({ error: 'Failed to decline offer.' });
  }
}
