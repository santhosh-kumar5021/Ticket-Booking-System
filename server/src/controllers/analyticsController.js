import db from '../db/connection.js';

export function getOrganiserAnalytics(req, res) {
  const organiserId = req.user.id;

  // 1. High level revenue and booking numbers
  const summary = db.prepare(`
    SELECT
      COUNT(DISTINCT e.id) as total_events,
      COUNT(DISTINCT s.id) as total_shows,
      COUNT(DISTINCT b.id) as total_bookings,
      COALESCE(SUM(CASE WHEN b.status = 'CONFIRMED' OR b.status = 'CHECKED_IN' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
      COUNT(DISTINCT CASE WHEN b.status = 'CHECKED_IN' THEN b.id END) as total_checked_in
    FROM events e
    LEFT JOIN shows s ON e.id = s.event_id
    LEFT JOIN bookings b ON s.id = b.show_id
    WHERE e.organiser_id = ?
  `).get(organiserId);

  // 2. Breakdown per show
  const showBreakdown = db.prepare(`
    SELECT s.id as show_id, s.start_time, e.title as event_title, e.category as event_category,
           v.name as venue_name, v.capacity as venue_capacity,
           (SELECT COUNT(*) FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'BOOKED') as booked_seats,
           (SELECT COUNT(*) FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'AVAILABLE') as available_seats,
           (SELECT COUNT(*) FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'HELD') as held_seats,
           (SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b WHERE b.show_id = s.id AND (b.status = 'CONFIRMED' OR b.status = 'CHECKED_IN')) as revenue,
           (SELECT COUNT(*) FROM waitlist_entries w WHERE w.show_id = s.id AND w.status = 'WAITING') as active_waitlist_count
    FROM shows s
    JOIN events e ON s.event_id = e.id
    JOIN venues v ON s.venue_id = v.id
    WHERE e.organiser_id = ?
    ORDER BY s.start_time ASC
  `).all(organiserId);

  // 3. Sales by seat category across organiser's shows
  const categorySales = db.prepare(`
    SELECT bs.seat_category, COUNT(*) as count, SUM(bs.price_paid) as revenue
    FROM booking_seats bs
    JOIN bookings b ON bs.booking_id = b.id
    JOIN shows s ON b.show_id = s.id
    JOIN events e ON s.event_id = e.id
    WHERE e.organiser_id = ? AND (b.status = 'CONFIRMED' OR b.status = 'CHECKED_IN')
    GROUP BY bs.seat_category
  `).all(organiserId);

  res.json({
    summary: {
      ...summary,
      check_in_rate: summary.total_bookings > 0 ? Math.round((summary.total_checked_in / summary.total_bookings) * 100) : 0
    },
    shows: showBreakdown,
    categorySales
  });
}

export function getAdminAnalytics(req, res) {
  const globalSummary = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM venues) as total_venues,
      (SELECT COUNT(*) FROM events) as total_events,
      (SELECT COUNT(*) FROM shows) as total_shows,
      (SELECT COUNT(*) FROM bookings WHERE status IN ('CONFIRMED', 'CHECKED_IN')) as total_confirmed_bookings,
      (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status IN ('CONFIRMED', 'CHECKED_IN')) as total_gmv,
      (SELECT COUNT(*) FROM waitlist_entries) as total_waitlist_joined,
      (SELECT COUNT(*) FROM waitlist_entries WHERE status = 'ACCEPTED') as total_waitlist_converted
  `).get();

  const conversionRate = globalSummary.total_waitlist_joined > 0
    ? Math.round((globalSummary.total_waitlist_converted / globalSummary.total_waitlist_joined) * 100)
    : 0;

  res.json({
    analytics: {
      ...globalSummary,
      waitlist_conversion_rate: conversionRate
    }
  });
}
