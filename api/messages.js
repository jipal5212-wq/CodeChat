const { validateAndProcess } = require('./lib/codeValidationService');

// Global in-memory cache for serverless containers
if (!global.__codechat_messages) {
  global.__codechat_messages = [
    {
      _id: 'msg_init_1',
      username: 'CodeChat_Bot',
      language: 'python',
      rawCode: 'print("Welcome to CodeChat! Code with strangers.")',
      renderedOutput: 'Welcome to CodeChat! Code with strangers.',
      roomId: 'GLOBAL',
      timestamp: new Date(Date.now() - 60000).toISOString(),
    },
    {
      _id: 'msg_init_2',
      username: 'Stranger',
      language: 'cpp',
      rawCode: 'cout << "Hello from the live stream!" << endl;',
      renderedOutput: 'Hello from the live stream!\n',
      roomId: 'GLOBAL',
      timestamp: new Date().toISOString(),
    }
  ];
}

const MAX_LIVE_MESSAGES = 50;

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Optional MongoDB persistence if MONGODB_URI is provided
  let mongoose = null;
  if (process.env.MONGODB_URI) {
    try {
      mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
      }
    } catch (dbErr) {
      console.warn('MongoDB connection skipped in serverless:', dbErr.message);
      mongoose = null;
    }
  }

  // ─────────────────────────────────────────
  // GET: Fetch recent messages (up to 50)
  // ─────────────────────────────────────────
  if (req.method === 'GET') {
    if (mongoose && mongoose.connection.readyState === 1) {
      try {
        const MessageModel = mongoose.models.Message || mongoose.model('Message', new mongoose.Schema({
          username: String,
          language: String,
          rawCode: String,
          renderedOutput: String,
          roomId: { type: String, default: 'GLOBAL' },
          timestamp: { type: Date, default: Date.now }
        }));

        const dbMsgs = await MessageModel.find({ roomId: 'GLOBAL' })
          .sort({ timestamp: -1 })
          .limit(MAX_LIVE_MESSAGES)
          .lean();

        if (dbMsgs.length > 0) {
          return res.status(200).json({ messages: dbMsgs.reverse() });
        }
      } catch (err) {
        console.warn('DB fetch error, falling back to memory:', err.message);
      }
    }

    return res.status(200).json({
      messages: global.__codechat_messages.slice(-MAX_LIVE_MESSAGES),
    });
  }

  // ─────────────────────────────────────────
  // POST: Send new message
  // ─────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { username, language, code } = req.body || {};

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ valid: false, error: 'Code is required' });
      }

      const lang = language || 'python';
      const author = (username || 'Anonymous').trim().slice(0, 25);

      // Validate & execute in sandbox
      const validation = validateAndProcess(lang, code);
      if (!validation.valid) {
        const errorMsg = validation.errors?.[0]?.message || 'Code validation failed.';
        return res.status(400).json({ valid: false, error: errorMsg, errors: validation.errors });
      }

      const newMsg = {
        _id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        username: author,
        language: lang,
        rawCode: code,
        renderedOutput: validation.output || '',
        roomId: 'GLOBAL',
        timestamp: new Date().toISOString(),
      };

      // Add to memory list and prune to max 50
      global.__codechat_messages.push(newMsg);
      if (global.__codechat_messages.length > MAX_LIVE_MESSAGES) {
        global.__codechat_messages = global.__codechat_messages.slice(-MAX_LIVE_MESSAGES);
      }

      // Persist to MongoDB if connected
      if (mongoose && mongoose.connection.readyState === 1) {
        try {
          const MessageModel = mongoose.models.Message || mongoose.model('Message');
          await MessageModel.create(newMsg);
        } catch (dbSaveErr) {
          console.warn('DB save warning in serverless:', dbSaveErr.message);
        }
      }

      return res.status(201).json({
        success: true,
        message: newMsg,
      });
    } catch (err) {
      console.error('api/messages POST error:', err);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
