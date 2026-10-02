import { useCallback, useEffect, useState } from "react";
import { ApiError, clearToken, getToken } from "./api/client.js";
import { getMe } from "./api/auth.api.js";
import type { AuthAdmin } from "./types/auth.types.js";
import DashboardPage from "./pages/DashboardPage.js";
import LoginPage from "./pages/LoginPage.js";
import RegisterPage from "./pages/RegisterPage.js";

// Minimal public routing without a router library: "#/register" shows the
// public form (no login needed); anything else is the admin flow.
// Hash routing needs no server rewrite rules, so it works on Vite dev,
// preview, and plain cPanel static hosting alike.
const isRegisterHash = (): boolean => window.location.hash === "#/register";

export default function App(): JSX.Element {
  const [admin, setAdmin] = useState<AuthAdmin | null>(null);
  const [checking, setChecking] = useState(true);
  const [route, setRoute] = useState<string>(isRegisterHash() ? "register" : "admin");

  // Stable callbacks so Dashboard's load-effect runs exactly once.
  const handleLogout = useCallback((): void => {
    clearToken();
    setAdmin(null);
  }, []);

  useEffect(() => {
    const onHashChange = (): void => {
      setRoute(isRegisterHash() ? "register" : "admin");
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
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

  if (route === "register") {
    return <RegisterPage />;
  }

  if (!admin) {
    return <LoginPage onLoggedIn={setAdmin} />;
  }

  return <DashboardPage admin={admin} onLogout={handleLogout} onAuthExpired={handleLogout} />;
}
