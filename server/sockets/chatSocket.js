const Message = require('../models/Message');
const rateLimiter = require('../middleware/rateLimiter');
const { validateAndProcess } = require('../services/codeValidationService');
const { SOCKET_EVENTS, SUPPORTED_LANGUAGES, LIMITS } = require('../utils/constants');

// In-memory active sockets tracker for instant online count
const activeClients = new Map(); // socketId -> { username, language, roomId }

function getOnlineCount(roomId = 'GLOBAL') {
  let count = 0;
  for (const client of activeClients.values()) {
    if (client.roomId === roomId) count++;
  }
  return Math.max(count, 1);
}

function sanitizeUsername(input) {
  if (!input || typeof input !== 'string') {
    return `Coder_${Math.floor(1000 + Math.random() * 9000)}`;
  }
  // Strip dangerous characters, trim, limit to 25 chars
  const cleaned = input.replace(/[<>'"&]/g, '').trim();
  if (cleaned.length === 0) {
    return `Coder_${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return cleaned.slice(0, LIMITS.MAX_USERNAME_LENGTH);
}

/**
 * Set up Socket.IO event handlers for CodeChat.
 * @param {import('socket.io').Server} io
 */
function setupChatSocket(io) {
  io.on('connection', (socket) => {
    // ─────────────────────────────────────────
    // JOIN ROOM / GLOBAL CHAT
    // ─────────────────────────────────────────
    socket.on(SOCKET_EVENTS.JOIN_ROOM, async (data) => {
      try {
        const username = sanitizeUsername(data?.username);
        const roomId = (data?.roomId || 'GLOBAL').trim().toUpperCase();
        const language = SUPPORTED_LANGUAGES.includes(data?.language) ? data.language : 'python';

        // Join socket room
        socket.join(roomId);
        socket.data.username = username;
        socket.data.language = language;
        socket.data.roomId = roomId;

        activeClients.set(socket.id, { username, language, roomId });

        // Retrieve last 50 messages for this room
        let messages = [];
        try {
          messages = await Message.getRecentMessages(roomId, LIMITS.MAX_LIVE_MESSAGES);
        } catch (dbErr) {
          console.warn('DB error fetching messages (running in fallback):', dbErr.message);
        }

        const onlineCount = getOnlineCount(roomId);

        // Acknowledge joining user
        socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
          username,
          roomId,
          language,
          messages,
          onlineCount,
        });

        // Broadcast updated online count to all clients in room
        io.to(roomId).emit(SOCKET_EVENTS.ONLINE_COUNT, { count: onlineCount });

        // Broadcast user joined
        socket.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
          username,
          language,
          onlineCount,
        });
      } catch (err) {
        console.error('Join chat error:', err.message);
        socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, { error: 'Failed to join chat.' });
      }
    });

    // ─────────────────────────────────────────
    // RUN CODE (Preview execution before sending)
    // ─────────────────────────────────────────
    socket.on(SOCKET_EVENTS.RUN_CODE, (data) => {
      try {
        const { code, language } = data || {};
        const lang = SUPPORTED_LANGUAGES.includes(language) ? language : (socket.data.language || 'python');

        if (!code || typeof code !== 'string') {
          return socket.emit(SOCKET_EVENTS.RUN_RESULT, {
            valid: false,
            errors: [{ message: 'Code cannot be empty.' }],
            output: null,
          });
        }

        const startTime = Date.now();
        const result = validateAndProcess(lang, code);
        const executionTimeMs = Date.now() - startTime;

        socket.emit(SOCKET_EVENTS.RUN_RESULT, {
          ...result,
          executionTimeMs,
        });
      } catch (err) {
        console.error('Run code error:', err.message);
        socket.emit(SOCKET_EVENTS.RUN_RESULT, {
          valid: false,
          errors: [{ message: 'Execution error occurred.' }],
          output: null,
        });
      }
    });

    // ─────────────────────────────────────────
    // SEND MESSAGE
    // ─────────────────────────────────────────
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data) => {
      try {
        // 1. Rate limiter check
        const rateCheck = rateLimiter.check(socket.id);
        if (!rateCheck.allowed) {
          const seconds = Math.ceil((rateCheck.retryAfterMs || 1000) / 1000);
          return socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, {
            error: `Rate limit: Slow down! Try again in ${seconds}s.`,
            type: 'rate_limit',
          });
        }

        const { code, language } = data || {};
        const lang = SUPPORTED_LANGUAGES.includes(language) ? language : (socket.data.language || 'python');
        const username = socket.data.username || sanitizeUsername(data?.username);
        const roomId = socket.data.roomId || 'GLOBAL';

        if (!code || typeof code !== 'string') {
          return socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, {
            error: 'Message code cannot be empty.',
          });
        }

        // 2. Validate and execute code
        const validation = validateAndProcess(lang, code);

        if (!validation.valid) {
          const errMsg = validation.errors?.[0]?.message || 'Code validation failed.';
          return socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, {
            error: errMsg,
            errors: validation.errors,
          });
        }

        // 3. Save to MongoDB with 50-message cap enforcement
        let savedMsg = {
          _id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          username,
          language: lang,
          rawCode: code,
          renderedOutput: validation.output || '',
          roomId,
          timestamp: new Date(),
        };

        try {
          const doc = await Message.createAndPrune({
            username,
            language: lang,
            rawCode: code,
            renderedOutput: validation.output || '',
            roomId,
          });
          savedMsg._id = doc._id;
          savedMsg.timestamp = doc.timestamp;
        } catch (dbErr) {
          console.warn('DB save warning (broadcasting in-memory):', dbErr.message);
        }

        // 4. Broadcast live to everyone in the room
        io.to(roomId).emit(SOCKET_EVENTS.NEW_MESSAGE, {
          _id: savedMsg._id,
          username: savedMsg.username,
          language: savedMsg.language,
          rawCode: savedMsg.rawCode,
          renderedOutput: savedMsg.renderedOutput,
          roomId: savedMsg.roomId,
          timestamp: savedMsg.timestamp,
        });
      } catch (err) {
        console.error('Send message error:', err.message);
        socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, { error: 'Failed to send message.' });
      }
    });

    // ─────────────────────────────────────────
    // CHANGE LANGUAGE
    // ─────────────────────────────────────────
    socket.on(SOCKET_EVENTS.CHANGE_LANGUAGE, (data) => {
      const { language } = data || {};
      if (SUPPORTED_LANGUAGES.includes(language)) {
        socket.data.language = language;
        const client = activeClients.get(socket.id);
        if (client) client.language = language;
      }
    });

    // ─────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────
    socket.on('disconnect', () => {
      const client = activeClients.get(socket.id);
      activeClients.delete(socket.id);
      rateLimiter.remove(socket.id);

      if (client) {
        const onlineCount = getOnlineCount(client.roomId);
        io.to(client.roomId).emit(SOCKET_EVENTS.ONLINE_COUNT, { count: onlineCount });
        socket.to(client.roomId).emit(SOCKET_EVENTS.USER_LEFT, {
          username: client.username,
          onlineCount,
        });
      }
    });
  });
}

module.exports = setupChatSocket;
