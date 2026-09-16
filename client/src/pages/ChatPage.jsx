import React, { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import ConnectionStatus from '../components/ConnectionStatus';
import MessageList from '../components/MessageList';
import CodeEditor from '../components/CodeEditor';

function ChatPage({ userData, onLeave }) {
  const [currentLang, setCurrentLang] = useState(userData?.language || 'python');

  const {
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
    dismissErrorToast,
    dismissInfoToast,
  } = useSocket(userData);

  return (
    <div className="chat-layout">
      {/* Top Navigation / Status Header */}
      <header className="chat-header">
        <div className="header-left">
          <div className="header-brand">
            <h1 className="header-logo">&lt;CodeChat /&gt;</h1>
            <span className="header-tagline">Code with strangers. Talk through code.</span>
          </div>
        </div>

        <div className="header-center">
          <ConnectionStatus connected={connected} onlineCount={onlineCount} />
        </div>

        <div className="header-right">
          <div className="current-user-pill">
            <span className="user-icon">👤</span>
            <span className="username-display">{userData?.username || 'Anonymous'}</span>
          </div>
          <button
            type="button"
            className="btn btn--secondary btn-leave"
            onClick={onLeave}
            title="Change name or leave chat"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Floating Alerts & Toasts */}
      {errorToast && (
        <div className="toast toast--error" role="alert">
          <span className="toast-icon">⚠️</span>
          <span className="toast-text">{errorToast}</span>
          <button type="button" className="toast-close" onClick={dismissErrorToast}>
            ✕
          </button>
        </div>
      )}

      {infoToast && (
        <div className="toast toast--info" role="status">
          <span className="toast-text">{infoToast}</span>
          <button type="button" className="toast-close" onClick={dismissInfoToast}>
            ✕
          </button>
        </div>
      )}

      {!connected && (
        <div className="offline-banner">
          <span>⚡ Reconnecting to CodeChat server...</span>
        </div>
      )}

      {/* Main Messages Feed */}
      <main className="chat-main-area">
        <MessageList
          messages={messages}
          currentUsername={userData?.username}
        />
      </main>

      {/* Bottom Pinned Code Editor */}
      <footer className="chat-footer-editor">
        <CodeEditor
          language={currentLang}
          onLanguageChange={setCurrentLang}
          onRunCode={runCode}
          onSendMessage={sendMessage}
          isRunning={isRunning}
          isSending={isSending}
          runResult={runResult}
          sendError={errorToast}
          onClearOutput={clearOutput}
        />
      </footer>
    </div>
  );
}

export default ChatPage;
