if (!global.__codechat_active_users) {
  global.__codechat_active_users = new Map(); // id -> timestamp
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  const userId = req.query?.id || req.body?.id || req.headers['x-forwarded-for'] || 'client_user';

  // Heartbeat ping
  global.__codechat_active_users.set(userId, now);

  // Clean stale pings older than 45 seconds
  for (const [id, time] of global.__codechat_active_users.entries()) {
    if (now - time > 45000) {
      global.__codechat_active_users.delete(id);
    }
  }

  const count = Math.max(global.__codechat_active_users.size, 1);

  return res.status(200).json({ count });
};
