import { useState } from 'react';

export default function LoginView({ onLogin, onShowRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="p-6">
      <h1
        className="text-3xl font-bold text-center mb-1"
        style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        Binge
      </h1>
      <p className="text-center text-binge-dim text-sm mb-6">Match based on what you watch</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 rounded-lg bg-binge-card border border-binge-border text-white text-sm outline-none focus:border-binge-accent transition-colors"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-3 rounded-lg bg-binge-card border border-binge-border text-white text-sm outline-none focus:border-binge-accent transition-colors"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="p-3 rounded-lg text-white text-sm font-semibold cursor-pointer transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #f09433, #dc2743)' }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {error && <p className="text-red-500 text-xs text-center mt-3">{error}</p>}

      <p className="text-center text-binge-dim text-sm mt-5">
        Don't have an account?{' '}
        <button onClick={onShowRegister} className="text-binge-accent hover:underline">
          Register
        </button>
      </p>
    </div>
  );
}