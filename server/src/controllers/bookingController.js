import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { generateSignedQRCode } from '../utils/qr.js';
import { sendBookingConfirmation, sendCancellationNotice } from '../services/emailService.js';
import { broadcastSeatUpdate } from '../services/sseService.js';
import { reallocateSeatOrRelease } from '../services/holdWorker.js';

/**
 * Confirm a booking for held seats
 */
export async function confirmBooking(req, res) {
  const { showId, showSeatIds = [], paymentDetails } = req.body;
  const user = req.user;

  if (!Array.isArray(showSeatIds) || showSeatIds.length === 0) {
    return res.status(400).json({ error: 'Please specify held seats to confirm booking.' });
  }

  const show = db.prepare(`
    SELECT s.*, e.title as event_title, e.category as event_category,
           v.name as venue_name, v.address as venue_address, v.city as venue_city
    FROM shows s
    JOIN events e ON s.event_id = e.id
    JOIN venues v ON s.venue_id = v.id
    WHERE s.id = ?
  `).get(showId);

  if (!show) {
    return res.status(404).json({ error: 'Show not found.' });
  }

  const pricingTiers = JSON.parse(show.pricing_tiers || '{}');
  const nowIso = new Date().toISOString();
  const bookingId = `bk-${uuidv4()}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingReference = `TKT-${new Date().getFullYear()}-${randomSuffix}`;

  // Execute atomic checkout transaction
  let confirmedSeats = [];
  let totalAmount = 0;

  const checkoutTx = db.transaction(() => {
    const placeholders = showSeatIds.map(() => '?').join(',');

    // 1. Verify all seats are currently held by this user and not expired
    const heldSeats = db.prepare(`
      SELECT ss.id as show_seat_id, ss.status, ss.held_by_user_id, ss.hold_expires_at,
             s.row_label, s.seat_number, s.default_category, s.section
      FROM show_seats ss
      JOIN seats s ON ss.seat_id = s.id
      WHERE ss.id IN (${placeholders}) AND ss.show_id = ?
    `).all(...showSeatIds, showId);

    if (heldSeats.length !== showSeatIds.length) {
      throw { status: 400, message: 'Invalid seat selection.' };
    }

    for (const seat of heldSeats) {
      if (seat.status !== 'HELD' || seat.held_by_user_id !== user.id) {
        throw {
          status: 409,
          message: `Seat ${seat.row_label}-${seat.seat_number} is no longer held by you. Please re-select.`
        };
      }
      if (seat.hold_expires_at && seat.hold_expires_at < nowIso) {
        throw {
          status: 409,
          message: `Hold time expired for seat ${seat.row_label}-${seat.seat_number}. Please re-hold.`
        };
      }

      const price = pricingTiers[seat.default_category] || pricingTiers['STANDARD'] || 50;
      totalAmount += price;
      confirmedSeats.push({ ...seat, price });
    }

    // 2. Insert into bookings (temporarily with placeholder QR, updated right after)
    db.prepare(`
      INSERT INTO bookings (id, booking_reference, user_id, show_id, total_amount, status, qr_code_data)
      VALUES (?, ?, ?, ?, ?, 'CONFIRMED', '')
    `).run(bookingId, bookingReference, user.id, showId, totalAmount);

    // 3. Insert booking_seats & lock show_seats to BOOKED
    const insertBookingSeat = db.prepare(`
      INSERT INTO booking_seats (id, booking_id, show_seat_id, price_paid, seat_category)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateShowSeat = db.prepare(`
      UPDATE show_seats
      SET status = 'BOOKED',
          booking_id = ?,
          held_by_user_id = NULL,
          hold_expires_at = NULL,
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    for (const seat of confirmedSeats) {
      insertBookingSeat.run(uuidv4(), bookingId, seat.show_seat_id, seat.price, seat.default_category);
      updateShowSeat.run(bookingId, seat.show_seat_id);
    }

    // 4. If user was fulfilling an offered waitlist entry, mark it ACCEPTED
    db.prepare(`
      UPDATE waitlist_entries
      SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND show_id = ? AND status = 'OFFERED'
    `).run(user.id, showId);

    return { bookingId, bookingReference, totalAmount, confirmedSeats };
  });

  try {
    const txResult = checkoutTx();

    // 5. Generate signed cryptographic QR code
    const qrCodeData = await generateSignedQRCode({
      bookingReference: txResult.bookingReference,
      bookingId: txResult.bookingId,
      showId,
      eventTitle: show.event_title,
      venueName: show.venue_name,
      customerName: user.name,
      customerEmail: user.email,
      seats: txResult.confirmedSeats.map(s => `${s.row_label}-${s.seat_number} (${s.default_category})`),
      totalAmount: txResult.totalAmount,
      showTime: show.start_time
    });

    // Update QR in database
    db.prepare('UPDATE bookings SET qr_code_data = ? WHERE id = ?').run(qrCodeData, txResult.bookingId);

    // 6. Broadcast seat update to all connected viewers
    broadcastSeatUpdate(showId, {
      updatedSeats: showSeatIds.map(id => ({ id, status: 'BOOKED', heldBy: null })),
      reason: 'BOOKING_CONFIRMED'
    });

    // 7. Dispatch Confirmation Email asynchronously
    sendBookingConfirmation({
      user,
      booking: { id: txResult.bookingId, booking_reference: txResult.bookingReference, total_amount: txResult.totalAmount },
      show,
      event: { title: show.event_title, category: show.event_category },
      venue: { name: show.venue_name, address: show.venue_address, city: show.venue_city },
      seats: txResult.confirmedSeats,
      qrCodeData
    }).catch(err => console.error('Failed to dispatch booking confirmation email:', err));

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking: {
        id: txResult.bookingId,
        booking_reference: txResult.bookingReference,
        total_amount: txResult.totalAmount,
        status: 'CONFIRMED',
        qr_code_data: qrCodeData,
        seats: txResult.confirmedSeats,
        event_title: show.event_title,
        venue_name: show.venue_name,
        start_time: show.start_time
      }
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Booking confirmation transaction error:', err);
    res.status(500).json({ error: 'Failed to process booking.' });
  }
}

/**
 * Get all bookings for the authenticated user
 */
export function getUserBookings(req, res) {
  const userId = req.user.id;

  const bookings = db.prepare(`
    SELECT b.*,
           s.start_time, s.end_time,
           e.title as event_title, e.category as event_category, e.image_url as event_image,
           v.name as venue_name, v.address as venue_address, v.city as venue_city
    FROM bookings b
    JOIN shows s ON b.show_id = s.id
    JOIN events e ON s.event_id = e.id
    JOIN venues v ON s.venue_id = v.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(userId);

  const bookingsWithSeats = bookings.map(b => {
    const seats = db.prepare(`
      SELECT bs.price_paid, bs.seat_category, s.row_label, s.seat_number, s.section
      FROM booking_seats bs
      JOIN show_seats ss ON bs.show_seat_id = ss.id
      JOIN seats s ON ss.seat_id = s.id
      WHERE bs.booking_id = ?
    `).all(b.id);

    return {
      ...b,
      seats
    };
  });

  res.json({ bookings: bookingsWithSeats });
}

/**
 * Get single booking pass details by Reference or ID
 */
export function getBookingDetails(req, res) {
  const { idOrRef } = req.params;

  const booking = db.prepare(`
    SELECT b.*, u.name as customer_name, u.email as customer_email,
           s.start_time, s.end_time,
           e.title as event_title, e.category as event_category, e.image_url as event_image,
           v.name as venue_name, v.address as venue_address, v.city as venue_city
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN shows s ON b.show_id = s.id
    JOIN events e ON s.event_id = e.id
    JOIN venues v ON s.venue_id = v.id
    WHERE b.id = ? OR b.booking_reference = ?
  `).get(idOrRef, idOrRef);

  if (!booking) {
    return res.status(404).json({ error: 'Booking pass not found.' });
  }

  const seats = db.prepare(`
    SELECT bs.price_paid, bs.seat_category, s.row_label, s.seat_number, s.section, ss.id as show_seat_id
    FROM booking_seats bs
    JOIN show_seats ss ON bs.show_seat_id = ss.id
    JOIN seats s ON ss.seat_id = s.id
    WHERE bs.booking_id = ?
  `).all(booking.id);

  res.json({ booking: { ...booking, seats } });
}

/**
 * Cancel a booking -> triggers automated Waitlist Reallocation Cascade!
 */
export function cancelBooking(req, res) {
  const { id } = req.params;
  const user = req.user;

  const booking = db.prepare(`
    SELECT b.*, s.id as show_id, s.start_time, e.title as event_title, u.email as customer_email, u.name as customer_name
    FROM bookings b
    JOIN shows s ON b.show_id = s.id
    JOIN events e ON s.event_id = e.id
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
  `).get(id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  // Ensure user owns booking or is admin/organiser
  if (booking.user_id !== user.id && !['ADMIN', 'ORGANISER'].includes(user.role)) {
    return res.status(403).json({ error: 'Unauthorized to cancel this booking.' });
  }

  if (booking.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Booking is already cancelled.' });
  }

  const bookedSeats = db.prepare(`
    SELECT bs.show_seat_id, s.row_label, s.seat_number, s.default_category
    FROM booking_seats bs
    JOIN show_seats ss ON bs.show_seat_id = ss.id
    JOIN seats s ON ss.seat_id = s.id
    WHERE bs.booking_id = ?
  `).all(booking.id);

  const cancelTx = db.transaction(() => {
    // 1. Mark booking CANCELLED
    db.prepare(`
      UPDATE bookings
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(booking.id);

    // 2. Cascade each freed seat to waitlist queue or mark AVAILABLE
    const reallocatedResults = [];
    for (const seat of bookedSeats) {
      const result = reallocateSeatOrRelease(seat.show_seat_id, db);
      reallocatedResults.push({ seatId: seat.show_seat_id, ...result });
    }

    return reallocatedResults;
  });

  try {
    const cascadeResults = cancelTx();

    sendCancellationNotice({
      user: { name: booking.customer_name, email: booking.customer_email },
      booking,
      show: { id: booking.show_id },
      event: { title: booking.event_title },
      seats: bookedSeats
    }).catch(err => console.error('Failed to send cancellation email:', err));

    res.json({
      success: true,
      message: 'Booking cancelled successfully. Freed seats have been auto-assigned to waiting customers.',
      cascadeResults
    });
  } catch (err) {
    console.error('Cancellation error:', err);
    res.status(500).json({ error: 'Failed to cancel booking.' });
  }
}
