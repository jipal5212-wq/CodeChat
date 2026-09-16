import React, { useState, useEffect } from 'react';
import JoinPage from './pages/JoinPage';
import ChatPage from './pages/ChatPage';

function App() {
  const [userData, setUserData] = useState(null);

  const handleJoin = (data) => {
    setUserData(data);
  };

  const handleLeave = () => {
    sessionStorage.removeItem('codechat_username');
    setUserData(null);
  };

  return (
    <div className="codechat-app-root">
      {!userData ? (
        <JoinPage onJoin={handleJoin} />
      ) : (
        <ChatPage userData={userData} onLeave={handleLeave} />
      )}
    </div>
  );
}

export default App;
