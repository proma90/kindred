require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { query } = require('./db');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

// Stripe webhook needs raw body — mount BEFORE express.json()
app.use('/payments/webhook', require('./routes/payments').webhookRouter || express.Router());
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/profile', require('./routes/profile'));
app.use('/matches', require('./routes/matches'));
app.use('/chat', require('./routes/chat'));
app.use('/hangouts', require('./routes/hangouts'));
app.use('/circles', require('./routes/circles'));
app.use('/events', require('./routes/events'));
app.use('/payments', require('./routes/payments'));

app.get('/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Socket.io Real-Time Chat ────────────────────────────────────────────────
const connectedUsers = new Map(); // userId -> socketId

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query('SELECT id, name FROM users WHERE id = $1', [decoded.userId]);
    if (!rows[0]) return next(new Error('User not found'));
    socket.user = rows[0];
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  connectedUsers.set(userId, socket.id);
  console.log(`User connected: ${socket.user.name} (${userId})`);

  // Join personal room for direct notifications
  socket.join(`user:${userId}`);

  // Join a match chat room
  socket.on('join:match', ({ match_id }) => {
    socket.join(`match:${match_id}`);
  });

  socket.on('leave:match', ({ match_id }) => {
    socket.leave(`match:${match_id}`);
  });

  // Send a message
  socket.on('message:send', async ({ match_id, content, type = 'text' }) => {
    if (!match_id || !content) return;
    try {
      // Verify user is in match
      const { rows: matchRows } = await query(
        `SELECT user_a_id, user_b_id FROM matches
         WHERE id = $1 AND status = 'connected'
           AND (user_a_id = $2 OR user_b_id = $2)`,
        [match_id, userId]
      );
      if (!matchRows[0]) return;

      const { rows } = await query(
        `INSERT INTO messages (match_id, sender_id, content, type)
         VALUES ($1, $2, $3, $4)
         RETURNING id, match_id, sender_id, content, type, created_at`,
        [match_id, userId, content, type]
      );

      const message = {
        ...rows[0],
        sender_name: socket.user.name,
      };

      // Broadcast to everyone in this match room
      io.to(`match:${match_id}`).emit('message:new', message);

      // Push notification to the other user if they're not in the room
      const otherId = matchRows[0].user_a_id === userId
        ? matchRows[0].user_b_id
        : matchRows[0].user_a_id;

      io.to(`user:${otherId}`).emit('notification:message', {
        match_id,
        from: socket.user.name,
        preview: content.substring(0, 60),
      });
    } catch (err) {
      console.error('Socket message error:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing:start', ({ match_id }) => {
    socket.to(`match:${match_id}`).emit('typing:start', { user_id: userId, name: socket.user.name });
  });

  socket.on('typing:stop', ({ match_id }) => {
    socket.to(`match:${match_id}`).emit('typing:stop', { user_id: userId });
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(userId);
    console.log(`User disconnected: ${socket.user.name}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Kindred server running on port ${PORT}`);
});

module.exports = { app, io };
