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
export async function reallocateSeatOrRelease(showSeatId) {
  const seatInfo = await db.get(`
    SELECT ss.id, ss.show_id, s.row_label, s.seat_number, s.default_category,
           sh.start_time, e.title as event_title, v.name as venue_name,
           e.category as event_category
    FROM show_seats ss
    JOIN seats s ON ss.seat_id = s.id
    JOIN shows sh ON ss.show_id = sh.id
    JOIN events e ON sh.event_id = e.id
    JOIN venues v ON sh.venue_id = v.id
    WHERE ss.id = ?
  `, [showSeatId]);

  if (!seatInfo) return null;

  const nextWaitlisted = await db.get(`
    SELECT w.*, u.name as user_name, u.email as user_email
    FROM waitlist_entries w
    JOIN users u ON w.user_id = u.id
    WHERE w.show_id = ? AND w.seat_category = ? AND w.status = 'WAITING'
    ORDER BY w.priority_order ASC, w.created_at ASC
    LIMIT 1
  `, [seatInfo.show_id, seatInfo.default_category]);

  if (nextWaitlisted) {
    const offerExpiresAt = new Date(Date.now() + WAITLIST_OFFER_TTL_MINUTES * 60 * 1000).toISOString();
    const claimToken = uuidv4();

    await db.query(`
      UPDATE waitlist_entries
      SET status = 'OFFERED',
          offer_expires_at = ?,
          offered_show_seat_id = ?,
          claim_token = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [offerExpiresAt, showSeatId, claimToken, nextWaitlisted.id]);

    await db.query(`
      UPDATE show_seats
      SET status = 'HELD',
          held_by_user_id = ?,
          hold_expires_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [nextWaitlisted.user_id, offerExpiresAt, showSeatId]);

    const claimUrl = `${CLIENT_URL}/claim-waitlist/${nextWaitlisted.id}?token=${claimToken}`;

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

    broadcastSeatUpdate(seatInfo.show_id, {
      updatedSeats: [{ id: showSeatId, status: 'HELD', heldBy: nextWaitlisted.user_id }],
      reason: 'WAITLIST_OFFERED'
    });

    console.log(`[Waitlist] Cascaded seat ${seatInfo.row_label}-${seatInfo.seat_number} to user ${nextWaitlisted.user_email} (Exp: ${offerExpiresAt})`);
    return { reallocated: true, waitlistId: nextWaitlisted.id };
  } else {
    await db.query(`
      UPDATE show_seats
      SET status = 'AVAILABLE',
          held_by_user_id = NULL,
          hold_expires_at = NULL,
          booking_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [showSeatId]);

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
export async function checkExpiredHolds() {
  const nowIso = new Date().toISOString();

  const expiredHolds = await db.all(`
    SELECT ss.id, ss.show_id, ss.held_by_user_id
    FROM show_seats ss
    WHERE ss.status = 'HELD' AND ss.hold_expires_at IS NOT NULL AND ss.hold_expires_at < ?
  `, [nowIso]);

  for (const hold of expiredHolds) {
    const waitlistOffer = await db.get(`
      SELECT w.*, u.name as user_name, u.email as user_email, e.title as event_title
      FROM waitlist_entries w
      JOIN users u ON w.user_id = u.id
      JOIN shows sh ON w.show_id = sh.id
      JOIN events e ON sh.event_id = e.id
      WHERE w.offered_show_seat_id = ? AND w.status = 'OFFERED'
    `, [hold.id]);

    if (waitlistOffer) {
      await db.query(`
        UPDATE waitlist_entries
        SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [waitlistOffer.id]);

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

    await reallocateSeatOrRelease(hold.id);
  }

  const expiredOffers = await db.all(`
    SELECT w.*, u.name as user_name, u.email as user_email, e.title as event_title
    FROM waitlist_entries w
    JOIN users u ON w.user_id = u.id
    JOIN shows sh ON w.show_id = sh.id
    JOIN events e ON sh.event_id = e.id
    WHERE w.status = 'OFFERED' AND w.offer_expires_at IS NOT NULL AND w.offer_expires_at < ?
  `, [nowIso]);

  for (const offer of expiredOffers) {
    await db.query(`
      UPDATE waitlist_entries
      SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [offer.id]);

    if (offer.offered_show_seat_id) {
      await reallocateSeatOrRelease(offer.offered_show_seat_id);
    }
  }
}

let workerInterval = null;

export function startHoldWorker(intervalMs = 3000) {
  if (workerInterval) clearInterval(workerInterval);
  workerInterval = setInterval(async () => {
    try {
      await checkExpiredHolds();
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
