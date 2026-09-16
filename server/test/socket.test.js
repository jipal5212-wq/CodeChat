const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: ClientIO } = require('../../client/node_modules/socket.io-client');
const mongoose = require('mongoose');
const setupChatSocket = require('../sockets/chatSocket');
const { SOCKET_EVENTS } = require('../utils/constants');

async function testRealtimeSockets() {
  console.log('═══════════════════════════════════════════════════');
  console.log('⚡ CODECHAT REALTIME MULTI-CLIENT SOCKET TEST');
  console.log('═══════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codechat');


  const app = express();
  const server = http.createServer(app);
  const ioServer = new Server(server, { cors: { origin: '*' } });
  setupChatSocket(ioServer);

  const TEST_PORT = 3099;
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`✓ Test Socket.IO server running on port ${TEST_PORT}`);

  const serverUrl = `http://localhost:${TEST_PORT}`;

  let clientA, clientB;

  try {
    // 1. Connect Client A ("Ashish")
    clientA = ClientIO(serverUrl, { transports: ['websocket'] });
    await new Promise((resolve) => clientA.on('connect', resolve));
    console.log('✓ Client A connected');

    const joinedPromiseA = new Promise((resolve) => {
      clientA.once(SOCKET_EVENTS.ROOM_JOINED, resolve);
    });
    clientA.emit(SOCKET_EVENTS.JOIN_ROOM, { username: 'Ashish', language: 'python', roomId: 'GLOBAL' });
    const joinDataA = await joinedPromiseA;
    console.log(`✓ Client A joined chat as "${joinDataA.username}"`);

    // 2. Connect Client B ("Batman")
    clientB = ClientIO(serverUrl, { transports: ['websocket'] });
    await new Promise((resolve) => clientB.on('connect', resolve));
    console.log('✓ Client B connected');

    const joinedPromiseB = new Promise((resolve) => {
      clientB.once(SOCKET_EVENTS.ROOM_JOINED, resolve);
    });
    clientB.emit(SOCKET_EVENTS.JOIN_ROOM, { username: 'Batman', language: 'cpp', roomId: 'GLOBAL' });
    const joinDataB = await joinedPromiseB;
    console.log(`✓ Client B joined chat as "${joinDataB.username}"`);

    // 3. Test RUN CODE (Preview execution)
    const runPromiseA = new Promise((resolve) => {
      clientA.once(SOCKET_EVENTS.RUN_RESULT, resolve);
    });
    clientA.emit(SOCKET_EVENTS.RUN_CODE, { language: 'python', code: 'print("Preview run")' });
    const runResult = await runPromiseA;
    if (runResult.valid && runResult.output === 'Preview run') {
      console.log('✓ Client A run code preview succeeded: "Preview run"');
    } else {
      throw new Error('Run code failed');
    }

    // 4. Test Client A sends message -> Client B receives
    const msgPromiseForB = new Promise((resolve) => {
      clientB.once(SOCKET_EVENTS.NEW_MESSAGE, resolve);
    });
    clientA.emit(SOCKET_EVENTS.SEND_MESSAGE, { language: 'python', code: 'print("Hello from Ashish")' });
    const msgFromA = await msgPromiseForB;
    console.log(`✓ Client B received message from ${msgFromA.username}: Output = "${msgFromA.renderedOutput}"`);

    if (msgFromA.username !== 'Ashish' || msgFromA.renderedOutput !== 'Hello from Ashish') {
      throw new Error('Message content mismatch');
    }

    // 5. Test Client B sends message -> Client A receives
    const msgPromiseForA = new Promise((resolve) => {
      clientA.once(SOCKET_EVENTS.NEW_MESSAGE, resolve);
    });
    clientB.emit(SOCKET_EVENTS.SEND_MESSAGE, { language: 'cpp', code: 'cout << "I am Batman" << endl;' });
    const msgFromB = await msgPromiseForA;
    console.log(`✓ Client A received message from ${msgFromB.username}: Output = "${msgFromB.renderedOutput.trim()}"`);

    if (msgFromB.username !== 'Batman' || !msgFromB.renderedOutput.includes('I am Batman')) {
      throw new Error('Message content mismatch');
    }

    // 6. Test Disconnect
    const userLeftPromise = new Promise((resolve) => {
      clientB.once(SOCKET_EVENTS.USER_LEFT, resolve);
    });
    clientA.disconnect();
    const leftData = await userLeftPromise;
    console.log(`✓ Client B notified of disconnect: ${leftData.username} left`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('🎉 ALL REAL-TIME SOCKET TESTS PASSED PERFECTLY!');
    console.log('═══════════════════════════════════════════════════\n');
  } finally {
    if (clientA && clientA.connected) clientA.disconnect();
    if (clientB && clientB.connected) clientB.disconnect();
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

testRealtimeSockets().catch((err) => {
  console.error('Socket test error:', err);
  process.exit(1);
});
