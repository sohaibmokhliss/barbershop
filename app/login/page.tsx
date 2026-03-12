'use client';

import { useState, FormEvent } from 'react';

export default function LoginPage() {
  const [login, setLogin] = useState('yassinem9');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });

      if (res.ok) {
        window.location.href = '/admin/rendezvous';
      } else {
        const data = await res.json();
        setError(data.error ?? 'Identifiant ou mot de passe incorrect');
        setLoading(false);
      }
    } catch {
      setError('Erreur réseau, veuillez réessayer.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-5xl">🪒</span>
          <h1 className="text-2xl font-bold mt-3 text-gray-900">
            Espace Yassine
          </h1>
          <p className="text-sm text-gray-500 mt-1">Accès personnel uniquement</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Identifiant
            </label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
              autoFocus
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2.5 rounded-xl hover:bg-gray-700 disabled:opacity-50 transition text-sm font-medium"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  );
}
