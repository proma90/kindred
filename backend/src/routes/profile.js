const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /profile/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Check if blocked
    const blocked = await query(
      `SELECT 1 FROM blocks WHERE
        (blocker_id = $1 AND blocked_id = $2) OR
        (blocker_id = $2 AND blocked_id = $1)`,
      [req.user.id, req.params.id]
    );
    if (blocked.rows.length > 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { rows } = await query(
      `SELECT id, name, age_range, city, neighborhood, bio, photos,
              interests, is_verified, created_at
       FROM users WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PUT /profile/update
router.put('/update', authenticate, async (req, res) => {
  const { name, age_range, city, neighborhood, bio, photos, interests, dealbreakers } = req.body;
  try {
    const { rows } = await query(
      `UPDATE users SET
        name = COALESCE($1, name),
        age_range = COALESCE($2, age_range),
        city = COALESCE($3, city),
        neighborhood = COALESCE($4, neighborhood),
        bio = COALESCE($5, bio),
        photos = COALESCE($6, photos),
        interests = COALESCE($7, interests),
        dealbreakers = COALESCE($8, dealbreakers)
       WHERE id = $9
       RETURNING id, name, email, age_range, city, neighborhood, bio, photos, interests`,
      [name, age_range, city, neighborhood, bio, photos, interests, dealbreakers, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// POST /profile/report
router.post('/report', authenticate, async (req, res) => {
  const { reported_id, reason, details } = req.body;
  if (!reported_id || !reason) {
    return res.status(400).json({ error: 'reported_id and reason are required' });
  }
  try {
    await query(
      `INSERT INTO reports (reporter_id, reported_id, reason, details) VALUES ($1, $2, $3, $4)`,
      [req.user.id, reported_id, reason, details]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Report failed' });
  }
});

// POST /profile/block
router.post('/block', authenticate, async (req, res) => {
  const { blocked_id } = req.body;
  if (!blocked_id) return res.status(400).json({ error: 'blocked_id is required' });
  try {
    await query(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.user.id, blocked_id]
    );
    // Also deactivate any existing matches
    await query(
      `UPDATE matches SET status = 'rejected'
       WHERE (user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1)`,
      [req.user.id, blocked_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Block failed' });
  }
});

module.exports = router;
