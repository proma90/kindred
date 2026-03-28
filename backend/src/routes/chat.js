const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /chat/:match_id — load messages
router.get('/:match_id', authenticate, async (req, res) => {
  try {
    // Verify user is part of this match
    const { rows: matchRows } = await query(
      `SELECT id FROM matches
       WHERE id = $1 AND status = 'connected'
         AND (user_a_id = $2 OR user_b_id = $2)`,
      [req.params.match_id, req.user.id]
    );
    if (!matchRows[0]) return res.status(403).json({ error: 'Match not found' });

    const cursor = req.query.before; // pagination cursor (message id)
    let messagesQuery;
    let params;

    if (cursor) {
      messagesQuery = `
        SELECT m.id, m.content, m.type, m.read_at, m.created_at,
               u.id as sender_id, u.name as sender_name, u.photos as sender_photos
        FROM messages m JOIN users u ON u.id = m.sender_id
        WHERE m.match_id = $1
          AND m.created_at < (SELECT created_at FROM messages WHERE id = $3)
        ORDER BY m.created_at DESC LIMIT 50`;
      params = [req.params.match_id, req.user.id, cursor];
    } else {
      messagesQuery = `
        SELECT m.id, m.content, m.type, m.read_at, m.created_at,
               u.id as sender_id, u.name as sender_name, u.photos as sender_photos
        FROM messages m JOIN users u ON u.id = m.sender_id
        WHERE m.match_id = $1
        ORDER BY m.created_at DESC LIMIT 50`;
      params = [req.params.match_id];
    }

    const { rows: messages } = await query(messagesQuery, params);

    // Mark unread messages as read
    await query(
      `UPDATE messages SET read_at = NOW()
       WHERE match_id = $1 AND sender_id != $2 AND read_at IS NULL`,
      [req.params.match_id, req.user.id]
    );

    res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// POST /chat/:match_id/message — send a message (REST fallback)
router.post('/:match_id/message', authenticate, async (req, res) => {
  const { content, type = 'text' } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  try {
    const { rows: matchRows } = await query(
      `SELECT id FROM matches
       WHERE id = $1 AND status = 'connected'
         AND (user_a_id = $2 OR user_b_id = $2)`,
      [req.params.match_id, req.user.id]
    );
    if (!matchRows[0]) return res.status(403).json({ error: 'Match not found' });

    const { rows } = await query(
      `INSERT INTO messages (match_id, sender_id, content, type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, match_id, sender_id, content, type, created_at`,
      [req.params.match_id, req.user.id, content, type]
    );
    res.status(201).json({ message: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
