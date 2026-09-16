const { extractPythonLoop, validateLoopLimits, hasLoop } = require('./loopExtractor');

/**
 * Python Language Validator
 * 
 * Validates Python code patterns:
 * - print("...") statements
 * - print('...') statements
 * - for loops containing print
 * 
 * Uses pattern matching + structural analysis (NOT code execution).
 */

/**
 * Extract content from a print() call.
 * Supports:
 *   print("text")
 *   print('text')
 *   print("text", "more")  — joined with space
 */
function extractPrintContent(code) {
  const trimmed = code.trim();

  // Must not end with semicolon (Python doesn't use them)
  if (trimmed.endsWith(';')) {
    return { valid: false, error: "Unexpected ';' — Python does not use semicolons", content: null };
  }

  // Must start with print
  if (!trimmed.startsWith('print')) {
    return { valid: false, error: 'Python messages must use print("message")', content: null };
  }

  // Must have parentheses
  const afterPrint = trimmed.slice(5).trim();
  if (!afterPrint.startsWith('(')) {
    return { valid: false, error: "Expected '(' after print", content: null };
  }

  if (!afterPrint.endsWith(')')) {
    return { valid: false, error: "Expected ')' — unmatched parenthesis", content: null };
  }

  // Extract the content inside parentheses
  const inner = afterPrint.slice(1, -1).trim();

  if (inner.length === 0) {
    // print() with no args — produces empty line
    return { valid: true, error: null, content: '' };
  }

  // Parse string arguments (can be comma-separated)
  const parts = parseStringArguments(inner);

  if (parts === null) {
    // Check for common errors
    const quoteCount = (inner.match(/(?<!\\)["']/g) || []).length;
    if (quoteCount % 2 !== 0) {
      return { valid: false, error: 'Unterminated string literal — missing closing quote', content: null };
    }
    return { valid: false, error: 'print() arguments must be string literals in quotes', content: null };
  }

  return { valid: true, error: null, content: parts.join(' ') };
}

/**
 * Parse comma-separated string arguments from inside print().
 * Returns array of string values, or null if invalid.
 */
function parseStringArguments(inner) {
  const args = [];
  let i = 0;

  while (i < inner.length) {
    // Skip whitespace
    while (i < inner.length && inner[i] === ' ') i++;
    if (i >= inner.length) break;

    // Expect a string literal
    const quoteChar = inner[i];
    if (quoteChar !== '"' && quoteChar !== "'") {
      // Check for f-strings or other complex patterns
      if (inner[i] === 'f' && (inner[i+1] === '"' || inner[i+1] === "'")) {
        return null; // f-strings not supported
      }
      return null;
    }

    i++; // skip opening quote

    let str = '';
    let escaped = false;

    while (i < inner.length) {
      if (escaped) {
        // Handle escape sequences
        switch (inner[i]) {
          case 'n': str += '\n'; break;
          case 't': str += '\t'; break;
          case 'r': str += '\r'; break;
          case '\\': str += '\\'; break;
          case '"': str += '"'; break;
          case "'": str += "'"; break;
          default: str += '\\' + inner[i]; break;
        }
        escaped = false;
        i++;
        continue;
      }

      if (inner[i] === '\\') {
        escaped = true;
        i++;
        continue;
      }

      if (inner[i] === quoteChar) {
        i++; // skip closing quote
        break;
      }

      str += inner[i];
      i++;
    }

    args.push(str);

    // Skip whitespace
    while (i < inner.length && inner[i] === ' ') i++;

    // Expect comma or end
    if (i < inner.length) {
      if (inner[i] === ',') {
        i++; // skip comma
      } else {
        return null; // unexpected character
      }
    }
  }

  if (args.length === 0) return null;
  return args;
}

/**
 * Validate Python code.
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
    /import\s+/i, /from\s+\w+\s+import/i,
    /__import__/i, /eval\s*\(/i, /exec\s*\(/i,
    /compile\s*\(/i, /open\s*\(/i, /file\s*\(/i,
    /os\./i, /sys\./i, /subprocess/i,
    /shutil/i, /glob/i, /pathlib/i,
    /socket\s*\(/i, /requests\./i,
    /input\s*\(/i, /raw_input\s*\(/i,
    /__class__/i, /__subclasses__/i, /__globals__/i,
    /getattr\s*\(/i, /setattr\s*\(/i, /delattr\s*\(/i,
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
  if (hasLoop(trimmed, 'python')) {
    return validatePythonLoop(trimmed);
  }

  // Single print statement
  const result = extractPrintContent(trimmed);

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
 * Validate a Python for-in-range loop containing print.
 */
function validatePythonLoop(code) {
  const loopInfo = extractPythonLoop(code);

  if (!loopInfo) {
    return {
      valid: false,
      errors: [{ message: 'Unsupported loop syntax. Use: for i in range(N):\\n    print("...")' }],
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

  // Validate the loop body — must be a print statement
  const bodyResult = extractPrintContent(loopInfo.body);
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
