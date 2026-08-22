import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';

export function listEvents(req, res) {
  const { category, search, city } = req.query;

  let query = `
    SELECT e.*, u.name as organiser_name,
           (SELECT COUNT(*) FROM shows s WHERE s.event_id = e.id) as show_count,
           (SELECT MIN(start_time) FROM shows s WHERE s.event_id = e.id AND s.start_time >= CURRENT_TIMESTAMP) as next_show_time
    FROM events e
    JOIN users u ON e.organiser_id = u.id
    WHERE e.status = 'ACTIVE'
  `;
  const params = [];

  if (category && category !== 'ALL') {
    query += ' AND UPPER(e.category) = ?';
    params.push(category.toUpperCase());
  }

  if (search) {
    query += ' AND (e.title LIKE ? OR e.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (city) {
    query += ' AND EXISTS (SELECT 1 FROM shows s JOIN venues v ON s.venue_id = v.id WHERE s.event_id = e.id AND v.city LIKE ?)';
    params.push(`%${city}%`);
  }

  query += ' ORDER BY e.created_at DESC';

  const events = db.prepare(query).all(...params);
  res.json({ events });
}

export function getEvent(req, res) {
  const { id } = req.params;

  const event = db.prepare(`
    SELECT e.*, u.name as organiser_name, u.email as organiser_email
    FROM events e
    JOIN users u ON e.organiser_id = u.id
    WHERE e.id = ?
  `).get(id);

  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  const shows = db.prepare(`
    SELECT s.*, v.name as venue_name, v.address as venue_address, v.city as venue_city, v.capacity as venue_capacity,
           (SELECT COUNT(*) FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'AVAILABLE') as available_seats_count,
           (SELECT COUNT(*) FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'HELD') as held_seats_count,
           (SELECT COUNT(*) FROM show_seats ss WHERE ss.show_id = s.id AND ss.status = 'BOOKED') as booked_seats_count
    FROM shows s
    JOIN venues v ON s.venue_id = v.id
    WHERE s.event_id = ?
    ORDER BY s.start_time ASC
  `).all(id);

  const parsedShows = shows.map(s => ({
    ...s,
    pricing_tiers: JSON.parse(s.pricing_tiers || '{}')
  }));

  res.json({
    event,
    shows: parsedShows
  });
}

export function createEvent(req, res) {
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

  db.prepare(`
    INSERT INTO events (id, organiser_id, title, description, category, image_url, banner_url, duration_mins, age_restriction)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    req.user.id,
    title.trim(),
    description || '',
    category.toUpperCase(),
    image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    banner_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600',
    parseInt(duration_mins, 10),
    age_restriction
  );

  const created = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  res.status(201).json({ event: created });
}

export function getOrganiserEvents(req, res) {
  const events = db.prepare(`
    SELECT e.*,
           (SELECT COUNT(*) FROM shows s WHERE s.event_id = e.id) as show_count,
           (SELECT COUNT(b.id) FROM bookings b JOIN shows s ON b.show_id = s.id WHERE s.event_id = e.id AND b.status = 'CONFIRMED') as total_bookings,
           (SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b JOIN shows s ON b.show_id = s.id WHERE s.event_id = e.id AND b.status = 'CONFIRMED') as total_revenue
    FROM events e
    WHERE e.organiser_id = ?
    ORDER BY e.created_at DESC
  `).all(req.user.id);

  res.json({ events });
}
