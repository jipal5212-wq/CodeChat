const { validateAndProcess } = require('./lib/codeValidationService');

module.exports = (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { language, code } = req.body || {};
    if (!language || !code) {
      return res.status(400).json({ valid: false, errors: [{ message: 'Language and code are required.' }] });
    }

    const startTime = Date.now();
    const result = validateAndProcess(language, code);
    const executionTimeMs = Date.now() - startTime;

    return res.status(200).json({
      ...result,
      executionTimeMs,
    });
  } catch (err) {
    console.error('api/run error:', err);
    return res.status(500).json({ valid: false, errors: [{ message: 'Execution error occurred' }] });
  }
};
