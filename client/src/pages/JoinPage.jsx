import React, { useState } from 'react';
import { connectSocket } from '../services/socketService';
import { SOCKET_EVENTS } from '../utils/constants';

function JoinPage({ onJoin }) {
  const [username, setUsername] = useState(() => {
    return sessionStorage.getItem('codechat_username') || '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Generate random name if empty
    const finalName = username.trim() || `Coder_${Math.floor(1000 + Math.random() * 9000)}`;

    setLoading(true);

    try {
      const socket = connectSocket();

      // Listen for room joined
      const handleJoined = (data) => {
        setLoading(false);
        sessionStorage.setItem('codechat_username', finalName);
        onJoin({
          username: finalName,
          roomId: 'GLOBAL',
          language: data?.language || 'python',
          messages: data?.messages || [],
        });
      };

      const handleError = (data) => {
        setLoading(false);
        setError(data?.error || 'Failed to connect to chat.');
      };

      socket.once(SOCKET_EVENTS.ROOM_JOINED, handleJoined);
      socket.once(SOCKET_EVENTS.MESSAGE_ERROR, handleError);

      // Timeout fallback
      const timer = setTimeout(() => {
        if (loading) {
          setLoading(false);
          // Fallback: Proceed even if socket acknowledgment delayed
          sessionStorage.setItem('codechat_username', finalName);
          onJoin({
            username: finalName,
            roomId: 'GLOBAL',
            language: 'python',
            messages: [],
          });
        }
      }, 3000);

      socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
        username: finalName,
        language: 'python',
        roomId: 'GLOBAL',
      });
    } catch (err) {
      setLoading(false);
      setError('Connection error. Is the server running?');
    }
  };

  return (
    <div className="join-page">
      {/* Background ambient lighting effects */}
      <div className="join-bg-grid" />
      <div className="join-glow-orb" />

      <div className="join-container">
        {/* Logo & Headline */}
        <div className="join-header">
          <div className="terminal-badge">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
            <span className="terminal-title">CODECHAT TERMINAL v1.0</span>
          </div>

          <h1 className="join-logo">&lt;CodeChat /&gt;</h1>
          <p className="join-tagline">
            Code with strangers.
            <br />
            <strong>Talk through code.</strong>
          </p>
        </div>

        {/* Instant Join Card */}
        <form className="join-card" onSubmit={handleSubmit}>
          <div className="join-input-group">
            <label className="join-label" htmlFor="username-input">
              <span className="label-prompt">&gt;</span> ENTER YOUR DISPLAY NAME:
            </label>
            <div className="input-with-icon">
              <span className="input-prefix">@</span>
              <input
                id="username-input"
                type="text"
                className="join-input"
                placeholder="e.g. Ashish, Batman, Coder123..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={25}
                autoComplete="off"
                autoFocus
              />
            </div>
            <p className="join-hint">
              No account required. Anonymous. Any name is fine.
            </p>
          </div>

          {error && <div className="join-error-box">⚠️ {error}</div>}

          <button
            type="submit"
            className="btn btn--primary btn-start-chat"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-inline" /> CONNECTING...
              </>
            ) : (
              <>
                <span>▶</span> START CHATTING
              </>
            )}
          </button>
        </form>

        {/* Developer feature highlights */}
        <div className="join-features-row">
          <div className="feature-pill">
            <span className="feature-icon">⚡</span>
            <span>Real-time WebSockets</span>
          </div>
          <div className="feature-pill">
            <span className="feature-icon">🛡️</span>
            <span>Secure AST Sandbox</span>
          </div>
          <div className="feature-pill">
            <span className="feature-icon">💬</span>
            <span>50 Live Messages</span>
          </div>
        </div>

        {/* Terminal footer quote */}
        <div className="join-footer">
          <code>$ printf(&quot;You don&apos;t type messages. You code them.\n&quot;);</code>
        </div>
      </div>
    </div>
  );
}

export default JoinPage;
