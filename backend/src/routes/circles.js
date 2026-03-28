const express = require('express');
const { query } = require('../db');
const { authenticate, requirePremium } = require('../middleware/auth');

const router = express.Router();

// GET /circles/nearby
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, u.name as creator_name,
              (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as member_count,
              EXISTS(SELECT 1 FROM circle_members WHERE circle_id = c.id AND user_id = $2) as is_member
       FROM circles c JOIN users u ON u.id = c.creator_id
       WHERE c.city = (SELECT city FROM users WHERE id = $2) AND c.is_public = true
       ORDER BY member_count DESC`,
      [req.user.id, req.user.id]
    );
    res.json({ circles: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get circles' });
  }
});

// GET /circles/mine
router.get('/mine', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, u.name as creator_name,
              (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as member_count
       FROM circles c
       JOIN circle_members cm ON cm.circle_id = c.id
       JOIN users u ON u.id = c.creator_id
       WHERE cm.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ circles: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get circles' });
  }
});

// GET /circles/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows: circleRows } = await query(
      `SELECT c.*, u.name as creator_name,
              (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as member_count
       FROM circles c JOIN users u ON u.id = c.creator_id WHERE c.id = $1`,
      [req.params.id]
    );
    if (!circleRows[0]) return res.status(404).json({ error: 'Circle not found' });

    const { rows: members } = await query(
      `SELECT u.id, u.name, u.photos, u.city FROM users u
       JOIN circle_members cm ON cm.user_id = u.id
       WHERE cm.circle_id = $1 AND u.is_active = true`,
      [req.params.id]
    );

    res.json({ circle: circleRows[0], members });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get circle' });
  }
});

// POST /circles/create — premium only for creating more than 1
router.post('/create', authenticate, async (req, res) => {
  const { name, description, interest_tag, city, max_members, schedule } = req.body;
  if (!name || !interest_tag) {
    return res.status(400).json({ error: 'name and interest_tag are required' });
  }

  try {
    // Free users limited to joining; only 1 circle creation
    if (req.user.subscription_tier !== 'premium') {
      const { rows } = await query(
        'SELECT COUNT(*) FROM circles WHERE creator_id = $1',
        [req.user.id]
      );
      if (parseInt(rows[0].count) >= 1) {
        return res.status(403).json({ error: 'Upgrade to Premium to create more circles' });
      }
    }

    const userCity = city || (await query('SELECT city FROM users WHERE id = $1', [req.user.id])).rows[0].city;

    const { rows } = await query(
      `INSERT INTO circles (name, description, interest_tag, city, max_members, creator_id, schedule)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, interest_tag, userCity, max_members || 12, req.user.id, schedule]
    );

    // Auto-join creator
    await query(
      'INSERT INTO circle_members (circle_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [rows[0].id, req.user.id]
    );

    res.status(201).json({ circle: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create circle' });
  }
});

// POST /circles/:id/join
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const { rows: circleRows } = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as member_count
       FROM circles c WHERE c.id = $1`,
      [req.params.id]
    );
    const circle = circleRows[0];
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    if (parseInt(circle.member_count) >= circle.max_members) {
      return res.status(400).json({ error: 'Circle is full' });
    }

    await query(
      'INSERT INTO circle_members (circle_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join circle' });
  }
});

// DELETE /circles/:id/leave
router.delete('/:id/leave', authenticate, async (req, res) => {
  try {
    await query(
      'DELETE FROM circle_members WHERE circle_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave circle' });
  }
});

module.exports = router;
