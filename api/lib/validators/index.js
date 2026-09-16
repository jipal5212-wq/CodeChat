/**
 * Validator Registry — Routes validation requests to language-specific validators.
 */

const cValidator = require('./cValidator');
const cppValidator = require('./cppValidator');
const pythonValidator = require('./pythonValidator');
const javaValidator = require('./javaValidator');

const validators = {
  c: cValidator,
  cpp: cppValidator,
  python: pythonValidator,
  java: javaValidator
};

/**
 * Validate code for a given language.
 * @param {string} language — 'c', 'cpp', 'python', 'java'
 * @param {string} code — the source code to validate
 * @returns {{ valid: boolean, errors: Array<{line?: number, column?: number, message: string}>, output: string|null }}
 */
function validateCode(language, code) {
  const validator = validators[language];

  if (!validator) {
    return {
      valid: false,
      errors: [{ message: `Unsupported language: ${language}` }],
      output: null
    };
  }

  try {
    return validator.validate(code);
  } catch (err) {
    console.error(`Validator crash for ${language}:`, err.message);
    return {
      valid: false,
      errors: [{ message: 'Code validation failed unexpectedly' }],
      output: null
    };
  }
}

module.exports = { validateCode };
