const { extractCStyleLoop, validateLoopLimits, hasLoop } = require('./loopExtractor');

/**
 * C Language Validator
 * 
 * Validates C code patterns:
 * - printf("..."); statements
 * - for loops containing printf
 * 
 * Uses pattern matching + structural analysis (NOT code execution).
 */

/**
 * Extract the string content from a printf() call.
 * Supports: printf("text") and printf("text\n")
 * Returns the extracted string or null.
 */
function extractPrintfContent(code) {
  const trimmed = code.trim();

  // Remove trailing semicolon for analysis
  const withoutSemicolon = trimmed.endsWith(';') ? trimmed.slice(0, -1).trim() : null;
  
  if (withoutSemicolon === null) {
    return { valid: false, error: 'Expected \';\' at the end of the statement', content: null };
  }

  // Match printf("...")
  const printfMatch = withoutSemicolon.match(/^printf\s*\(\s*"((?:[^"\\]|\\.)*)"\s*\)$/);
  
  if (!printfMatch) {
    // Check if it starts with printf but has syntax issues
    if (withoutSemicolon.startsWith('printf')) {
      // Check for common errors
      if (!withoutSemicolon.includes('(')) {
        return { valid: false, error: 'Expected \'(\' after printf', content: null };
      }
      if (!withoutSemicolon.includes(')')) {
        return { valid: false, error: 'Expected \')\' — unmatched parenthesis', content: null };
      }
      if (!withoutSemicolon.includes('"')) {
        return { valid: false, error: 'printf requires a string argument in double quotes', content: null };
      }
      // Check for unmatched quotes
      const quoteCount = (withoutSemicolon.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        return { valid: false, error: 'Unterminated string literal — missing closing quote', content: null };
      }
      return { valid: false, error: 'Invalid printf syntax', content: null };
    }
    return { valid: false, error: 'C messages must use printf("message");', content: null };
  }

  // Process escape sequences
  let content = printfMatch[1];
  content = processEscapes(content);

  return { valid: true, error: null, content };
}

/**
 * Process C escape sequences in a string.
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
 * Validate C code.
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
    /#\s*include/i, /malloc\s*\(/i, /free\s*\(/i,
    /fopen\s*\(/i, /fwrite\s*\(/i, /fread\s*\(/i,
    /scanf\s*\(/i, /gets\s*\(/i, /getchar\s*\(/i,
    /signal\s*\(/i, /setjmp\s*\(/i,
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
  if (hasLoop(trimmed, 'c')) {
    return validateCLoop(trimmed);
  }

  // Single printf statement
  const result = extractPrintfContent(trimmed);

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
 * Validate a C for-loop containing printf.
 */
function validateCLoop(code) {
  const loopInfo = extractCStyleLoop(code);

  if (!loopInfo) {
    return {
      valid: false,
      errors: [{ message: 'Unsupported loop syntax. Use: for(int i = 0; i < N; i++) { printf("..."); }' }],
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

  // Validate the loop body — must be a printf statement
  const bodyResult = extractPrintfContent(loopInfo.body);
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
