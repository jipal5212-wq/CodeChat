import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, connectSocket } from '../services/socketService';
import { SOCKET_EVENTS, LIMITS } from '../utils/constants';

export function useSocket(initialUserData) {
  const [connected, setConnected] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [messages, setMessages] = useState(initialUserData?.messages || []);
  const [isRunning, setIsRunning] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [errorToast, setErrorToast] = useState(null);
  const [infoToast, setInfoToast] = useState(null);

  const errorTimeoutRef = useRef(null);
  const infoTimeoutRef = useRef(null);
  const isSocketConnectedRef = useRef(false);

  const showErrorToast = useCallback((msg) => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    setErrorToast(msg);
    errorTimeoutRef.current = setTimeout(() => setErrorToast(null), 5000);
  }, []);

  const showInfoToast = useCallback((msg) => {
    if (infoTimeoutRef.current) clearTimeout(infoTimeoutRef.current);
    setInfoToast(msg);
    infoTimeoutRef.current = setTimeout(() => setInfoToast(null), 4000);
  }, []);

  // ─────────────────────────────────────────
  // 1. Socket.IO Connection & Events
  // ─────────────────────────────────────────
  useEffect(() => {
    let socket;
    try {
      socket = connectSocket();
    } catch {
      // Socket.IO not available, fallback handles it
      return;
    }

    const onConnect = () => {
      setConnected(true);
      setIsSocketConnected(true);
      isSocketConnectedRef.current = true;
      if (initialUserData?.username) {
        socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
          username: initialUserData.username,
          language: initialUserData.language || 'python',
          roomId: initialUserData.roomId || 'GLOBAL',
        });
      }
    };

    const onDisconnect = () => {
      setIsSocketConnected(false);
      isSocketConnectedRef.current = false;
      // Note: we keep `connected: true` because HTTP fallback keeps the app live
    };

    const onRoomJoined = (data) => {
      if (data?.messages && data.messages.length > 0) {
        setMessages(data.messages.slice(-LIMITS.MAX_LIVE_MESSAGES));
      }
      if (data?.onlineCount) {
        setOnlineCount(data.onlineCount);
      }
    };

    const onNewMessage = (newMsg) => {
      setIsSending(false);
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === newMsg._id);
        if (exists) return prev;
        const next = [...prev, newMsg];
        if (next.length > LIMITS.MAX_LIVE_MESSAGES) {
          return next.slice(next.length - LIMITS.MAX_LIVE_MESSAGES);
        }
        return next;
      });
    };

    const onRunResult = (res) => {
      setIsRunning(false);
      setRunResult(res);
    };

    const onOnlineCount = (data) => {
      if (data?.count !== undefined) {
        setOnlineCount(data.count);
      }
    };

    const onUserJoined = (data) => {
      if (data?.onlineCount !== undefined) {
        setOnlineCount(data.onlineCount);
      }
      if (data?.username) {
        showInfoToast(`🟢 ${data.username} joined`);
      }
    };

    const onMessageError = (errData) => {
      setIsSending(false);
      showErrorToast(errData?.error || 'Validation error');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.ROOM_JOINED, onRoomJoined);
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, onNewMessage);
    socket.on(SOCKET_EVENTS.RUN_RESULT, onRunResult);
    socket.on(SOCKET_EVENTS.ONLINE_COUNT, onOnlineCount);
    socket.on(SOCKET_EVENTS.USER_JOINED, onUserJoined);
    socket.on(SOCKET_EVENTS.MESSAGE_ERROR, onMessageError);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.ROOM_JOINED, onRoomJoined);
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, onNewMessage);
      socket.off(SOCKET_EVENTS.RUN_RESULT, onRunResult);
      socket.off(SOCKET_EVENTS.ONLINE_COUNT, onOnlineCount);
      socket.off(SOCKET_EVENTS.USER_JOINED, onUserJoined);
      socket.off(SOCKET_EVENTS.MESSAGE_ERROR, onMessageError);
    };
  }, [initialUserData, showErrorToast, showInfoToast]);

  // ─────────────────────────────────────────
  // 2. HTTP Real-Time Polling Fallback (Vercel Serverless)
  // ─────────────────────────────────────────
  useEffect(() => {
    // Initial fetch of messages
    const fetchLatestMessages = async () => {
      try {
        const res = await fetch('/api/messages');
        if (res.ok) {
          const data = await res.json();
          if (data?.messages) {
            setMessages((prev) => {
              // If previous is empty or new messages have arrived
              if (prev.length === 0) return data.messages.slice(-LIMITS.MAX_LIVE_MESSAGES);
              const prevLastId = prev[prev.length - 1]?._id;
              const newLastId = data.messages[data.messages.length - 1]?._id;
              if (prevLastId !== newLastId || data.messages.length !== prev.length) {
                return data.messages.slice(-LIMITS.MAX_LIVE_MESSAGES);
              }
              return prev;
            });
          }
        }
      } catch {
        // Quiet fail
      }
    };

    const pingOnline = async () => {
      try {
        const res = await fetch('/api/online');
        if (res.ok) {
          const data = await res.json();
          if (data?.count !== undefined) {
            setOnlineCount(data.count);
          }
        }
      } catch {
        // Quiet fail
      }
    };

    fetchLatestMessages();
    pingOnline();

    // Fast polling interval (1.5s) if WebSocket is not active
    const pollInterval = setInterval(() => {
      if (!isSocketConnectedRef.current) {
        fetchLatestMessages();
      }
    }, 1500);

    const onlineInterval = setInterval(pingOnline, 10000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(onlineInterval);
    };
  }, []);

  // ─────────────────────────────────────────
  // 3. Actions: Run Code
  // ─────────────────────────────────────────
  const runCode = useCallback(async (code, language) => {
    setIsRunning(true);
    setRunResult(null);

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.RUN_CODE, { code, language });
      return;
    }

    // HTTP Fallback to /api/run
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      });
      const data = await res.json();
      setIsRunning(false);
      setRunResult(data);
    } catch (err) {
      setIsRunning(false);
      setRunResult({
        valid: false,
        errors: [{ message: 'Network error executing code' }],
        output: null,
      });
    }
  }, []);

  // ─────────────────────────────────────────
  // 4. Actions: Send Message
  // ─────────────────────────────────────────
  const sendMessage = useCallback(async (code, language) => {
    setIsSending(true);

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, { code, language });
      return;
    }

    // HTTP Fallback to /api/messages
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: initialUserData?.username || 'Anonymous',
          language,
          code,
        }),
      });
      const data = await res.json();
      setIsSending(false);

      if (!res.ok || !data.success) {
        const errorMsg = data?.error || data?.errors?.[0]?.message || 'Failed to send message';
        showErrorToast(errorMsg);
        return;
      }

      if (data.message) {
        setMessages((prev) => {
          const next = [...prev, data.message];
          if (next.length > LIMITS.MAX_LIVE_MESSAGES) {
            return next.slice(next.length - LIMITS.MAX_LIVE_MESSAGES);
          }
          return next;
        });
      }
    } catch (err) {
      setIsSending(false);
      showErrorToast('Failed to connect to server');
    }
  }, [initialUserData, showErrorToast]);

  const clearOutput = useCallback(() => {
    setRunResult(null);
  }, []);

  return {
    connected,
    onlineCount,
    messages,
    isRunning,
    isSending,
    runResult,
    errorToast,
    infoToast,
    runCode,
    sendMessage,
    clearOutput,
    dismissErrorToast: () => setErrorToast(null),
    dismissInfoToast: () => setInfoToast(null),
  };
}
