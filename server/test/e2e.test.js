require('dotenv').config();
const mongoose = require('mongoose');
const { validateAndProcess } = require('../services/codeValidationService');
const Message = require('../models/Message');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codechat';

async function runTestSuite() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🧪 CODECHAT COMPREHENSIVE E2E VERIFICATION TEST');
  console.log('═══════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(testName, condition, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // ─────────────────────────────────────────
  // 1. Language Validators & Output Extraction
  // ─────────────────────────────────────────
  console.log('▶ TEST SUITE 1: Language Validators & Output Extraction');

  const pyRes = validateAndProcess('python', 'print("Hello from Python")');
  assert('Python single print', pyRes.valid && pyRes.output === 'Hello from Python');

  const pyLoop = validateAndProcess('python', 'for i in range(4):\n    print("PyLoop")');
  assert('Python loop extraction (4x)', pyLoop.valid && pyLoop.output === 'PyLoop\nPyLoop\nPyLoop\nPyLoop');

  const cppRes = validateAndProcess('cpp', 'cout << "Hello C++" << endl;');
  assert('C++ cout statement', cppRes.valid && cppRes.output.includes('Hello C++'));

  const cppLoop = validateAndProcess('cpp', 'for(int i = 0; i < 3; i++) { cout << "CppLoop"; }');
  assert('C++ loop extraction (3x)', cppLoop.valid && cppLoop.output === 'CppLoop\nCppLoop\nCppLoop');

  const cRes = validateAndProcess('c', 'printf("Hello C\\n");');
  assert('C printf statement', cRes.valid && cRes.output.includes('Hello C'));

  const cLoop = validateAndProcess('c', 'for(int i = 0; i < 2; i++) { printf("CLoop"); }');
  assert('C loop extraction (2x)', cLoop.valid && cLoop.output === 'CLoop\nCLoop');

  const javaRes = validateAndProcess('java', 'System.out.println("Hello Java");');
  assert('Java System.out.println', javaRes.valid && javaRes.output === 'Hello Java');

  const javaLoop = validateAndProcess('java', 'for(int i = 0; i < 3; i++) { System.out.println("JavaLoop"); }');
  assert('Java loop extraction (3x)', javaLoop.valid && javaLoop.output === 'JavaLoop\nJavaLoop\nJavaLoop');

  // ─────────────────────────────────────────
  // 2. Security & Sandbox Constraints
  // ─────────────────────────────────────────
  console.log('\n▶ TEST SUITE 2: Security & Sandbox Constraints');

  const badPy1 = validateAndProcess('python', 'import os\nos.system("calc")');
  assert('Python "import os" blocked', !badPy1.valid);

  const badPy2 = validateAndProcess('python', 'import subprocess\nsubprocess.Popen("whoami")');
  assert('Python "import subprocess" blocked', !badPy2.valid);

  const badC = validateAndProcess('c', 'system("rm -rf /");');
  assert('C "system()" blocked', !badC.valid);

  const badCpp = validateAndProcess('cpp', '#include <fstream>\nsystem("rm -rf /");');
  assert('C++ "system()" and forbidden headers blocked', !badCpp.valid);

  const badJava = validateAndProcess('java', 'Runtime.getRuntime().exec("whoami");');
  assert('Java "Runtime.getRuntime().exec()" blocked', !badJava.valid);

  // ─────────────────────────────────────────
  // 3. Execution & Payload Limits
  // ─────────────────────────────────────────
  console.log('\n▶ TEST SUITE 3: Execution & Payload Limits');

  // Loop limit (> 20 iterations)
  const excessiveLoop = validateAndProcess('python', 'for i in range(100):\n    print("Spam")');
  assert('Excessive loop (> 20 iterations) rejected', !excessiveLoop.valid);

  // Large payload (> 2000 chars)
  const hugePayload = 'print("' + 'A'.repeat(2500) + '")';
  const largeRes = validateAndProcess('python', hugePayload);
  assert('Payload > 2000 chars rejected', !largeRes.valid);

  // ─────────────────────────────────────────
  // 4. Database & 50-Message Limit Verification
  // ─────────────────────────────────────────
  console.log('\n▶ TEST SUITE 4: MongoDB & 50-Message Ephemeral Limit');

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    assert('MongoDB Connection Succeeded', mongoose.connection.readyState === 1);

    const testRoom = 'TEST_ROOM_' + Date.now();

    // Clean up test room first
    await Message.deleteMany({ roomId: testRoom });

    // Insert 55 messages to test pruning down to 50
    console.log('  ... inserting 55 messages into test room to verify 50-message cap ...');
    for (let i = 1; i <= 55; i++) {
      await Message.createAndPrune({
        username: `User_${i}`,
        language: 'python',
        rawCode: `print("Message ${i}")`,
        renderedOutput: `Message ${i}`,
        roomId: testRoom,
      });
    }

    const remainingCount = await Message.countDocuments({ roomId: testRoom });
    assert('Messages count strictly capped at <= 50', remainingCount === 50, `Found ${remainingCount}`);

    const messages = await Message.getRecentMessages(testRoom, 50);
    assert('Fetched messages length is 50', messages.length === 50);
    assert('Oldest messages (1-5) pruned, oldest remaining is Message 6', messages[0].rawCode.includes('Message 6'));
    assert('Latest message is Message 55', messages[49].rawCode.includes('Message 55'));

    // Cleanup test room
    await Message.deleteMany({ roomId: testRoom });
    console.log('  ... cleaned up test room');
  } catch (err) {
    console.error('  ✗ MongoDB error:', err.message);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  // ─────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
