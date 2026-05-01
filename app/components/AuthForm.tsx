'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks';

type AuthMode = 'login' | 'register';

export default function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(username, password);
        setSuccess('Login successful!');
      } else {
        await register(username, password);
        setSuccess('Account created successfully!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-black border border-white/10 rounded-xl shadow-xl">
      <h2 className="text-3xl font-bold mb-6 text-center text-white">
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2 text-white">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            placeholder="Enter your username"
            className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-white">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="Enter your password"
            className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition"
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900 border border-red-700 rounded text-red-100 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-white/10 border border-white/10 rounded text-white text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black font-semibold rounded-lg transition hover:bg-zinc-200 disabled:bg-white/40 disabled:text-black/50"
        >
          {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-white/70">
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
              setSuccess('');
              setUsername('');
              setPassword('');
            }}
            className="text-white underline hover:text-white/80 ml-1"
          >
            {mode === 'login' ? 'Register here' : 'Sign in instead'}
          </button>
        </p>
      </div>
    </div>
  );
}
