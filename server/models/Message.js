const mongoose = require('mongoose');

const MAX_MESSAGES = 50;

const messageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30
  },
  language: {
    type: String,
    required: true,
    enum: ['c', 'cpp', 'python', 'java']
  },
  rawCode: {
    type: String,
    required: true,
    maxlength: 2000
  },
  renderedOutput: {
    type: String,
    default: '',
    maxlength: 5000
  },
  roomId: {
    type: String,
    default: 'GLOBAL',
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for room message queries sorted by time
messageSchema.index({ roomId: 1, timestamp: -1 });

/**
 * Get the latest 50 messages for a room, in chronological order.
 */
messageSchema.statics.getRecentMessages = async function(roomId = 'GLOBAL', limit = MAX_MESSAGES) {
  const messages = await this.find({ roomId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('-__v')
    .lean();
  
  // Return in chronological order (oldest first)
  return messages.reverse();
};

/**
 * Create a message and prune older messages so the collection never exceeds MAX_MESSAGES per room.
 */
messageSchema.statics.createAndPrune = async function({ username, language, rawCode, renderedOutput, roomId = 'GLOBAL' }) {
  // 1. Create the new message
  const msg = await this.create({
    username,
    language,
    rawCode,
    renderedOutput: renderedOutput || '',
    roomId,
    timestamp: new Date()
  });

  // 2. Enforce MAX_MESSAGES limit
  try {
    const totalCount = await this.countDocuments({ roomId });
    if (totalCount > MAX_MESSAGES) {
      // Find IDs of messages to keep (the latest MAX_MESSAGES)
      const keepMessages = await this.find({ roomId })
        .sort({ timestamp: -1 })
        .limit(MAX_MESSAGES)
        .select('_id')
        .lean();
      
      const keepIds = keepMessages.map(m => m._id);

      // Delete everything older
      await this.deleteMany({
        roomId,
        _id: { $nin: keepIds }
      });
    }
  } catch (err) {
    console.error('Error pruning old messages:', err.message);
  }

  return msg;
};

module.exports = mongoose.model('Message', messageSchema);
