import React, { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';

function MessageList({ messages, currentUsername }) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check scroll position
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 80;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setUnreadCount(0);
    }
  };

  // When messages change
  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setUnreadCount((prev) => prev + 1);
    }
  }, [messages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
    setUnreadCount(0);
  };

  return (
    <div className="message-list-wrapper">
      {/* Top Banner indicating Ephemeral 50-message nature */}
      <div className="chat-meta-bar">
        <div className="chat-meta-left">
          <span className="ephemeral-badge">⚡ EPHEMERAL LIVE CHAT</span>
          <span className="meta-subtext">Max 50 live messages • Old messages automatically roll off</span>
        </div>
        <div className="chat-meta-right">
          <span className="message-counter">
            <strong>{messages.length}</strong> / 50 MESSAGES
          </span>
        </div>
      </div>

      {/* Messages Scroll Container */}
      <div
        className="message-list-container"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="empty-chat-state">
            <div className="empty-icon">&lt;/&gt;</div>
            <h3 className="empty-title">Public Global Stream Active</h3>
            <p className="empty-desc">
              No code in the stream right now. Pick a language below, write code, test with{' '}
              <strong className="text-accent">RUN</strong>, and click{' '}
              <strong className="text-success">SEND</strong>!
            </p>
            <div className="empty-quick-tips">
              <span>💡 Tip: Press <code>Ctrl + Enter</code> to send code quickly.</span>
            </div>
          </div>
        ) : (
          <div className="messages-flow">
            {messages.map((msg, index) => (
              <MessageBubble
                key={msg._id || `${msg.timestamp}_${index}`}
                message={msg}
                currentUsername={currentUsername}
              />
            ))}
            <div ref={bottomRef} style={{ height: 1 }} />
          </div>
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {!isAtBottom && (
        <button
          type="button"
          className="btn-scroll-bottom"
          onClick={scrollToBottom}
          title="Jump to latest message"
        >
          ↓ Latest Messages {unreadCount > 0 && `(${unreadCount} new)`}
        </button>
      )}
    </div>
  );
}

export default MessageList;
