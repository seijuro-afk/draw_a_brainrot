"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (action: 'login' | 'signup') => {
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, action }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('username', username.trim());
        router.push('/');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-950 text-white">
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold mb-4">Welcome to Brainrot</h2>
          <p className="text-zinc-400 mb-6">Enter your credentials:</p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 mb-4"
            placeholder="Username"
            disabled={loading}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth('login')}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 mb-4"
            placeholder="Password"
            disabled={loading}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleAuth('login')}
              disabled={loading || !username.trim() || !password.trim()}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white transition-all disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Log in'}
            </button>
            <button
              onClick={() => handleAuth('signup')}
              disabled={loading || !username.trim() || !password.trim()}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Sign up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}