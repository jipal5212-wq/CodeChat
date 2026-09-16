import React from 'react';

function ConnectionStatus({ connected, onlineCount }) {
  return (
    <div className="header-status-group">
      <div className="online-coders-badge" title="Currently active coders in public chat">
        <span className="pulsing-green-dot" />
        <span className="online-coders-text">
          <strong>{onlineCount || 1}</strong> {onlineCount === 1 ? 'CODER' : 'CODERS'} ONLINE
        </span>
      </div>

      <div className="connection-indicator">
        <span
          className={`conn-dot ${
            connected ? 'conn-dot--connected' : 'conn-dot--disconnected'
          }`}
        />
        <span className="conn-text">
          {connected ? 'LIVE' : 'RECONNECTING...'}
        </span>
      </div>
    </div>
  );
}

export default ConnectionStatus;
