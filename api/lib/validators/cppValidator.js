const { extractCStyleLoop, validateLoopLimits, hasLoop } = require('./loopExtractor');

/**
 * C++ Language Validator
 * 
 * Validates C++ code patterns:
 * - cout << "..."; statements
 * - cout << "..." << endl; statements
 * - for loops containing cout
 * 
 * Uses pattern matching + structural analysis (NOT code execution).
 */

/**
 * Extract content from a cout statement.
 * Supports:
 *   cout << "text";
 *   cout << "text" << endl;
 *   cout << "text" << "more";
 */
function extractCoutContent(code) {
  const trimmed = code.trim();

  // Must end with semicolon
  if (!trimmed.endsWith(';')) {
    return { valid: false, error: "Expected ';' at the end of the statement", content: null };
  }

  const withoutSemicolon = trimmed.slice(0, -1).trim();

  // Must start with cout
  if (!withoutSemicolon.startsWith('cout')) {
    return { valid: false, error: 'C++ messages must use cout << "message";', content: null };
  }

  // Remove 'cout' prefix
  let remaining = withoutSemicolon.slice(4).trim();

  // Must have << operator
  if (!remaining.startsWith('<<')) {
    return { valid: false, error: "Expected '<<' operator after cout", content: null };
  }

  remaining = remaining.slice(2).trim();

  // Parse the chain of << operators
  let output = '';
  let current = remaining;

  while (current.length > 0) {
    // Check for endl
    if (current === 'endl' || current.startsWith('endl')) {
      output += '\n';
      current = current.slice(4).trim();
      if (current.startsWith('<<')) {
        current = current.slice(2).trim();
      }
      continue;
    }

    // Check for string literal
    if (current.startsWith('"')) {
      const closeQuote = findClosingQuote(current, 0);
      if (closeQuote === -1) {
        return { valid: false, error: 'Unterminated string literal — missing closing quote', content: null };
      }

      const strContent = current.substring(1, closeQuote);
      output += processEscapes(strContent);
      current = current.slice(closeQuote + 1).trim();

      // Check for next << operator
      if (current.startsWith('<<')) {
        current = current.slice(2).trim();
      }
      continue;
    }

    // If we get here, unknown token
    return { valid: false, error: `Unexpected token: '${current.substring(0, 20)}'`, content: null };
  }

  if (output.length === 0) {
    return { valid: false, error: 'cout statement must output at least one string', content: null };
  }

  return { valid: true, error: null, content: output };
}

/**
 * Find the closing quote index, respecting escape sequences.
 */
function findClosingQuote(str, startAfter) {
  for (let i = startAfter + 1; i < str.length; i++) {
    if (str[i] === '\\') {
      i++; // Skip escaped character
      continue;
    }
    if (str[i] === '"') {
      return i;
    }
  }
  return -1;
}

/**
 * Process C++ escape sequences.
 */
function processEscapes(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

/**
 * Validate C++ code.
 * @param {string} code
 * @returns {{ valid: boolean, errors: Array, output: string|null }}
 */
function validate(code) {
  const trimmed = code.trim();

  if (!trimmed) {
    return { valid: false, errors: [{ message: 'Code cannot be empty' }], output: null };
  }

  // Security: reject dangerous patterns
  const dangerousPatterns = [
    /system\s*\(/i, /exec\s*\(/i, /popen\s*\(/i,
    /fork\s*\(/i, /unlink\s*\(/i, /remove\s*\(/i,
    /#\s*include/i, /new\s+/i, /delete\s+/i,
    /malloc\s*\(/i, /free\s*\(/i,
    /fstream/i, /ifstream/i, /ofstream/i,
    /cin\s*>>/i, /getline\s*\(/i,
    /using\s+namespace/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        errors: [{ message: 'This code pattern is not allowed for security reasons' }],
        output: null
      };
    }
  }

  // Check if it's a loop
  if (hasLoop(trimmed, 'cpp')) {
    return validateCppLoop(trimmed);
  }

  // Single cout statement
  const result = extractCoutContent(trimmed);

  if (!result.valid) {
    return {
      valid: false,
      errors: [{ line: 1, message: result.error }],
      output: null
    };
  }

  return {
    valid: true,
    errors: [],
    output: result.content
  };
}

/**
 * Validate a C++ for-loop containing cout.
 */
function validateCppLoop(code) {
  const loopInfo = extractCStyleLoop(code);

  if (!loopInfo) {
    return {
      valid: false,
      errors: [{ message: 'Unsupported loop syntax. Use: for(int i = 0; i < N; i++) { cout << "..."; }' }],
      output: null
    };
  }

  // Validate iteration limits
  const limitsCheck = validateLoopLimits(loopInfo.iterations);
  if (!limitsCheck.valid) {
    return {
      valid: false,
      errors: [{ message: limitsCheck.error }],
      output: null
    };
  }

  // Validate the loop body — must be a cout statement
  const bodyResult = extractCoutContent(loopInfo.body);
  if (!bodyResult.valid) {
    return {
      valid: false,
      errors: [{ message: `Loop body error: ${bodyResult.error}` }],
      output: null
    };
  }

  // Generate repeated output
  const repeatedOutput = Array(loopInfo.iterations).fill(bodyResult.content).join('\n');

  return {
    valid: true,
    errors: [],
    output: repeatedOutput
  };
}

module.exports = { validate };
