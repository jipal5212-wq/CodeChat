const { extractCStyleLoop, validateLoopLimits, hasLoop } = require('./loopExtractor');

/**
 * Java Language Validator
 * 
 * Validates Java code patterns:
 * - System.out.println("..."); statements
 * - System.out.print("..."); statements
 * - for loops containing System.out.println/print
 * 
 * Uses pattern matching + structural analysis (NOT code execution).
 */

/**
 * Extract content from System.out.println() or System.out.print().
 */
function extractSystemOutContent(code) {
  const trimmed = code.trim();

  // Must end with semicolon
  if (!trimmed.endsWith(';')) {
    return { valid: false, error: "Expected ';' at the end of the statement", content: null };
  }

  const withoutSemicolon = trimmed.slice(0, -1).trim();

  // Determine print method
  let methodPrefix = null;
  let addsNewline = false;

  if (withoutSemicolon.startsWith('System.out.println')) {
    methodPrefix = 'System.out.println';
    addsNewline = true;
  } else if (withoutSemicolon.startsWith('System.out.print')) {
    methodPrefix = 'System.out.print';
    addsNewline = false;
  } else {
    return {
      valid: false,
      error: 'Java messages must use System.out.println("message"); or System.out.print("message");',
      content: null
    };
  }

  const afterMethod = withoutSemicolon.slice(methodPrefix.length).trim();

  // Must have parentheses
  if (!afterMethod.startsWith('(')) {
    return { valid: false, error: `Expected '(' after ${methodPrefix}`, content: null };
  }

  if (!afterMethod.endsWith(')')) {
    return { valid: false, error: "Expected ')' — unmatched parenthesis", content: null };
  }

  // Extract content inside parentheses
  const inner = afterMethod.slice(1, -1).trim();

  if (inner.length === 0) {
    // System.out.println() with no args — produces empty line
    return { valid: true, error: null, content: '' };
  }

  // Parse string content — support + concatenation
  const content = parseJavaStringExpression(inner);

  if (content === null) {
    // Check for common errors
    const quoteCount = (inner.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      return { valid: false, error: 'Unterminated string literal — missing closing quote', content: null };
    }
    return {
      valid: false,
      error: 'Arguments must be string literals in double quotes (single quotes are for chars in Java)',
      content: null
    };
  }

  return { valid: true, error: null, content };
}

/**
 * Parse a Java string expression which may contain + concatenation.
 * Returns the concatenated string or null if invalid.
 */
function parseJavaStringExpression(expr) {
  const parts = [];
  let i = 0;
  const str = expr.trim();

  while (i < str.length) {
    // Skip whitespace
    while (i < str.length && str[i] === ' ') i++;
    if (i >= str.length) break;

    // Expect a string literal
    if (str[i] !== '"') {
      return null;
    }

    i++; // skip opening quote
    let part = '';
    let escaped = false;

    while (i < str.length) {
      if (escaped) {
        switch (str[i]) {
          case 'n': part += '\n'; break;
          case 't': part += '\t'; break;
          case 'r': part += '\r'; break;
          case '\\': part += '\\'; break;
          case '"': part += '"'; break;
          case "'": part += "'"; break;
          default: part += '\\' + str[i]; break;
        }
        escaped = false;
        i++;
        continue;
      }

      if (str[i] === '\\') {
        escaped = true;
        i++;
        continue;
      }

      if (str[i] === '"') {
        i++; // skip closing quote
        break;
      }

      part += str[i];
      i++;
    }

    parts.push(part);

    // Skip whitespace
    while (i < str.length && str[i] === ' ') i++;

    // Expect + or end
    if (i < str.length) {
      if (str[i] === '+') {
        i++; // skip +
      } else {
        return null; // unexpected character
      }
    }
  }

  if (parts.length === 0) return null;
  return parts.join('');
}

/**
 * Validate Java code.
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
    /import\s+/i, /Runtime\./i, /ProcessBuilder/i,
    /getRuntime/i, /exec\s*\(/i,
    /Class\.forName/i, /\.getClass\s*\(/i,
    /Reflection/i, /Method\./i, /Field\./i,
    /FileWriter/i, /FileReader/i, /File\s*\(/i,
    /BufferedReader/i, /Scanner\s*\(/i,
    /Socket\s*\(/i, /ServerSocket/i, /URL\s*\(/i,
    /Thread\./i, /Runnable/i,
    /SecurityManager/i,
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
  if (hasLoop(trimmed, 'java')) {
    return validateJavaLoop(trimmed);
  }

  // Single statement
  const result = extractSystemOutContent(trimmed);

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
 * Validate a Java for-loop containing System.out.println.
 */
function validateJavaLoop(code) {
  const loopInfo = extractCStyleLoop(code);

  if (!loopInfo) {
    return {
      valid: false,
      errors: [{ message: 'Unsupported loop syntax. Use: for(int i = 0; i < N; i++) { System.out.println("..."); }' }],
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

  // Validate the loop body
  const bodyResult = extractSystemOutContent(loopInfo.body);
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
