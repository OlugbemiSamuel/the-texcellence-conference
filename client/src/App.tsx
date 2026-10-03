import { useCallback, useEffect, useState } from "react";
import { ApiError, clearToken, getToken } from "./api/client.js";
import { getMe } from "./api/auth.api.js";
import type { AuthAdmin } from "./types/auth.types.js";
import DashboardPage from "./pages/DashboardPage.js";
import AccreditPage from "./pages/AccreditPage.js";
import AccreditationLoginPage from "./pages/AccreditationLoginPage.js";
import HomePage from "./pages/HomePage.js";
import LoginPage from "./pages/LoginPage.js";
import RegisterPage from "./pages/RegisterPage.js";
import { readAccreditTokenFromHash, stashPendingAccreditToken, takePendingAccreditToken } from "./utils/accredit-link.js";

// Hash routes (no router library, no server rewrites needed):
// "" / "#/"            -> public conference home
// "#/register"         -> public registration (no login)
// "#/admin"            -> admin login -> #/dashboard
// "#/dashboard"        -> admin dashboard (protected)
// "#/accredit-login"   -> accreditation login -> #/accredit
// "#/accredit"         -> accreditation desk (protected)
// "#/accredit?token=x"  -> same desk, guest pre-loaded from the QR link
type Route = "home" | "register" | "admin" | "dashboard" | "accredit-login" | "accredit";

const routeFromHash = (): Route => {
  const hash = window.location.hash;
  const path = hash.split("?", 1)[0];
  if (path === "#/register") return "register";
  if (path === "#/admin") return "admin";
  if (path === "#/dashboard") return "dashboard";
  if (path === "#/accredit-login") return "accredit-login";
  if (path === "#/accredit") return "accredit";
  return "home";
};

const go = (hash: string): void => {
  window.location.hash = hash;
};

// Where a fresh accreditation login should land: back on the deep-linked
// guest when one exists, otherwise the plain desk.
const accreditLanding = (): string => {
  const pending = takePendingAccreditToken();
  const current = window.location.hash;
  if (current.startsWith("#/accredit")) return current;
  if (pending) return `#/accredit?token=${encodeURIComponent(pending)}`;
  return "#/accredit";
};

export default function App(): JSX.Element {
  const [admin, setAdmin] = useState<AuthAdmin | null>(null);
  const [checking, setChecking] = useState(true);
  const [route, setRoute] = useState<Route>(routeFromHash());

  // Stable callbacks so page load-effects run exactly once.
  const handleLogout = useCallback((): void => {
    clearToken();
    setAdmin(null);
    go("#/");
  }, []);

  useEffect(() => {
    const onHashChange = (): void => {
      setRoute(routeFromHash());
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

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-mist">
        <p className="text-slate-500">Checking sign in...</p>
      </main>
    );
  }

  if (route === "register") {
    return <RegisterPage />;
  }

  if (route === "home") {
    return <HomePage />;
  }

  // Protected routes render their login screen when unauthenticated -
  // equivalent to a redirect, with no loop risk.
  if (route === "admin") {
    if (admin) {
      go("#/dashboard");
      return <DashboardPage admin={admin} onLogout={handleLogout} onAuthExpired={handleLogout} />;
    }
    return (
      <LoginPage
        onLoggedIn={(a) => {
          setAdmin(a);
          go("#/dashboard");
        }}
      />
    );
  }

  if (route === "accredit-login") {
    if (admin) {
      go(accreditLanding());
      return <AccreditPage onAuthExpired={handleLogout} />;
    }
    return (
      <AccreditationLoginPage
        onLoggedIn={(a) => {
          setAdmin(a);
          go(accreditLanding());
        }}
      />
    );
  }

  // Unauthenticated guards: each protected route shows its OWN login,
  // which returns staff to the page they asked for after signing in.
  // A QR deep link keeps its token in the hash (plus a sessionStorage
  // backup), so login lands back on the same guest - the lookup endpoint
  // itself stays authenticated throughout.
  if (!admin) {
    if (route === "accredit") {
      const deepToken = readAccreditTokenFromHash();
      if (deepToken) stashPendingAccreditToken(deepToken);
      return (
        <AccreditationLoginPage
          onLoggedIn={(a) => {
            setAdmin(a);
            go(accreditLanding());
          }}
        />
      );
    }
    return (
      <LoginPage
        onLoggedIn={(a) => {
          setAdmin(a);
          go("#/dashboard");
        }}
      />
    );
  }

  if (route === "accredit") {
    return <AccreditPage onAuthExpired={handleLogout} />;
  }

  return <DashboardPage admin={admin} onLogout={handleLogout} onAuthExpired={handleLogout} />;
}
