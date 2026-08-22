import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';

export async function listVenues(req, res) {
  const venues = await db.all('SELECT * FROM venues ORDER BY name ASC');
  const parsed = venues.map(v => ({
    ...v,
    layout_config: typeof v.layout_config === 'string' ? JSON.parse(v.layout_config || '{}') : v.layout_config
  }));
  res.json({ venues: parsed });
}

export async function getVenue(req, res) {
  const { id } = req.params;
  const venue = await db.get('SELECT * FROM venues WHERE id = ?', [id]);
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found.' });
  }

  const seats = await db.all('SELECT * FROM seats WHERE venue_id = ? ORDER BY row_label ASC, seat_number ASC', [id]);

  res.json({
    venue: {
      ...venue,
      layout_config: typeof venue.layout_config === 'string' ? JSON.parse(venue.layout_config || '{}') : venue.layout_config,
      seats
    }
  });
}

export async function createVenue(req, res) {
  const { name, address, city, screenLabel = 'Stage / Screen', sections = [], aislesAfterCols = [] } = req.body;

  if (!name || !address || !city || sections.length === 0) {
    return res.status(400).json({ error: 'Name, address, city, and at least one layout section are required.' });
  }

  const venueId = `ven-${uuidv4()}`;
  let totalCapacity = 0;

  const layoutConfig = {
    screenLabel,
    sections,
    aislesAfterCols
  };

  try {
    let currentY = 0;
    const seatValues = [];
    const createdSeats = [];

    sections.forEach((section, sIdx) => {
      const rows = section.rows || [];
      const cols = section.cols || 10;
      const cat = section.defaultCategory || 'STANDARD';
      const secName = section.name || `Section ${sIdx + 1}`;

      rows.forEach((rowLabel, rIdx) => {
        for (let col = 1; col <= cols; col++) {
          totalCapacity++;
          const seatId = `seat-${venueId}-${rowLabel}-${col}`;
          const isAccessible = section.accessibleRow === rowLabel && [1, cols].includes(col) ? 1 : 0;
          const xPos = col * 40 + (aislesAfterCols.some(a => col > a) ? 20 : 0);
          const yPos = currentY + rIdx * 35;

          seatValues.push(`('${seatId}', '${venueId}', '${rowLabel}', ${col}, '${secName}', '${cat}', ${isAccessible}, ${xPos}, ${yPos})`);
          createdSeats.push({ id: seatId, row_label: rowLabel, seat_number: col, section: secName, default_category: cat });
        }
      });
      currentY += (rows.length + 1) * 35;
    });

    if (seatValues.length > 0) {
      await db.query(`
        INSERT INTO seats (id, venue_id, row_label, seat_number, section, default_category, is_accessible, x_pos, y_pos)
        VALUES ${seatValues.join(', ')}
      `);
    }

    await db.query(`
      INSERT INTO venues (id, name, address, city, capacity, layout_config)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [venueId, name, address, city, totalCapacity, JSON.stringify(layoutConfig)]);

    res.status(201).json({
      venue: { id: venueId, name, address, city, capacity: totalCapacity, seatsCount: createdSeats.length }
    });
  } catch (err) {
    console.error('Failed to create venue:', err);
    res.status(500).json({ error: 'Failed to create venue layout.' });
  }
}
