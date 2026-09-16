const { LIMITS } = require('../utils/constants');

/**
 * Loop Extractor — Safely analyzes loop constructs across all languages.
 * Extracts iteration count and body content WITHOUT executing any code.
 * 
 * Supports:
 * - C/C++/Java: for(int i = 0; i < N; i++) { ... }
 * - Python: for i in range(N): ...
 */

const MAX_ITERATIONS = LIMITS.MAX_LOOP_ITERATIONS;

/**
 * Extract C-style for loop info:  for(init; condition; increment) { body }
 * Returns { iterations, body } or null if not a recognized loop.
 */
function extractCStyleLoop(code) {
  // Normalize whitespace
  const trimmed = code.trim();

  // Match: for ( init ; condition ; increment ) { body }
  // Flexible whitespace matching
  const forMatch = trimmed.match(
    /^for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*\1\s*(<|<=|!=)\s*(\d+)\s*;\s*\1\s*(\+\+|--|\+=\s*\d+|\-=\s*\d+)\s*\)\s*\{([\s\S]*)\}$/
  );

  if (!forMatch) return null;

  const varName = forMatch[1];
  const startVal = parseInt(forMatch[2]);
  const operator = forMatch[3];
  const endVal = parseInt(forMatch[4]);
  const increment = forMatch[5];
  const body = forMatch[6].trim();

  // Calculate iterations
  let iterations = 0;

  if (increment === '++' || increment === '+= 1') {
    if (operator === '<') {
      iterations = Math.max(0, endVal - startVal);
    } else if (operator === '<=' || operator === '!=') {
      iterations = Math.max(0, endVal - startVal + (operator === '<=' ? 1 : 0));
    }
  } else if (increment === '--' || increment === '-= 1') {
    if (operator === '>' || operator === '>=') {
      // Decrementing loops — not commonly needed but handle
      iterations = Math.max(0, startVal - endVal + (operator === '>=' ? 1 : 0));
    }
  } else {
    // Handle += N
    const stepMatch = increment.match(/\+=\s*(\d+)/);
    if (stepMatch) {
      const step = parseInt(stepMatch[1]);
      if (step > 0) {
        if (operator === '<') {
          iterations = Math.max(0, Math.ceil((endVal - startVal) / step));
        } else if (operator === '<=') {
          iterations = Math.max(0, Math.ceil((endVal - startVal + 1) / step));
        }
      }
    }
  }

  return { iterations, body, varName };
}

/**
 * Extract Python for-in-range loop:  for i in range(N):  body
 * Returns { iterations, body } or null.
 */
function extractPythonLoop(code) {
  const trimmed = code.trim();
  const lines = trimmed.split('\n');

  if (lines.length < 2) return null;

  // Match: for VAR in range(N):
  const headerMatch = lines[0].trim().match(
    /^for\s+(\w+)\s+in\s+range\s*\(\s*(\d+)\s*\)\s*:$/
  );

  if (!headerMatch) {
    // Also try range(start, end)
    const rangeMatch = lines[0].trim().match(
      /^for\s+(\w+)\s+in\s+range\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*:$/
    );

    if (!rangeMatch) return null;

    const startVal = parseInt(rangeMatch[2]);
    const endVal = parseInt(rangeMatch[3]);
    const iterations = Math.max(0, endVal - startVal);
    const body = lines.slice(1).map(l => l.replace(/^\s{4}/, '').replace(/^\t/, '')).join('\n').trim();

    return { iterations, body, varName: rangeMatch[1] };
  }

  const iterations = parseInt(headerMatch[2]);
  const body = lines.slice(1).map(l => l.replace(/^\s{4}/, '').replace(/^\t/, '')).join('\n').trim();

  return { iterations, body, varName: headerMatch[1] };
}

/**
 * Check if a loop is within safe limits.
 */
function validateLoopLimits(iterations) {
  if (iterations < 0) {
    return { valid: false, error: 'Invalid loop: negative iteration count' };
  }
  if (iterations > MAX_ITERATIONS) {
    return {
      valid: false,
      error: `Loop/output limit exceeded. Maximum ${MAX_ITERATIONS} iterations allowed, got ${iterations}.`
    };
  }
  if (iterations === 0) {
    return { valid: false, error: 'Loop would produce no output (0 iterations)' };
  }
  return { valid: true };
}

/**
 * Detect if code contains a loop construct.
 */
function hasLoop(code, language) {
  const trimmed = code.trim();
  if (language === 'python') {
    return /^for\s+\w+\s+in\s+range\s*\(/.test(trimmed);
  }
  return /^for\s*\(/.test(trimmed);
}

module.exports = {
  extractCStyleLoop,
  extractPythonLoop,
  validateLoopLimits,
  hasLoop,
  MAX_ITERATIONS
};
