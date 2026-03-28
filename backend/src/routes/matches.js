const express = require('express');
const { query } = require('../db');
const { authenticate, requirePremium } = require('../middleware/auth');
const { calculateCompatibility } = require('../utils/compatibility');

const router = express.Router();

const DAILY_LIMIT_FREE = 5;
const DAILY_LIMIT_PREMIUM = 999;

// GET /matches/daily — returns today's card stack
router.get('/daily', authenticate, async (req, res) => {
  try {
    const limit = req.user.subscription_tier === 'premium' ? DAILY_LIMIT_PREMIUM : DAILY_LIMIT_FREE;

    // Get current user's full profile for scoring
    const { rows: meRows } = await query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );
    const me = meRows[0];

    // Get users already seen today + blocked + already matched
    const { rows: seenRows } = await query(
      `SELECT seen_user_id FROM daily_queue WHERE user_id = $1 AND date = CURRENT_DATE`,
      [req.user.id]
    );
    const { rows: blockedRows } = await query(
      `SELECT blocked_id FROM blocks WHERE blocker_id = $1
       UNION SELECT blocker_id FROM blocks WHERE blocked_id = $1`,
      [req.user.id]
    );
    const { rows: matchedRows } = await query(
      `SELECT CASE WHEN user_a_id = $1 THEN user_b_id ELSE user_a_id END as other_id
       FROM matches WHERE user_a_id = $1 OR user_b_id = $1`,
      [req.user.id]
    );

    const excludeIds = [
      req.user.id,
      ...seenRows.map(r => r.seen_user_id),
      ...blockedRows.map(r => r.blocked_id || r.blocker_id),
      ...matchedRows.map(r => r.other_id),
    ];

    // Find candidates in same city
    const { rows: candidates } = await query(
      `SELECT id, name, age_range, city, neighborhood, bio, photos,
              interests, quiz_answers, is_verified
       FROM users
       WHERE is_active = true
         AND city = $1
         AND id != ALL($2::uuid[])
       LIMIT 50`,
      [me.city, excludeIds]
    );

    // Score and sort
    const scored = candidates
      .map(u => ({
        ...u,
        quiz_answers: undefined, // don't expose to client
        compatibility_score: calculateCompatibility(me, u),
        icebreaker: generateIcebreaker(me.interests, u.interests),
      }))
      .sort((a, b) => b.compatibility_score - a.compatibility_score)
      .slice(0, limit);

    // Record as seen
    if (scored.length > 0) {
      const values = scored.map((u, i) => `($1, $${i + 2}, CURRENT_DATE)`).join(',');
      await query(
        `INSERT INTO daily_queue (user_id, seen_user_id, date) VALUES ${values} ON CONFLICT DO NOTHING`,
        [req.user.id, ...scored.map(u => u.id)]
      );
    }

    res.json({ cards: scored, remaining: limit - scored.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get daily cards' });
  }
});

// POST /matches/connect — like or pass a profile
router.post('/connect', authenticate, async (req, res) => {
  const { target_user_id, action } = req.body; // action: 'connect' | 'pass'
  if (!target_user_id || !['connect', 'pass'].includes(action)) {
    return res.status(400).json({ error: 'target_user_id and action (connect|pass) required' });
  }
  try {
    // Get full profiles for compatibility score
    const { rows: profiles } = await query(
      'SELECT * FROM users WHERE id = ANY($1::uuid[])',
      [[req.user.id, target_user_id]]
    );
    const me = profiles.find(p => p.id === req.user.id);
    const them = profiles.find(p => p.id === target_user_id);
    if (!them) return res.status(404).json({ error: 'User not found' });

    const score = calculateCompatibility(me, them);

    // Upsert match row (user_a is always the lower UUID for deduplication)
    const [userA, userB] = [req.user.id, target_user_id].sort();
    const isUserA = req.user.id === userA;

    const { rows: existing } = await query(
      'SELECT * FROM matches WHERE user_a_id = $1 AND user_b_id = $2',
      [userA, userB]
    );

    let match;
    if (!existing[0]) {
      const { rows } = await query(
        `INSERT INTO matches (user_a_id, user_b_id, compatibility_score, user_a_action, user_b_action)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userA, userB, score,
          isUserA ? action : null,
          isUserA ? null : action]
      );
      match = rows[0];
    } else {
      const updateField = isUserA ? 'user_a_action' : 'user_b_action';
      const { rows } = await query(
        `UPDATE matches SET ${updateField} = $1 WHERE user_a_id = $2 AND user_b_id = $3 RETURNING *`,
        [action, userA, userB]
      );
      match = rows[0];
    }

    // Check for mutual connect
    if (match.user_a_action === 'connect' && match.user_b_action === 'connect') {
      await query(
        `UPDATE matches SET status = 'connected' WHERE id = $1`,
        [match.id]
      );
      // Insert icebreaker system message
      const icebreaker = generateIcebreaker(me.interests, them.interests);
      await query(
        `INSERT INTO messages (match_id, sender_id, content, type)
         VALUES ($1, $2, $3, 'system')`,
        [match.id, req.user.id, icebreaker]
      );
      return res.json({ matched: true, match_id: match.id });
    }

    res.json({ matched: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Action failed' });
  }
});

// GET /matches/active — all mutual matches
router.get('/active', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT m.id as match_id, m.compatibility_score, m.created_at as matched_at,
              u.id, u.name, u.photos, u.city, u.interests, u.is_verified,
              (SELECT content FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
              (SELECT COUNT(*) FROM messages WHERE match_id = m.id AND sender_id != $1 AND read_at IS NULL) as unread_count
       FROM matches m
       JOIN users u ON u.id = CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END
       WHERE (m.user_a_id = $1 OR m.user_b_id = $1)
         AND m.status = 'connected'
         AND u.is_active = true
       ORDER BY last_message_at DESC NULLS LAST, m.created_at DESC`,
      [req.user.id]
    );
    res.json({ matches: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

// GET /matches/likes — who liked me (premium only)
router.get('/likes', authenticate, requirePremium, async (req, res) => {
  try {
    const [userIdSorted] = [req.user.id];
    const { rows } = await query(
      `SELECT u.id, u.name, u.photos, u.city, u.interests, m.compatibility_score
       FROM matches m
       JOIN users u ON u.id = CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END
       WHERE (m.user_a_id = $1 OR m.user_b_id = $1)
         AND m.status = 'pending'
         AND ((m.user_b_id = $1 AND m.user_a_action = 'connect') OR
              (m.user_a_id = $1 AND m.user_b_action = 'connect'))
         AND u.is_active = true
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json({ likes: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get likes' });
  }
});

function generateIcebreaker(interestsA = [], interestsB = []) {
  const shared = interestsA.filter(i => interestsB.includes(i));
  const icebreakers = {
    Hiking: "You both love hiking 🥾 — what's the best trail you've ever done?",
    Gaming: "You're both gamers 🎮 — what's your current obsession?",
    Cooking: "You both love cooking 🍳 — what's your signature dish?",
    Film: "You're both film lovers 🎬 — last movie that actually impressed you?",
    Books: "You're both readers 📚 — what's the last book you couldn't put down?",
    Fitness: "You're both into fitness 💪 — gym, outdoor, or home workouts?",
    Art: "You both love art 🎨 — creating or appreciating more?",
    Music: "Music fans unite 🎵 — what's always on your playlist?",
    Tech: "Tech people! 💻 — what project are you obsessing over right now?",
    Travel: "Fellow travelers ✈️ — where are you dreaming of going next?",
  };
  if (shared.length > 0) {
    const interest = shared[0];
    return icebreakers[interest] || `You both love ${interest}! What's your take on it?`;
  }
  return "You've matched with each other on Kindred! 🎉 Say hi and plan something fun.";
}

module.exports = router;
