const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { validateAndProcess } = require('../services/codeValidationService');
const { createRoom, getRoomInfo, getRoomMessages } = require('../controllers/roomController');

// POST /api/rooms/run — Execute/validate code (REST alternative)
router.post('/run', (req, res) => {
  try {
    const { language, code } = req.body || {};
    if (!language || !code) {
      return res.status(400).json({ valid: false, errors: [{ message: 'Language and code are required' }] });
    }
    const result = validateAndProcess(language, code);
    return res.json(result);
  } catch (err) {
    console.error('REST run error:', err.message);
    return res.status(500).json({ valid: false, errors: [{ message: 'Server error validating code' }] });
  }
});

// GET /api/rooms/public/messages — Get recent 50 messages from global chat
router.get('/public/messages', async (req, res) => {
  try {
    const messages = await Message.getRecentMessages('GLOBAL', 50);
    return res.json({ messages });
  } catch (err) {
    console.error('Error fetching public messages:', err.message);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/rooms/create — Create a custom room
router.post('/create', createRoom);

// GET /api/rooms/:roomId — Get custom room info
router.get('/:roomId', getRoomInfo);

// GET /api/rooms/:roomId/messages — Get custom room messages
router.get('/:roomId/messages', getRoomMessages);

module.exports = router;
