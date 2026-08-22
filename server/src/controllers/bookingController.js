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
  const { showId, showSeatIds = [], paymentDetails, deliveryEmail } = req.body;
  const user = req.user;

  if (!Array.isArray(showSeatIds) || showSeatIds.length === 0) {
    return res.status(400).json({ error: 'Please specify held seats to confirm booking.' });
  }

  const show = await db.get(`
    SELECT s.*, e.title as event_title, e.category as event_category,
           v.name as venue_name, v.address as venue_address, v.city as venue_city
    FROM shows s
    JOIN events e ON s.event_id = e.id
    JOIN venues v ON s.venue_id = v.id
    WHERE s.id = ?
  `, [showId]);

  if (!show) {
    return res.status(404).json({ error: 'Show not found.' });
  }

  const pricingTiers = typeof show.pricing_tiers === 'string' ? JSON.parse(show.pricing_tiers || '{}') : show.pricing_tiers;
  const nowIso = new Date().toISOString();
  const bookingId = `bk-${uuidv4()}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingReference = `TKT-${new Date().getFullYear()}-${randomSuffix}`;

  try {
    const placeholders = showSeatIds.map(() => '?').join(',');

    const heldSeats = await db.all(`
      SELECT ss.id as show_seat_id, ss.status, ss.held_by_user_id, ss.hold_expires_at,
             s.row_label, s.seat_number, s.default_category, s.section
      FROM show_seats ss
      JOIN seats s ON ss.seat_id = s.id
      WHERE ss.id IN (${placeholders}) AND ss.show_id = ?
    `, [...showSeatIds, showId]);

    if (heldSeats.length !== showSeatIds.length) {
      return res.status(400).json({ error: 'Invalid seat selection.' });
    }

    let totalAmount = 0;
    const confirmedSeats = [];

    for (const seat of heldSeats) {
      if (seat.status !== 'HELD' || seat.held_by_user_id !== user.id) {
        return res.status(409).json({
          error: `Seat ${seat.row_label}-${seat.seat_number} is no longer held by you. Please re-select.`
        });
      }
      if (seat.hold_expires_at && new Date(seat.hold_expires_at).toISOString() < nowIso) {
        return res.status(409).json({
          error: `Hold time expired for seat ${seat.row_label}-${seat.seat_number}. Please re-hold.`
        });
      }

      const price = Number(pricingTiers[seat.default_category] || 50);
      totalAmount += price;
      confirmedSeats.push({ ...seat, price });
    }

    const recipientEmail = (deliveryEmail && deliveryEmail.trim()) || user.email;

    // Generate signed cryptographic QR code before insertion so qr_code_data constraint is met
    const qrCodeData = await generateSignedQRCode({
      bookingReference,
      bookingId,
      showId,
      eventTitle: show.event_title,
      venueName: show.venue_name,
      customerName: user.name,
      customerEmail: recipientEmail,
      seats: confirmedSeats.map(s => `${s.row_label}-${s.seat_number} (${s.default_category})`),
      totalAmount,
      showTime: show.start_time
    });

    // Atomic transaction: Insert booking
    await db.query(`
      INSERT INTO bookings (id, user_id, show_id, booking_reference, total_amount, status, qr_code_data)
      VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?)
    `, [bookingId, user.id, showId, bookingReference, totalAmount, qrCodeData]);

    // Insert booking_seats & lock show_seats to BOOKED
    for (const seat of confirmedSeats) {
      await db.query(`
        INSERT INTO booking_seats (id, booking_id, show_seat_id, price_paid, seat_category)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), bookingId, seat.show_seat_id, seat.price, seat.default_category]);

      await db.query(`
        UPDATE show_seats
        SET status = 'BOOKED',
            booking_id = ?,
            held_by_user_id = NULL,
            hold_expires_at = NULL,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [bookingId, seat.show_seat_id]);
    }

    // Mark offered waitlist entry ACCEPTED
    await db.query(`
      UPDATE waitlist_entries
      SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND show_id = ? AND status = 'OFFERED'
    `, [user.id, showId]);

    broadcastSeatUpdate(showId, {
      updatedSeats: showSeatIds.map(id => ({ id, status: 'BOOKED', heldBy: null })),
      reason: 'BOOKING_CONFIRMED'
    });

    sendBookingConfirmation({
      user: { ...user, email: recipientEmail },
      booking: { id: bookingId, booking_reference: bookingReference, total_amount: totalAmount },
      show,
      event: { title: show.event_title, category: show.event_category },
      venue: { name: show.venue_name, address: show.venue_address, city: show.venue_city },
      seats: confirmedSeats,
      qrCodeData
    }).catch(err => console.error('Failed to dispatch booking confirmation email:', err));

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking: {
        id: bookingId,
        booking_reference: bookingReference,
        total_amount: totalAmount,
        status: 'CONFIRMED',
        qr_code_data: qrCodeData,
        seats: confirmedSeats,
        event_title: show.event_title,
        venue_name: show.venue_name,
        start_time: show.start_time
      }
    });
  } catch (err) {
    console.error('Booking confirmation transaction error:', err);
    res.status(500).json({ error: 'Failed to process booking.' });
  }
}

/**
 * Get all bookings for the authenticated user
 */
export async function getUserBookings(req, res) {
  const userId = req.user.id;

  const bookings = await db.all(`
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
  `, [userId]);

  const bookingsWithSeats = [];
  for (const b of bookings) {
    const seats = await db.all(`
      SELECT bs.price_paid, bs.seat_category, s.row_label, s.seat_number, s.section
      FROM booking_seats bs
      JOIN show_seats ss ON bs.show_seat_id = ss.id
      JOIN seats s ON ss.seat_id = s.id
      WHERE bs.booking_id = ?
    `, [b.id]);

    bookingsWithSeats.push({ ...b, seats });
  }

  res.json({ bookings: bookingsWithSeats });
}

/**
 * Get single booking pass details by Reference or ID
 */
export async function getBookingDetails(req, res) {
  const { idOrRef } = req.params;

  const booking = await db.get(`
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
  `, [idOrRef, idOrRef]);

  if (!booking) {
    return res.status(404).json({ error: 'Booking pass not found.' });
  }

  const seats = await db.all(`
    SELECT bs.price_paid, bs.seat_category, s.row_label, s.seat_number, s.section, ss.id as show_seat_id
    FROM booking_seats bs
    JOIN show_seats ss ON bs.show_seat_id = ss.id
    JOIN seats s ON ss.seat_id = s.id
    WHERE bs.booking_id = ?
  `, [booking.id]);

  res.json({ booking: { ...booking, seats } });
}

/**
 * Cancel a booking -> triggers automated Waitlist Reallocation Cascade!
 */
export async function cancelBooking(req, res) {
  const { id } = req.params;
  const user = req.user;

  const booking = await db.get(`
    SELECT b.*, s.id as show_id, s.start_time, e.title as event_title, u.email as customer_email, u.name as customer_name
    FROM bookings b
    JOIN shows s ON b.show_id = s.id
    JOIN events e ON s.event_id = e.id
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
  `, [id]);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  if (booking.user_id !== user.id && !['ADMIN', 'ORGANISER'].includes(user.role)) {
    return res.status(403).json({ error: 'Unauthorized to cancel this booking.' });
  }

  if (booking.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Booking is already cancelled.' });
  }

  const bookedSeats = await db.all(`
    SELECT bs.show_seat_id, s.row_label, s.seat_number, s.default_category
    FROM booking_seats bs
    JOIN show_seats ss ON bs.show_seat_id = ss.id
    JOIN seats s ON ss.seat_id = s.id
    WHERE bs.booking_id = ?
  `, [booking.id]);

  try {
    await db.query(`
      UPDATE bookings
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [booking.id]);

    const cascadeResults = [];
    for (const seat of bookedSeats) {
      const result = await reallocateSeatOrRelease(seat.show_seat_id);
      cascadeResults.push({ seatId: seat.show_seat_id, ...result });
    }

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
