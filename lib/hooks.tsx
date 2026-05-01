'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type CurrentUser = {
  id: string;
  username: string;
  shards: number;
  regularPity: number;
  userStats: any;
  createdAt: number;
  updatedAt: number;
};

type AuthContextType = {
  user: CurrentUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<any>;
  register: (username: string, password: string) => Promise<any>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('authToken');
        setToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('authToken');
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser(savedToken);
    } else {
      setLoading(false);
    }
  }, [fetchCurrentUser]);

  const register = useCallback(async (username: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('authToken', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('authToken', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export async function getOwnedCards(token: string) {
  const response = await fetch('/api/cards/owned', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch owned cards');
  }

  return response.json();
}

export async function addOwnedCard(
  token: string,
  cardId: string,
  cardName: string,
  cardRarity: string,
  cardImage: string,
  stats: any,
  stars: number = 0
) {
  const response = await fetch('/api/cards/owned', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      cardId,
      cardName,
      cardRarity,
      cardImage,
      stats,
      stars,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to add card');
  }

  return response.json();
}
