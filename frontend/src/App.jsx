import React, { useState } from 'react';
import Login from './Login';
import Profile from './Profile';

function App() {
  const [token, setToken] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);

  const handleLogin = (accessToken, csrf) => {
    setToken(accessToken);
    setCsrfToken(csrf);
  };

  const handleLogout = () => {
    setToken(null);
    setCsrfToken(null);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '50px' }}>
      <h1 style={{ textAlign: 'center' }}>My App</h1>
      {!token ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Profile token={token} csrfToken={csrfToken} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
