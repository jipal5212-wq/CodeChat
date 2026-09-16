require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codechat';

// ─── Middleware ──────────────────────────────────────
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10kb' }));

// HTTP rate limiter — 100 requests per 15 minutes per IP
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
}));

// ─── Socket.IO ──────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── MongoDB Connection ─────────────────────────────
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Server will continue but database features will not work.');
  });

// ─── Routes ─────────────────────────────────────────
const roomRoutes = require('./routes/roomRoutes');
app.use('/api/rooms', roomRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    database: dbReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ─── Socket Handler ─────────────────────────────────
const setupChatSocket = require('./sockets/chatSocket');
setupChatSocket(io);

// ─── Start Server ───────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀 CodeChat server running on port ${PORT}`);
  console.log(`📡 Accepting connections from ${CLIENT_URL}`);
  console.log(`💾 MongoDB: ${MONGODB_URI}\n`);
});

module.exports = { app, server, io };
