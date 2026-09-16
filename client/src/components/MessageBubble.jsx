import React, { useState } from 'react';
import { LANGUAGE_LABELS } from '../utils/constants';

function MessageBubble({ message, currentUsername }) {
  const [copied, setCopied] = useState(false);

  const { username, language, rawCode, renderedOutput, timestamp } = message;
  const isSelf = currentUsername && username.toLowerCase() === currentUsername.toLowerCase();

  const formatTime = (timeStr) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const codeLines = (rawCode || '').split('\n');

  return (
    <div className={`message-card ${isSelf ? 'message-card--self' : ''}`}>
      {/* Header: Sender, Badge, Timestamp */}
      <div className="message-header">
        <div className="message-author-area">
          <span className="author-avatar">{username ? username[0].toUpperCase() : '?'}</span>
          <span className="author-name">
            {username}
            {isSelf && <span className="self-tag">(YOU)</span>}
          </span>
          <span className={`lang-badge lang-badge--${language}`}>
            {LANGUAGE_LABELS[language] || language}
          </span>
        </div>

        <div className="message-meta-area">
          <span className="message-time">{formatTime(timestamp)}</span>
          <button
            type="button"
            className="btn-copy-code"
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? '✓ Copied' : '⧉ Copy'}
          </button>
        </div>
      </div>

      {/* Code Block */}
      <div className="message-code-container">
        <div className="code-line-numbers" aria-hidden="true">
          {codeLines.map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <pre className="code-content">
          <code>{rawCode}</code>
        </pre>
      </div>

      {/* Output Console Box */}
      {renderedOutput !== undefined && renderedOutput !== null && renderedOutput !== '' && (
        <div className="message-output-box">
          <div className="output-header">
            <span className="output-icon">▶</span>
            <span className="output-label">OUTPUT</span>
          </div>
          <pre className="output-content">{renderedOutput}</pre>
        </div>
      )}
    </div>
  );
}

export default MessageBubble;
