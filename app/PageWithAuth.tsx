'use client';

import { useAuth } from '@/lib/hooks';
import AuthForm from './AuthForm';
import Home from './GameContainer';

export default function PageWithAuth() {
  const { user, isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <AuthForm />
      </div>
    );
  }

  return (
    <div>
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <span className="text-white text-sm">Welcome, {user?.username}!</span>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition"
        >
          Logout
        </button>
      </div>
      <Home />
    </div>
  );
}
