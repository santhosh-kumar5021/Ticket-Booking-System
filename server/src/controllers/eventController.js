import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';

export async function listEvents(req, res) {
  const { category, search, city } = req.query;

  let querySql = `
    SELECT e.*, u.name as organiser_name,
           (SELECT COUNT(*)::int FROM shows s WHERE s.event_id = e.id) as show_count,
           (SELECT MIN(start_time) FROM shows s WHERE s.event_id = e.id AND s.start_time >= CURRENT_TIMESTAMP) as next_show_time
    FROM events e
    JOIN users u ON e.organiser_id = u.id
    WHERE e.status = 'ACTIVE'
  `;
  const params = [];

  if (category && category !== 'ALL') {
    querySql += ' AND UPPER(e.category) = ?';
    params.push(category.toUpperCase());
  }

  if (search) {
    querySql += ' AND (e.title ILIKE ? OR e.description ILIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (city) {
    querySql += ' AND EXISTS (SELECT 1 FROM shows s JOIN venues v ON s.venue_id = v.id WHERE s.event_id = e.id AND v.city ILIKE ?)';
    params.push(`%${city}%`);
  }

  querySql += ' ORDER BY e.created_at DESC';

  const events = await db.all(querySql, params);
  res.json({ events });
}

export async function getEvent(req, res) {
  const { id } = req.params;

  const event = await db.get(`
    SELECT e.*, u.name as organiser_name, u.email as organiser_email
    FROM events e
    JOIN users u ON e.organiser_id = u.id
    WHERE e.id = ?
  `, [id]);

  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  const shows = await db.all(`
    SELECT s.*, v.name as venue_name, v.address as venue_address, v.city as venue_city, v.capacity as venue_capacity,
           (SELECT COUNT(*)::int FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'AVAILABLE') as available_seats_count,
           (SELECT COUNT(*)::int FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'HELD') as held_seats_count,
           (SELECT COUNT(*)::int FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'BOOKED') as booked_seats_count
    FROM shows s
    JOIN venues v ON s.venue_id = v.id
    WHERE s.event_id = ?
    ORDER BY s.start_time ASC
  `, [id]);

  const parsedShows = shows.map(s => ({
    ...s,
    pricing_tiers: typeof s.pricing_tiers === 'string' ? JSON.parse(s.pricing_tiers || '{}') : s.pricing_tiers
  }));

  res.json({
    event,
    shows: parsedShows
  });
}

export async function createEvent(req, res) {
  const {
    title,
    description,
    category,
    image_url,
    banner_url,
    duration_mins = 120,
    age_restriction = 'All Ages'
  } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required.' });
  }

  const eventId = `evt-${uuidv4()}`;

  await db.query(`
    INSERT INTO events (id, organiser_id, title, description, category, image_url, banner_url, duration_mins, age_restriction)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    eventId,
    req.user.id,
    title.trim(),
    description || '',
    category.toUpperCase(),
    image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    banner_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600',
    parseInt(duration_mins, 10),
    age_restriction
  ]);

  const created = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
  res.status(201).json({ event: created });
}

export async function getOrganiserEvents(req, res) {
  const events = await db.all(`
    SELECT e.*,
           (SELECT COUNT(*)::int FROM shows s WHERE s.event_id = e.id) as show_count,
           (SELECT COUNT(b.id)::int FROM bookings b JOIN shows s ON b.show_id = s.id WHERE s.event_id = e.id AND b.status = 'CONFIRMED') as total_bookings,
           (SELECT COALESCE(SUM(b.total_amount), 0)::float FROM bookings b JOIN shows s ON b.show_id = s.id WHERE s.event_id = e.id AND b.status = 'CONFIRMED') as total_revenue
    FROM events e
    WHERE e.organiser_id = ?
    ORDER BY e.created_at DESC
  `, [req.user.id]);

  res.json({ events });
}
