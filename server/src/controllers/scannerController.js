import db from '../db/connection.js';
import { verifyQRPayload } from '../utils/qr.js';

/**
 * Gate scanner & ticket validation endpoint
 */
export function scanTicket(req, res) {
  const { qrPayload, bookingReference } = req.body;

  let refToLookup = bookingReference;

  // 1. If raw QR code data was scanned, verify cryptographic signature
  if (qrPayload) {
    const verifyResult = verifyQRPayload(qrPayload);
    if (!verifyResult.valid) {
      return res.status(400).json({
        valid: false,
        status: 'INVALID_SIGNATURE',
        error: `Security Alert: ${verifyResult.error}`
      });
    }
    refToLookup = verifyResult.data.bookingReference || verifyResult.data.bookingId;
  }

  if (!refToLookup) {
    return res.status(400).json({ valid: false, error: 'No QR payload or booking reference supplied.' });
  }

  // 2. Fetch booking from DB
  const booking = db.prepare(`
    SELECT b.*, u.name as customer_name, u.email as customer_email,
           s.start_time, s.end_time,
           e.title as event_title, e.category as event_category,
           v.name as venue_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN shows s ON b.show_id = s.id
    JOIN events e ON s.event_id = e.id
    JOIN venues v ON s.venue_id = v.id
    WHERE b.booking_reference = ? OR b.id = ?
  `).get(refToLookup, refToLookup);

  if (!booking) {
    return res.status(404).json({
      valid: false,
      status: 'NOT_FOUND',
      error: `No booking found matching reference "${refToLookup}".`
    });
  }

  if (booking.status === 'CANCELLED') {
    return res.status(400).json({
      valid: false,
      status: 'CANCELLED_TICKET',
      error: `ENTRY DENIED: This booking was cancelled on ${new Date(booking.updated_at).toLocaleString()}.`,
      booking
    });
  }

  // 3. Fetch seats associated with this booking
  const seats = db.prepare(`
    SELECT bs.price_paid, bs.seat_category, s.row_label, s.seat_number, s.section
    FROM booking_seats bs
    JOIN show_seats ss ON bs.show_seat_id = ss.id
    JOIN seats s ON ss.seat_id = s.id
    WHERE bs.booking_id = ?
  `).all(booking.id);

  // 4. Duplicate Check-in Protection
  if (booking.checked_in_at) {
    return res.status(409).json({
      valid: false,
      status: 'ALREADY_CHECKED_IN',
      error: `⚠️ DUPLICATE ENTRY DETECTED! Ticket was already checked in at ${new Date(booking.checked_in_at).toLocaleTimeString()}.`,
      booking: { ...booking, seats }
    });
  }

  // 5. Mark as successfully checked in
  const checkedInTime = new Date().toISOString();
  db.prepare(`
    UPDATE bookings
    SET checked_in_at = ?, status = 'CHECKED_IN', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(checkedInTime, booking.id);

  res.json({
    valid: true,
    status: 'VALID_ENTRY',
    message: '✅ Ticket Verified! Welcome to the event.',
    booking: {
      ...booking,
      checked_in_at: checkedInTime,
      status: 'CHECKED_IN',
      seats
    }
  });
}
