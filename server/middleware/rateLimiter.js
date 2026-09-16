const { LIMITS } = require('../utils/constants');

/**
 * Per-user socket rate limiter for messages.
 * Tracks message timestamps per socket ID and rejects if limit exceeded.
 */
class SocketRateLimiter {
  constructor() {
    this.clients = new Map(); // socketId -> [timestamps]
    this.windowMs = LIMITS.RATE_LIMIT_WINDOW_MS;
    this.maxMessages = LIMITS.RATE_LIMIT_MAX_MESSAGES;
  }

  /**
   * Check if a socket is allowed to send a message.
   * @param {string} socketId
   * @returns {{ allowed: boolean, retryAfterMs?: number }}
   */
  check(socketId) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or create timestamps array
    let timestamps = this.clients.get(socketId) || [];

    // Filter out old timestamps outside the window
    timestamps = timestamps.filter(t => t > windowStart);

    if (timestamps.length >= this.maxMessages) {
      const oldestInWindow = timestamps[0];
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return { allowed: false, retryAfterMs };
    }

    // Record this message
    timestamps.push(now);
    this.clients.set(socketId, timestamps);

    return { allowed: true };
  }

  /**
   * Clean up when a client disconnects.
   * @param {string} socketId
   */
  remove(socketId) {
    this.clients.delete(socketId);
  }

  /**
   * Periodic cleanup of stale entries (call on interval).
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [socketId, timestamps] of this.clients.entries()) {
      const active = timestamps.filter(t => t > windowStart);
      if (active.length === 0) {
        this.clients.delete(socketId);
      } else {
        this.clients.set(socketId, active);
      }
    }
  }
}

// Singleton instance
const rateLimiter = new SocketRateLimiter();

// Cleanup stale entries every 30 seconds
setInterval(() => rateLimiter.cleanup(), 30000);

module.exports = rateLimiter;
