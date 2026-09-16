const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  selectedLanguage: {
    type: String,
    required: true,
    enum: ['c', 'cpp', 'python', 'java'],
    default: 'python'
  },
  roomId: {
    type: String,
    required: true,
    index: true
  },
  socketId: {
    type: String,
    required: true,
    unique: true
  },
  online: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for quick room user lookups
userSchema.index({ roomId: 1, online: 1 });

// Static: find all online users in a room
userSchema.statics.findByRoom = function(roomId) {
  return this.find({ roomId, online: true }).select('-__v').lean();
};

// Static: find user by socket ID
userSchema.statics.findBySocketId = function(socketId) {
  return this.findOne({ socketId }).lean();
};

// Static: remove user by socket ID
userSchema.statics.removeBySocketId = function(socketId) {
  return this.findOneAndDelete({ socketId }).lean();
};

// Static: check if username is taken in a room
userSchema.statics.isUsernameTaken = function(roomId, username) {
  return this.findOne({ 
    roomId, 
    username: { $regex: new RegExp(`^${username}$`, 'i') },
    online: true 
  }).lean();
};

module.exports = mongoose.model('User', userSchema);
