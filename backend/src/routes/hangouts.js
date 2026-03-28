const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /hangouts/propose
router.post('/propose', authenticate, async (req, res) => {
  const { match_id, circle_id, activity, location, location_url, datetime, cost_tier } = req.body;
  if (!activity) return res.status(400).json({ error: 'activity is required' });

  try {
    if (match_id) {
      const { rows } = await query(
        'SELECT id FROM matches WHERE id = $1 AND status = $2 AND (user_a_id = $3 OR user_b_id = $3)',
        [match_id, 'connected', req.user.id]
      );
      if (!rows[0]) return res.status(403).json({ error: 'Match not found' });
    }

    const { rows } = await query(
      `INSERT INTO hangouts (match_id, circle_id, activity, location, location_url, datetime, cost_tier, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [match_id, circle_id, activity, location, location_url, datetime, cost_tier, req.user.id]
    );

    // Send system message in chat
    if (match_id) {
      await query(
        `INSERT INTO messages (match_id, sender_id, content, type) VALUES ($1, $2, $3, 'system')`,
        [match_id, req.user.id, `📅 Hangout proposed: ${activity} on ${datetime ? new Date(datetime).toLocaleDateString() : 'TBD'}`]
      );
    }

    res.status(201).json({ hangout: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to propose hangout' });
  }
});

// PUT /hangouts/:id/confirm
router.put('/:id/confirm', authenticate, async (req, res) => {
  try {
    const { rows: hangoutRows } = await query(
      `SELECT h.*, m.user_a_id, m.user_b_id FROM hangouts h
       LEFT JOIN matches m ON m.id = h.match_id
       WHERE h.id = $1`,
      [req.params.id]
    );
    const hangout = hangoutRows[0];
    if (!hangout) return res.status(404).json({ error: 'Hangout not found' });

    const isParticipant =
      hangout.created_by === req.user.id ||
      hangout.user_a_id === req.user.id ||
      hangout.user_b_id === req.user.id;
    if (!isParticipant) return res.status(403).json({ error: 'Not authorized' });

    const { rows } = await query(
      `UPDATE hangouts SET status = 'confirmed' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json({ hangout: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm hangout' });
  }
});

// PUT /hangouts/:id/rate
router.put('/:id/rate', authenticate, async (req, res) => {
  const { rating } = req.body; // 1=liked, 2=neutral, 3=not a match
  if (!rating || rating < 1 || rating > 3) {
    return res.status(400).json({ error: 'rating must be 1, 2, or 3' });
  }
  try {
    const { rows: hangoutRows } = await query(
      `SELECT h.*, m.user_a_id, m.user_b_id FROM hangouts h
       LEFT JOIN matches m ON m.id = h.match_id
       WHERE h.id = $1 AND h.status = 'completed'`,
      [req.params.id]
    );
    const hangout = hangoutRows[0];
    if (!hangout) return res.status(404).json({ error: 'Hangout not found or not completed' });

    const isA = hangout.user_a_id === req.user.id || hangout.created_by === req.user.id;
    const field = isA ? 'rating_a' : 'rating_b';

    await query(`UPDATE hangouts SET ${field} = $1 WHERE id = $2`, [rating, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rate hangout' });
  }
});

// GET /hangouts/mine
router.get('/mine', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT h.*, u.name as creator_name
       FROM hangouts h
       JOIN users u ON u.id = h.created_by
       JOIN matches m ON m.id = h.match_id
       WHERE m.user_a_id = $1 OR m.user_b_id = $1
       ORDER BY h.datetime ASC NULLS LAST`,
      [req.user.id]
    );
    res.json({ hangouts: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get hangouts' });
  }
});

module.exports = router;
