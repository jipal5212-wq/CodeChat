import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../services/socketService';
import { SOCKET_EVENTS, LIMITS } from '../utils/constants';

export function useSocket(initialUserData) {
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [messages, setMessages] = useState(initialUserData?.messages || []);
  const [isRunning, setIsRunning] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [errorToast, setErrorToast] = useState(null);
  const [infoToast, setInfoToast] = useState(null);

  const errorTimeoutRef = useRef(null);
  const infoTimeoutRef = useRef(null);

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

  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => {
      setConnected(true);
      // Automatically rejoin room if session active
      if (initialUserData?.username) {
        socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
          username: initialUserData.username,
          language: initialUserData.language || 'python',
          roomId: initialUserData.roomId || 'GLOBAL',
        });
      }
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onRoomJoined = (data) => {
      if (data?.messages) {
        setMessages(data.messages.slice(-LIMITS.MAX_LIVE_MESSAGES));
      }
      if (data?.onlineCount) {
        setOnlineCount(data.onlineCount);
      }
    };

    const onNewMessage = (newMsg) => {
      setIsSending(false);
      setMessages((prev) => {
        const next = [...prev, newMsg];
        // Strictly enforce 50 messages limit in client state
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
        showInfoToast(`🟢 ${data.username} entered the chat`);
      }
    };

    const onUserLeft = (data) => {
      if (data?.onlineCount !== undefined) {
        setOnlineCount(data.onlineCount);
      }
    };

    const onMessageError = (errData) => {
      setIsSending(false);
      const msg = errData?.error || 'Failed to send message';
      showErrorToast(msg);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.ROOM_JOINED, onRoomJoined);
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, onNewMessage);
    socket.on(SOCKET_EVENTS.RUN_RESULT, onRunResult);
    socket.on(SOCKET_EVENTS.ONLINE_COUNT, onOnlineCount);
    socket.on(SOCKET_EVENTS.USER_JOINED, onUserJoined);
    socket.on(SOCKET_EVENTS.USER_LEFT, onUserLeft);
    socket.on(SOCKET_EVENTS.MESSAGE_ERROR, onMessageError);

    // Initial state check
    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.ROOM_JOINED, onRoomJoined);
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, onNewMessage);
      socket.off(SOCKET_EVENTS.RUN_RESULT, onRunResult);
      socket.off(SOCKET_EVENTS.ONLINE_COUNT, onOnlineCount);
      socket.off(SOCKET_EVENTS.USER_JOINED, onUserJoined);
      socket.off(SOCKET_EVENTS.USER_LEFT, onUserLeft);
      socket.off(SOCKET_EVENTS.MESSAGE_ERROR, onMessageError);
    };
  }, [initialUserData, showErrorToast, showInfoToast]);

  const runCode = useCallback((code, language) => {
    const socket = getSocket();
    setIsRunning(true);
    setRunResult(null);
    socket.emit(SOCKET_EVENTS.RUN_CODE, { code, language });
  }, []);

  const sendMessage = useCallback((code, language) => {
    const socket = getSocket();
    setIsSending(true);
    socket.emit(SOCKET_EVENTS.SEND_MESSAGE, { code, language });
  }, []);

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
