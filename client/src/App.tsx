import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ApiError, clearToken, getToken } from "./api/client.js";
import { getMe } from "./api/auth.api.js";
import type { AuthAdmin } from "./types/auth.types.js";
import DashboardPage from "./pages/DashboardPage.js";
import AccreditPage from "./pages/AccreditPage.js";
import AccreditationLoginPage from "./pages/AccreditationLoginPage.js";
import HomePage from "./pages/HomePage.js";
import LoginPage from "./pages/LoginPage.js";
import RegisterPage from "./pages/RegisterPage.js";
import { takePendingAccreditToken } from "./utils/accredit-link.js";

// Plain-path routes (the server rewrites non-/api paths to index.html):
// "/"                 -> public conference home
// "/register"         -> public registration (no login)
// "/admin"            -> admin login -> /dashboard
// "/dashboard"        -> admin dashboard (protected)
// "/accredit-login"   -> accreditation login -> /accredit
// "/accredit"         -> accreditation desk (protected)
// "/accredit?token=x" -> same desk, guest pre-loaded from the QR link

// Where a fresh accreditation login should land: back on the deep-linked
// guest when one exists, otherwise the plain desk.
const accreditLanding = (): string => {
  const pending = takePendingAccreditToken();
  if (window.location.pathname === "/accredit" && window.location.search) {
    return window.location.pathname + window.location.search;
  }
  if (pending) return `/accredit?token=${encodeURIComponent(pending)}`;
  return "/accredit";
};

function AdminLogin({ onLoggedIn }: { onLoggedIn: (a: AuthAdmin) => void }): JSX.Element {
  const navigate = useNavigate();
  return (
    <LoginPage
      onLoggedIn={(a) => {
        onLoggedIn(a);
        navigate("/dashboard");
      }}
    />
  );
}

function AccreditLogin({ onLoggedIn }: { onLoggedIn: (a: AuthAdmin) => void }): JSX.Element {
  const navigate = useNavigate();
  return (
    <AccreditationLoginPage
      onLoggedIn={(a) => {
        onLoggedIn(a);
        navigate(accreditLanding());
      }}
    />
  );
}

function Shell(): JSX.Element {
  const [admin, setAdmin] = useState<AuthAdmin | null>(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Stable callbacks so page load-effects run exactly once.
  // Each workflow returns to ITS OWN sign-in screen, never the homepage.
  const handleAdminLogout = useCallback((): void => {
    clearToken();
    setAdmin(null);
    navigate("/admin");
  }, [navigate]);

  const handleAccreditExpired = useCallback((): void => {
    clearToken();
    setAdmin(null);
    navigate("/accredit-login");
  }, [navigate]);

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
        // the login screen. Clear only on 401; keep token on network error
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

  // Scroll to top on page changes (hash routing used to do this free).
  const scrollKey = location.pathname;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [scrollKey]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-mist">
        <p className="text-slate-500">Checking sign in...</p>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/admin"
        element={admin ? <Navigate to="/dashboard" replace /> : <AdminLogin onLoggedIn={setAdmin} />}
      />
      <Route
        path="/dashboard"
        element={
          admin ? (
            <DashboardPage admin={admin} onLogout={handleAdminLogout} onAuthExpired={handleAdminLogout} />
          ) : (
            <Navigate to="/admin" replace />
          )
        }
      />
      <Route
        path="/accredit-login"
        element={admin ? <Navigate to={accreditLanding()} replace /> : <AccreditLogin onLoggedIn={setAdmin} />}
      />
      <Route
        path="/accredit"
        element={
          admin ? (
            <AccreditPage onAuthExpired={handleAccreditExpired} />
          ) : (
            <AccreditLogin onLoggedIn={setAdmin} />
          )
        }
      />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
