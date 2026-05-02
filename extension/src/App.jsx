import { useState, useEffect } from 'react';
import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import Dashboard from './components/Dashboard';

const API_URL = 'http://localhost:3000';

export default function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const stored = await chrome.storage.local.get(['user']);
      if (stored.user) {
        setUser(stored.user);
        setView('dashboard');
      }
    } catch (err) {
      console.error('Init error:', err);
    }
    setLoading(false);
  }

  async function handleLogin(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    await chrome.storage.local.set({ user: data.user });
    setUser(data.user);
    setView('dashboard');
  }

  async function handleRegister(displayName, email, password) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    await chrome.storage.local.set({ user: data.user });
    setUser(data.user);
    setView('dashboard');
  }

  async function handleLogout() {
    await chrome.storage.local.remove(['user']);
    setUser(null);
    setView('login');
  }

  if (loading) {
    return (
      <div className="h-screen bg-binge-bg flex items-center justify-center">
        <span className="text-binge-accent">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-binge-bg">
      {view === 'login' && (
        <LoginView
          onLogin={handleLogin}
          onShowRegister={() => setView('register')}
        />
      )}
      {view === 'register' && (
        <RegisterView
          onRegister={handleRegister}
          onShowLogin={() => setView('login')}
        />
      )}
      {view === 'dashboard' && (
        <Dashboard user={user} onLogout={handleLogout} API_URL={API_URL} />
      )}
    </div>
  );
}