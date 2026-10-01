import { useState } from "react";
import { getMe, login } from "../api/auth.api.js";
import { getErrorMessage, setToken } from "../api/client.js";
import type { AuthAdmin } from "../types/auth.types.js";

// Learn: controlled inputs - React state is the single source of truth
// for each field. value + onChange keeps the box and the state in sync.

interface LoginPageProps {
  onLoggedIn: (admin: AuthAdmin) => void;
}

export default function LoginPage({ onLoggedIn }: LoginPageProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Block obviously empty submits before touching the network.
  const canSubmit = email.trim() !== "" && password !== "" && !loading;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const { token } = await login(email.trim(), password);
      // Fetch the admin identity right after login so App holds the truth.
      setToken(token);
      onLoggedIn(await getMe());
    } catch (err) {
      // Backend already sends a safe generic message - show it as-is.
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <section className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-bold">The Texcellence Conference</h1>
        <p className="mt-1 text-sm text-gray-600">Admin sign in</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          {error && (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
