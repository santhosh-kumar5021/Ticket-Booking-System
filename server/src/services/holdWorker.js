import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { broadcastSeatUpdate, notifyUser } from './sseService.js';
import { sendWaitlistOffer, sendWaitlistExpiredNotice } from './emailService.js';

const WAITLIST_OFFER_TTL_MINUTES = parseInt(process.env.WAITLIST_OFFER_TTL_MINUTES || '5', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Reallocates a freed seat to the next person waiting in queue for that show and category.
 * If no waitlist entry exists, resets seat to AVAILABLE.
 */
export function reallocateSeatOrRelease(showSeatId, txDb = db) {
  const seatInfo = txDb.prepare(`
    SELECT ss.id, ss.show_id, s.row_label, s.seat_number, s.default_category,
           sh.start_time, e.title as event_title, v.name as venue_name,
           e.category as event_category
    FROM show_seats ss
    JOIN seats s ON ss.seat_id = s.id
    JOIN shows sh ON ss.show_id = sh.id
    JOIN events e ON sh.event_id = e.id
    JOIN venues v ON sh.venue_id = v.id
    WHERE ss.id = ?
  `).get(showSeatId);

  if (!seatInfo) return null;

  // Look for next in line for this category
  const nextWaitlisted = txDb.prepare(`
    SELECT w.*, u.name as user_name, u.email as user_email
    FROM waitlist_entries w
    JOIN users u ON w.user_id = u.id
    WHERE w.show_id = ? AND w.seat_category = ? AND w.status = 'WAITING'
    ORDER BY w.priority_order ASC, w.created_at ASC
    LIMIT 1
  `).get(seatInfo.show_id, seatInfo.default_category);

  if (nextWaitlisted) {
    const offerExpiresAt = new Date(Date.now() + WAITLIST_OFFER_TTL_MINUTES * 60 * 1000).toISOString();
    const claimToken = uuidv4();

    // 1. Mark waitlist entry as OFFERED
    txDb.prepare(`
      UPDATE waitlist_entries
      SET status = 'OFFERED',
          offer_expires_at = ?,
          offered_show_seat_id = ?,
          claim_token = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(offerExpiresAt, showSeatId, claimToken, nextWaitlisted.id);

    // 2. Lock seat for this waitlist user
    txDb.prepare(`
      UPDATE show_seats
      SET status = 'HELD',
          held_by_user_id = ?,
          hold_expires_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextWaitlisted.user_id, offerExpiresAt, showSeatId);

    const claimUrl = `${CLIENT_URL}/claim-waitlist/${nextWaitlisted.id}?token=${claimToken}`;

    // 3. Dispatch Email notification asynchronously
    sendWaitlistOffer({
      user: { name: nextWaitlisted.user_name, email: nextWaitlisted.user_email },
      waitlistEntry: nextWaitlisted,
      show: { id: seatInfo.show_id, start_time: seatInfo.start_time },
      event: { title: seatInfo.event_title, category: seatInfo.event_category },
      venue: { name: seatInfo.venue_name },
      seat: { row_label: seatInfo.row_label, seat_number: seatInfo.seat_number },
      claimUrl,
      expiresAt: offerExpiresAt
    }).catch(err => console.error('Failed to send waitlist email offer:', err));

    // 4. Send Realtime SSE push notification to user
    notifyUser(nextWaitlisted.user_id, {
      type: 'WAITLIST_OFFER_RECEIVED',
      waitlistId: nextWaitlisted.id,
      showId: seatInfo.show_id,
      eventTitle: seatInfo.event_title,
      category: seatInfo.default_category,
      seat: `${seatInfo.row_label}-${seatInfo.seat_number}`,
      expiresAt: offerExpiresAt,
      claimToken
    });

    // 5. Broadcast to all seat map viewers that seat is held by a waitlisted user
    broadcastSeatUpdate(seatInfo.show_id, {
      updatedSeats: [{ id: showSeatId, status: 'HELD', heldBy: nextWaitlisted.user_id }],
      reason: 'WAITLIST_OFFERED'
    });

    console.log(`[Waitlist] Cascaded seat ${seatInfo.row_label}-${seatInfo.seat_number} to user ${nextWaitlisted.user_email} (Exp: ${offerExpiresAt})`);
    return { reallocated: true, waitlistId: nextWaitlisted.id };
  } else {
    // No waitlist candidates; return seat to AVAILABLE pool
    txDb.prepare(`
      UPDATE show_seats
      SET status = 'AVAILABLE',
          held_by_user_id = NULL,
          hold_expires_at = NULL,
          booking_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(showSeatId);

    broadcastSeatUpdate(seatInfo.show_id, {
      updatedSeats: [{ id: showSeatId, status: 'AVAILABLE', heldBy: null }],
      reason: 'HOLD_RELEASED'
    });

    console.log(`[SeatMap] Released seat ${seatInfo.row_label}-${seatInfo.seat_number} back to general AVAILABLE`);
    return { reallocated: false };
  }
}

/**
 * Background tick runner: checks expired holds & expired waitlist offers
 */
export function checkExpiredHolds() {
  const nowIso = new Date().toISOString();

  // 1. Find all expired HELD seats
  const expiredHolds = db.prepare(`
    SELECT ss.id, ss.show_id, ss.held_by_user_id
    FROM show_seats ss
    WHERE ss.status = 'HELD' AND ss.hold_expires_at IS NOT NULL AND ss.hold_expires_at < ?
  `).all(nowIso);

  for (const hold of expiredHolds) {
    // Check if there was an active waitlist offer linked to this seat
    const waitlistOffer = db.prepare(`
      SELECT w.*, u.name as user_name, u.email as user_email, e.title as event_title
      FROM waitlist_entries w
      JOIN users u ON w.user_id = u.id
      JOIN shows sh ON w.show_id = sh.id
      JOIN events e ON sh.event_id = e.id
      WHERE w.offered_show_seat_id = ? AND w.status = 'OFFERED'
    `).get(hold.id);

    if (waitlistOffer) {
      // Mark offer EXPIRED
      db.prepare(`
        UPDATE waitlist_entries
        SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(waitlistOffer.id);

      sendWaitlistExpiredNotice({
        user: { name: waitlistOffer.user_name, email: waitlistOffer.user_email },
        show: { id: hold.show_id },
        event: { title: waitlistOffer.event_title },
        category: waitlistOffer.seat_category
      }).catch(() => {});

      notifyUser(waitlistOffer.user_id, {
        type: 'WAITLIST_OFFER_EXPIRED',
        waitlistId: waitlistOffer.id,
        eventTitle: waitlistOffer.event_title
      });
    }

    // Reallocate or release
    reallocateSeatOrRelease(hold.id);
  }

  // 2. Also check any orphan OFFERED waitlist entries whose timer passed
  const expiredOffers = db.prepare(`
    SELECT w.*, u.name as user_name, u.email as user_email, e.title as event_title
    FROM waitlist_entries w
    JOIN users u ON w.user_id = u.id
    JOIN shows sh ON w.show_id = sh.id
    JOIN events e ON sh.event_id = e.id
    WHERE w.status = 'OFFERED' AND w.offer_expires_at IS NOT NULL AND w.offer_expires_at < ?
  `).all(nowIso);

  for (const offer of expiredOffers) {
    db.prepare(`
      UPDATE waitlist_entries
      SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(offer.id);

    if (offer.offered_show_seat_id) {
      reallocateSeatOrRelease(offer.offered_show_seat_id);
    }
  }
}

let workerInterval = null;

export function startHoldWorker(intervalMs = 3000) {
  if (workerInterval) clearInterval(workerInterval);
  workerInterval = setInterval(() => {
    try {
      checkExpiredHolds();
    } catch (err) {
      console.error('[HoldWorker Error]:', err);
    }
  }, intervalMs);
  console.log(`[HoldWorker] Started TTL Expiry & Waitlist Auto-Reallocation Worker (Interval: ${intervalMs}ms)`);
}

export function stopHoldWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}
