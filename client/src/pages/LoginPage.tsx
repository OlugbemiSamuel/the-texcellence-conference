import { useState } from "react";
import { getMe, login } from "../api/auth.api.js";
import { getErrorMessage, setToken } from "../api/client.js";
import type { AuthAdmin } from "../types/auth.types.js";
import { alertErrorCls, btnPrimary, inputCls } from "../components/ui.js";

// Learn: controlled inputs - React state is the single source of truth
// for each field. value + onChange keeps the box and the state in sync.

interface LoginPageProps {
  onLoggedIn: (admin: AuthAdmin) => void;
  heading?: string;
  subheading?: string;
}

export default function LoginPage({ onLoggedIn, heading = "Admin sign in", subheading = "Manage guests, tickets and accreditation." }: LoginPageProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="flex min-h-screen items-center justify-center bg-brand-navy p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl" aria-labelledby="login-heading">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-gold">
          The TeXcellence Conference
        </p>
        <h1 id="login-heading" className="mt-2 text-2xl font-extrabold text-slate-900">{heading}</h1>
        <p className="mt-1 text-sm text-slate-600">{subheading}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} mt-0 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-brand-navy"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {error && <p role="alert" className={alertErrorCls}>{error}</p>}
          <button type="submit" disabled={!canSubmit} className={`${btnPrimary} w-full py-3`}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <a href="/" className="block py-2 text-center text-sm font-medium text-brand-navy underline">
            Back to public site
          </a>
        </form>
      </section>
    </main>
  );
}
