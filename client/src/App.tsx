import { useCallback, useEffect, useState } from "react";
import { ApiError, clearToken, getToken } from "./api/client.js";
import { getMe } from "./api/auth.api.js";
import type { AuthAdmin } from "./types/auth.types.js";
import DashboardPage from "./pages/DashboardPage.js";
import LoginPage from "./pages/LoginPage.js";

// Learn: App is the bouncer, not a page. It holds ONE question -
// "who is signed in, if anyone?" - and shows Login or Dashboard.
// JWT lives in localStorage; on startup we ask /api/auth/me whether
// the stored token is still good. A dead token -> login, never dashboard.

export default function App(): JSX.Element {
  const [admin, setAdmin] = useState<AuthAdmin | null>(null);
  const [checking, setChecking] = useState(true);

  // Stable callbacks so Dashboard's load-effect runs exactly once.
  const handleLogout = useCallback((): void => {
    clearToken();
    setAdmin(null);
  }, []);

  useEffect(() => {
    const boot = async (): Promise<void> => {
      if (!getToken()) {
        setChecking(false);
        return;
      }
      try {
        setAdmin(await getMe());
      } catch (err) {
        // Invalid/expired token (or network blip on boot): safest is
        // login screen. Clear only on 401; keep token on network error
        // so a brief outage doesn't log the admin out.
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
        }
      } finally {
        setChecking(false);
      }
    };
    void boot();
  }, []);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">Checking sign in...</p>
      </main>
    );
  }

  if (!admin) {
    return <LoginPage onLoggedIn={setAdmin} />;
  }

  return <DashboardPage admin={admin} onLogout={handleLogout} onAuthExpired={handleLogout} />;
}
