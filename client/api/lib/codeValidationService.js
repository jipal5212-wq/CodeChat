const { validateCode } = require('./validators');
const { LIMITS } = require('./constants');

/**
 * Code Validation Service
 * 
 * High-level orchestrator that:
 * 1. Applies size limits
 * 2. Runs language-specific validation
 * 3. Applies output limits
 * 4. Returns structured result
 */

/**
 * Validate and process code for messaging.
 * @param {string} language
 * @param {string} code
 * @returns {{ valid: boolean, errors: Array, output: string|null }}
 */
function validateAndProcess(language, code) {
  // 1. Input size check
  if (!code || code.trim().length === 0) {
    return {
      valid: false,
      errors: [{ message: 'Code cannot be empty' }],
      output: null
    };
  }

  if (code.length > LIMITS.MAX_CODE_LENGTH) {
    return {
      valid: false,
      errors: [{ message: `Code exceeds maximum length of ${LIMITS.MAX_CODE_LENGTH} characters` }],
      output: null
    };
  }

  // 2. Run validation with timeout protection
  let result;
  const startTime = Date.now();

  try {
    result = validateCode(language, code);
  } catch (err) {
    return {
      valid: false,
      errors: [{ message: 'Code validation timed out or failed' }],
      output: null
    };
  }

  const elapsed = Date.now() - startTime;
  if (elapsed > LIMITS.VALIDATION_TIMEOUT_MS) {
    return {
      valid: false,
      errors: [{ message: 'Code validation timed out' }],
      output: null
    };
  }

  // 3. Output size check
  if (result.valid && result.output) {
    if (result.output.length > LIMITS.MAX_OUTPUT_LENGTH) {
      return {
        valid: false,
        errors: [{ message: `Output exceeds maximum size of ${LIMITS.MAX_OUTPUT_LENGTH} characters` }],
        output: null
      };
    }
  }

  return result;
}

module.exports = { validateAndProcess };
