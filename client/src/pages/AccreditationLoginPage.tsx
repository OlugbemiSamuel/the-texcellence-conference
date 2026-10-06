import { useState } from "react";
import { getMe, login } from "../api/auth.api.js";
import { getErrorMessage, setToken } from "../api/client.js";
import type { AuthAdmin } from "../types/auth.types.js";
import "./accredit.css";

// Same JWT flow as the admin login, dressed in the accreditation-desk
// visual language (teal primary, light canvas). No second auth system.

interface AccreditationLoginPageProps {
  onLoggedIn: (admin: AuthAdmin) => void;
}

export default function AccreditationLoginPage({ onLoggedIn }: AccreditationLoginPageProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim() !== "" && password !== "" && !loading;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const { token } = await login(email.trim(), password);
      setToken(token);
      onLoggedIn(await getMe());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="acc-canvas flex min-h-screen items-center justify-center p-4">
      <section aria-labelledby="accredit-login-heading" className="acc-card w-full max-w-md p-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
          </span>
          <span>
            <span className="block text-sm font-extrabold tracking-wide text-emerald-500">ACCREDIT INTERACTIVE</span>
            <span className="block text-sm font-bold text-slate-900">Guest Check-in</span>
          </span>
        </div>

        <h1 id="accredit-login-heading" className="mt-6 text-xl font-extrabold text-slate-900">
          Accreditation sign in
        </h1>
        <p className="mt-1 text-sm text-slate-500">Event staff sign in to accredit guests at the door.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="acc-email" className="block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              id="acc-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="acc-search-input mt-1 w-full px-3 py-2.5 text-[15px]"
            />
          </div>
          <div>
            <label htmlFor="acc-password" className="block text-sm font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                id="acc-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="acc-search-input mt-1 w-full px-3 py-2.5 pr-16 text-[15px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 px-3 text-sm font-semibold text-emerald-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={!canSubmit} className="acc-verify-btn w-full py-3 text-[15px]">
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <a href="#/" className="block py-2 text-center text-sm font-semibold text-slate-500 underline">
            Back to public site
          </a>
        </form>
      </section>
    </main>
  );
}
