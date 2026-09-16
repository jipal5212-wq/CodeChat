const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Create a new room
 * POST /api/rooms/create
 */
async function createRoom(req, res) {
  try {
    const { name, createdBy } = req.body;

    if (!name || !createdBy) {
      return res.status(400).json({ error: 'Room name and creator username are required' });
    }

    if (name.length > 30) {
      return res.status(400).json({ error: 'Room name must be 30 characters or less' });
    }

    // Generate unique room ID
    let roomId;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      roomId = Room.generateRoomId();
      exists = await Room.findByRoomId(roomId);
      attempts++;
    }

    if (exists) {
      return res.status(500).json({ error: 'Could not generate unique room code. Try again.' });
    }

    const room = await Room.create({ roomId, name, createdBy });

    res.status(201).json({
      roomId: room.roomId,
      name: room.name,
      createdBy: room.createdBy,
      createdAt: room.createdAt
    });
  } catch (err) {
    console.error('Create room error:', err.message);
    res.status(500).json({ error: 'Failed to create room' });
  }
}

/**
 * Get room info
 * GET /api/rooms/:roomId
 */
async function getRoomInfo(req, res) {
  try {
    const { roomId } = req.params;
    const room = await Room.findByRoomId(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const users = await User.findByRoom(room.roomId);

    res.json({
      roomId: room.roomId,
      name: room.name,
      createdBy: room.createdBy,
      createdAt: room.createdAt,
      onlineUsers: users.length,
      users: users.map(u => ({
        username: u.username,
        language: u.selectedLanguage,
        online: u.online
      }))
    });
  } catch (err) {
    console.error('Get room error:', err.message);
    res.status(500).json({ error: 'Failed to get room info' });
  }
}

/**
 * Get recent messages for a room
 * GET /api/rooms/:roomId/messages
 */
async function getRoomMessages(req, res) {
  try {
    const { roomId } = req.params;
    const room = await Room.findByRoomId(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const messages = await Message.getRecentMessages(room.roomId);

    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err.message);
    res.status(500).json({ error: 'Failed to get messages' });
  }
}

module.exports = {
  createRoom,
  getRoomInfo,
  getRoomMessages
};
