import db from '../db/connection.js';

export async function getOrganiserAnalytics(req, res) {
  const organiserId = req.user.id;

  const summary = await db.get(`
    SELECT
      COUNT(DISTINCT e.id)::int as total_events,
      COUNT(DISTINCT s.id)::int as total_shows,
      COUNT(DISTINCT b.id)::int as total_bookings,
      COALESCE(SUM(CASE WHEN b.status = 'CONFIRMED' OR b.status = 'CHECKED_IN' THEN b.total_amount ELSE 0 END), 0)::float as total_revenue,
      COUNT(DISTINCT CASE WHEN b.status = 'CHECKED_IN' THEN b.id END)::int as total_checked_in
    FROM events e
    LEFT JOIN shows s ON e.id = s.event_id
    LEFT JOIN bookings b ON s.id = b.show_id
    WHERE e.organiser_id = ?
  `, [organiserId]);

  const showBreakdown = await db.all(`
    SELECT s.id as show_id, s.start_time, e.title as event_title, e.category as event_category,
           v.name as venue_name, v.capacity as venue_capacity,
           (SELECT COUNT(*)::int FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'BOOKED') as booked_seats,
           (SELECT COUNT(*)::int FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'AVAILABLE') as available_seats,
           (SELECT COUNT(*)::int FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'HELD') as held_seats,
           (SELECT COALESCE(SUM(b.total_amount), 0)::float FROM bookings b WHERE b.show_id = s.id AND (b.status = 'CONFIRMED' OR b.status = 'CHECKED_IN')) as revenue,
           (SELECT COUNT(*)::int FROM waitlist_entries w WHERE w.show_id = s.id AND w.status = 'WAITING') as active_waitlist_count
    FROM shows s
    JOIN events e ON s.event_id = e.id
    JOIN venues v ON s.venue_id = v.id
    WHERE e.organiser_id = ?
    ORDER BY s.start_time ASC
  `, [organiserId]);

  const categorySales = await db.all(`
    SELECT bs.seat_category, COUNT(*)::int as count, SUM(bs.price_paid)::float as revenue
    FROM booking_seats bs
    JOIN bookings b ON bs.booking_id = b.id
    JOIN shows s ON b.show_id = s.id
    JOIN events e ON s.event_id = e.id
    WHERE e.organiser_id = ? AND (b.status = 'CONFIRMED' OR b.status = 'CHECKED_IN')
    GROUP BY bs.seat_category
  `, [organiserId]);

  res.json({
    summary: {
      ...summary,
      check_in_rate: summary.total_bookings > 0 ? Math.round((summary.total_checked_in / summary.total_bookings) * 100) : 0
    },
    shows: showBreakdown,
    categorySales
  });
}

export async function getAdminAnalytics(req, res) {
  const globalSummary = await db.get(`
    SELECT
      (SELECT COUNT(*)::int FROM users) as total_users,
      (SELECT COUNT(*)::int FROM venues) as total_venues,
      (SELECT COUNT(*)::int FROM events) as total_events,
      (SELECT COUNT(*)::int FROM shows) as total_shows,
      (SELECT COUNT(*)::int FROM bookings WHERE status IN ('CONFIRMED', 'CHECKED_IN')) as total_confirmed_bookings,
      (SELECT COALESCE(SUM(total_amount), 0)::float FROM bookings WHERE status IN ('CONFIRMED', 'CHECKED_IN')) as total_gmv,
      (SELECT COUNT(*)::int FROM waitlist_entries) as total_waitlist_joined,
      (SELECT COUNT(*)::int FROM waitlist_entries WHERE status = 'ACCEPTED') as total_waitlist_converted
  `);

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
