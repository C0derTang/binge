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
      // Check if we're on Instagram
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const isInstagram = tab?.url?.includes('instagram.com');

      if (!isInstagram) {
        setView('not-instagram');
        setLoading(false);
        return;
      }

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
      {view === 'not-instagram' && (
        <div className="p-6 flex flex-col items-center justify-center h-screen text-center">
          <h1
            className="text-3xl font-bold mb-4"
            style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Binge
          </h1>
          <p className="text-binge-dim text-sm">
            Open Instagram to use Binge
          </p>
        </div>
      )}
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