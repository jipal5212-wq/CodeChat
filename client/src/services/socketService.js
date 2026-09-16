import { io } from 'socket.io-client';

/**
 * Socket.IO client singleton.
 * Uses VITE_SERVER_URL if configured, otherwise falls back to current host (proxy in dev).
 */

let socket = null;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

export function isConnected() {
  return socket ? socket.connected : false;
}
