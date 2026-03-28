const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password and name are required' });
  }
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name, subscription_tier`,
      [email.toLowerCase(), name]
    );
    const token = signToken(rows[0].id);
    res.status(201).json({ user: rows[0], token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const { rows } = await query(
      'SELECT id, email, name, password_hash, subscription_tier, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password_hash || '');
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [user.id]);
    const token = signToken(user.id);
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/onboarding
router.post('/onboarding', authenticate, async (req, res) => {
  const { age_range, city, neighborhood, bio, photos, quiz_answers, interests, dealbreakers } = req.body;
  try {
    const { rows } = await query(
      `UPDATE users SET
        age_range = COALESCE($1, age_range),
        city = COALESCE($2, city),
        neighborhood = COALESCE($3, neighborhood),
        bio = COALESCE($4, bio),
        photos = COALESCE($5, photos),
        quiz_answers = COALESCE($6, quiz_answers),
        interests = COALESCE($7, interests),
        dealbreakers = COALESCE($8, dealbreakers)
       WHERE id = $9
       RETURNING id, name, email, age_range, city, neighborhood, bio, photos, interests, subscription_tier`,
      [age_range, city, neighborhood, bio, photos, quiz_answers, interests, dealbreakers, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Onboarding update failed' });
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, email, age_range, city, neighborhood, bio, photos,
            interests, quiz_answers, subscription_tier, is_verified, created_at
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  res.json({ user: rows[0] });
});

module.exports = router;
