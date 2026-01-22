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
    <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ padding: '30px 50px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', margin: '0', color: '#333' }}>My App</h1>
      </div>

      <div style={{ padding: '30px 50px' }}>
        {!token ? (
          <Login onLogin={handleLogin} />
        ) : (
          <Profile token={token} csrfToken={csrfToken} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}

export default App;
