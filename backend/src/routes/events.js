const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /events — public events in user's city
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT e.*, u.name as creator_name, u.photos as creator_photos,
              (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id) as attendee_count,
              EXISTS(SELECT 1 FROM event_attendees WHERE event_id = e.id AND user_id = $2) as is_attending,
              c.name as circle_name
       FROM events e
       JOIN users u ON u.id = e.creator_id
       LEFT JOIN circles c ON c.id = e.circle_id
       WHERE e.is_public = true
         AND e.location ILIKE '%' || (SELECT city FROM users WHERE id = $2) || '%'
         AND e.datetime >= NOW()
       ORDER BY e.datetime ASC
       LIMIT 50`,
      [req.user.id, req.user.id]
    );
    res.json({ events: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// GET /events/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT e.*, u.name as creator_name,
              (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id) as attendee_count
       FROM events e JOIN users u ON u.id = e.creator_id WHERE e.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Event not found' });

    const { rows: attendees } = await query(
      `SELECT u.id, u.name, u.photos FROM users u
       JOIN event_attendees ea ON ea.user_id = u.id
       WHERE ea.event_id = $1 AND u.is_active = true LIMIT 20`,
      [req.params.id]
    );

    res.json({ event: rows[0], attendees });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get event' });
  }
});

// POST /events — create event
router.post('/', authenticate, async (req, res) => {
  const { title, description, location, location_url, datetime, circle_id, is_public, cost_tier, max_attendees } = req.body;
  if (!title || !location || !datetime) {
    return res.status(400).json({ error: 'title, location, and datetime are required' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO events (title, description, location, location_url, datetime, creator_id, circle_id, is_public, cost_tier, max_attendees)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, description, location, location_url, datetime, req.user.id, circle_id, is_public ?? true, cost_tier, max_attendees]
    );
    // Auto RSVP creator
    await query(
      'INSERT INTO event_attendees (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [rows[0].id, req.user.id]
    );
    res.status(201).json({ event: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// POST /events/:id/rsvp
router.post('/:id/rsvp', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id) as attendee_count
       FROM events e WHERE e.id = $1`,
      [req.params.id]
    );
    const event = rows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.max_attendees && parseInt(event.attendee_count) >= event.max_attendees) {
      return res.status(400).json({ error: 'Event is full' });
    }
    await query(
      'INSERT INTO event_attendees (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to RSVP' });
  }
});

// DELETE /events/:id/rsvp — cancel attendance
router.delete('/:id/rsvp', authenticate, async (req, res) => {
  try {
    await query(
      'DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel RSVP' });
  }
});

module.exports = router;
