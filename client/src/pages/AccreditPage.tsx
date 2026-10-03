import { useEffect, useRef, useState } from "react";
import { ApiError, getErrorMessage } from "../api/client.js";
import { accreditGuest, getGuestById, getGuestByQrToken, searchGuests } from "../api/guests.api.js";
import type { Guest } from "../types/guest.types.js";
import QrScanner from "../components/QrScanner.js";
import { extractQrToken, readAccreditTokenFromHash } from "../utils/accredit-link.js";
import "./accredit.css";

// Reference interface: ACCREDIT INTERACTIVE / Guest Check-in.
// Flow: type to search (live) or scan a QR -> SELECT a guest ->
// press the existing VERIFY button to accredit. Verification never
// accredits by itself; accredited_at from the server is the only truth.

interface AccreditPageProps {
  onAuthExpired: () => void;
}

interface ActivityItem {
  id: number;
  text: string;
  time: string;
}

type MobileTab = "scan" | "manual";

const timeNow = (): string =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function AccreditPage({ onAuthExpired }: AccreditPageProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Guest[] | null>(null);
  const [selected, setSelected] = useState<Guest | null>(null);
  // Where the selection came from: manual search vs QR scan/deep link.
  // Decides the "Manual"/"QR" tag on the accreditation activity entry.
  const selectedSourceRef = useRef<"manual" | "qr">("manual");
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileTab>("scan");
  // Monotonic request id: a slow older search can never overwrite the
  // results of a newer one typed after it.
  const searchSeq = useRef(0);

  const logActivity = (text: string): void => {
    setActivity((prev) => [{ id: Date.now(), text, time: timeNow() }, ...prev].slice(0, 20));
  };

  const replaceGuest = (updated: Guest): void => {
    setResults((prev) => (prev ? prev.map((g) => (g.id === updated.id ? updated : g)) : prev));
    // The selected card shows the same guest object - keep it in sync too.
    setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  // Live search while typing (~250ms debounce). Short input clears quietly;
  // only explicit submits scold about the 2-character minimum.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const seq = searchSeq.current + 1;
    searchSeq.current = seq;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const found = await searchGuests(q);
          if (searchSeq.current !== seq) return;
          setResults(found);
          setError(null);
        } catch (err) {
          if (searchSeq.current !== seq) return;
          if (err instanceof ApiError && err.status === 401) {
            onAuthExpired();
            return;
          }
          setError(getErrorMessage(err));
          setResults(null);
        }
      })();
    }, 250);
    return () => clearTimeout(timer);
    // onAuthExpired is a stable App-level callback; query drives the timer.
  }, [query, onAuthExpired]);

  // QR deep link (?token=...) opens the guest directly - identified only,
  // never accredited until staff press Verify.
  useEffect(() => {
    const token = readAccreditTokenFromHash();
    if (!token) return;
    let cancelled = false;
    setLookingUp(true);
    void getGuestByQrToken(extractQrToken(token))
      .then((guest) => {
        if (cancelled) return;
        setSelected(guest);
        selectedSourceRef.current = "qr";
        setResults(null);
        setMobileTab("manual");
        logActivity(`QR opened: ${guest.first_name} ${guest.last_name}`);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onAuthExpired();
          return;
        }
        setError("This QR code does not match any guest.");
      })
      .finally(() => {
        if (!cancelled) setLookingUp(false);
      });
    return () => {
      cancelled = true;
    };
    // Once on mount: the desk owns its guest afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectGuest = (guest: Guest): void => {
    setSelected(guest);
    selectedSourceRef.current = "manual";
    setNotice(null);
    setError(null);
  };

  // THE Verify button: accredits the SELECTED guest via the existing
  // endpoint. Disabled without a selection or once already accredited.
  const handleVerify = async (): Promise<void> => {
    if (!selected || verifying) return;
    setVerifying(true);
    setNotice(null);
    setError(null);
    try {
      const updated = await accreditGuest(selected.id);
      replaceGuest(updated);
      const method = selectedSourceRef.current === "qr" ? "QR" : "Manual";
      setNotice(`${updated.first_name} ${updated.last_name} accredited.`);
      logActivity(`Accredited: ${updated.first_name} ${updated.last_name} · ${method}`);
      // Fresh desk for the next guest: clear the search box so old results
      // vanish, but keep the stamped card visible as confirmation.
      setQuery("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        // Lost the race: someone stamped first. Say so, then show the
        // backend's truth instead of our stale card.
        setNotice("This guest has already been accredited.");
        try {
          const fresh = await getGuestById(selected.id);
          replaceGuest(fresh);
          logActivity(`Already accredited: ${fresh.first_name} ${fresh.last_name}`);
        } catch {
          // Refresh failed - the notice already explains the situation.
        }
        return;
      }
      // Network/server failure: guest stays selected so staff can retry.
      setError(err instanceof ApiError && err.status === 404 ? "Guest not found." : getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  // A scan only IDENTIFIES: the decoded value (URL or raw token) goes to
  // the lookup endpoint, and the guest becomes SELECTED - still
  // unaccredited until staff press Verify.
  const handleScanValue = async (value: string): Promise<void> => {
    setScanning(false);
    setLookingUp(true);
    setError(null);
    setNotice(null);
    try {
      const guest = await getGuestByQrToken(extractQrToken(value));
      setSelected(guest);
      selectedSourceRef.current = "qr";
      setResults(null);
      setMobileTab("manual");
      logActivity(`QR verified: ${guest.first_name} ${guest.last_name}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
        return;
      }
      setSelected(null);
      setError(
        err instanceof ApiError && (err.status === 404 || err.status === 400)
          ? "This QR code does not match any guest."
          : getErrorMessage(err)
      );
    } finally {
      setLookingUp(false);
    }
  };

  // Search-hit rows are SELECTORS, not actions: tapping one only selects.
  const resultCard = (g: Guest): JSX.Element => {
    const active = selected?.id === g.id;
    return (
      <li key={g.id}>
        <button
          onClick={() => selectGuest(g)}
          aria-pressed={active}
          className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm transition sm:p-5 ${
            active ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-[15px] font-bold text-slate-900">{g.first_name} {g.last_name}</p>
          <p className="mt-0.5 break-words text-sm text-slate-500">{g.email}{g.phone ? `  |  ${g.phone}` : ""}</p>
          <p className="mt-1 text-xs text-slate-500">
            Attendance: <strong className="font-semibold text-slate-700">{g.attendance_status}</strong>
            <span className="mx-2 text-slate-300">|</span>
            {g.ticket_number ? `Ticket ${g.ticket_number}` : "No ticket"}
            <span className="mx-2 text-slate-300">|</span>
            {g.accredited_at ? "Accredited" : "Not accredited"}
          </p>
        </button>
      </li>
    );
  };

  // The selected guest panel: full details plus the single Verify action.
  const selectedCard = (g: Guest): JSX.Element => (
    <div className="acc-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-slate-900">{g.first_name} {g.last_name}</p>
          <p className="mt-0.5 break-words text-sm text-slate-500">{g.email}{g.phone ? `  |  ${g.phone}` : ""}</p>
          <p className="mt-1 text-xs text-slate-500">
            Attendance: <strong className="font-semibold text-slate-700">{g.attendance_status}</strong>
            <span className="mx-2 text-slate-300">|</span>
            {g.ticket_number ? `Ticket ${g.ticket_number}` : "No ticket"}
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          {g.accredited_at ? (
            <span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Accredited
              </span>
              <span className="mt-1 block text-xs text-slate-500">{new Date(g.accredited_at).toLocaleString()}</span>
            </span>
          ) : (
            <span className="block text-xs font-medium text-slate-500 sm:text-right">
              Selected - press Verify above to accredit
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="acc-canvas min-h-screen pb-20 sm:pb-10">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white" aria-hidden="true">
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
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:block">Accreditation Admin</span>
            <span className="acc-avatar" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            </span>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main className="mx-auto grid max-w-6xl gap-5 px-4 pt-5 sm:px-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Live scanner feed */}
          <section aria-label="Live scanner feed" className={`acc-card ${mobileTab !== "scan" ? "hidden sm:block" : ""}`}>
            <div className="acc-card-head">
              <span>Live scanner feed</span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-slate-400">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${scanning ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`}
                  aria-hidden="true"
                />
                {scanning ? "SCANNING" : "IDLE"}
              </span>
            </div>
            <div className="p-4 sm:p-5">
              {scanning ? (
                <div className="space-y-2">
                  <QrScanner onScan={(value) => { void handleScanValue(value); }} onError={setError} />
                  <button onClick={() => setScanning(false)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
                    Stop scanner
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setScanning(true); setError(null); setNotice(null); }}
                  className="acc-scanner-idle flex w-full items-center justify-between gap-2 px-3 py-10 sm:px-6"
                  aria-label="Start live scanner"
                >
                  <span className="acc-rail acc-rail-left" aria-hidden="true">CLICK TO BEGIN</span>
                  <span className="flex flex-col items-center gap-3">
                    <span className="acc-camera-btn" aria-hidden="true">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </span>
                    <span className="text-lg font-extrabold text-slate-900">Start Live Scanner</span>
                    <span className="max-w-xs text-sm text-slate-500">Click the camera icon to activate your device camera</span>
                  </span>
                  <span className="acc-rail" aria-hidden="true">CAMERA REQUIRED</span>
                </button>
              )}
            </div>
          </section>

          {/* Manual entry */}
          <section aria-label="Manual entry" className={`acc-card ${mobileTab !== "manual" ? "hidden sm:block" : ""}`}>
            <div className="acc-card-head">
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Manual entry
              </span>
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row" role="search">
                <label htmlFor="manual-search" className="sr-only">Type guest name to search</label>
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  </span>
                  <input
                    id="manual-search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelected(null);
                    }}
                    placeholder="Type guest name to search"
                    autoComplete="off"
                    className="acc-search-input w-full py-3 pl-9 pr-3 text-[15px]"
                  />
                </div>
                <button
                  onClick={() => { void handleVerify(); }}
                  disabled={!selected || !!selected.accredited_at || verifying}
                  title={!selected ? "Select a guest from the results first" : undefined}
                  className="acc-verify-btn flex items-center justify-center gap-2 px-8 py-3 text-[15px]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  {verifying ? "Verifying..." : "Verify"}
                </button>
              </div>
              {!selected && (
                <p className="mt-2 text-xs text-slate-500">
                  Type to search, click a guest to select, then press Verify to accredit.
                </p>
              )}

              {lookingUp && (
                <p className="mt-3 rounded-xl bg-white p-4 text-center text-sm text-slate-500" role="status">Reading QR code...</p>
              )}

              {selected && (
                <div className="mt-3 space-y-2">
                  {selectedCard(selected)}
                  <button
                    onClick={() => { setSelected(null); setQuery(""); setError(null); setNotice(null); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Accredit another guest
                  </button>
                </div>
              )}

              {notice && (
                <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p>
              )}
              {error && (
                <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
              )}

              {results !== null && results.length === 0 && !error && !selected && (
                <p className="mt-3 rounded-xl bg-white p-6 text-center text-sm text-slate-500">No guests match.</p>
              )}
              {!selected && results !== null && results.length > 0 && (
                <ul className="mt-3 space-y-3">{results.map(resultCard)}</ul>
              )}
            </div>
          </section>
        </div>

        {/* Recent activity rail */}
        <aside aria-label="Recent activity" className="acc-card h-fit lg:sticky lg:top-5">
          <div className="acc-card-head"><span>Recent activity</span></div>
          <div className="p-5">
            {activity.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 text-slate-400" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
                </span>
                <p className="mt-3 text-sm text-slate-500">No recent activity</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0">
                    <span className="font-medium text-slate-800">{a.text}</span>
                    <span className="shrink-0 text-xs text-slate-400">{a.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>

      {/* Mobile bottom tabs */}
      <nav aria-label="Accreditation sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white sm:hidden">
        <div className="grid grid-cols-2">
          <button
            onClick={() => setMobileTab("scan")}
            aria-current={mobileTab === "scan" ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold tracking-wider ${mobileTab === "scan" ? "acc-tab-active" : "acc-tab-idle"}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            SCANNER
          </button>
          <button
            onClick={() => setMobileTab("manual")}
            aria-current={mobileTab === "manual" ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold tracking-wider ${mobileTab === "manual" ? "acc-tab-active" : "acc-tab-idle"}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            MANUAL
          </button>
        </div>
      </nav>
    </div>
  );
}
