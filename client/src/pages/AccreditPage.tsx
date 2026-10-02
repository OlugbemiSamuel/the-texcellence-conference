import { useEffect, useState } from "react";
import { ApiError, getErrorMessage } from "../api/client.js";
import { accreditGuest, getGuestById, getGuestByQrToken, searchGuests } from "../api/guests.api.js";
import type { Guest } from "../types/guest.types.js";
import QrScanner from "../components/QrScanner.js";
import { Badge, alertErrorCls, btnPrimary, btnSecondary, noticeSuccessCls } from "../components/ui.js";

// Learn: the accreditation desk. Search narrows the room to candidates;
// the ACCREDIT button stamps exactly one guest via the EXISTING endpoint.
// accredited_at from the server is the only truth - this page keeps no
// local "is accredited" flags, only the fetched guest objects.

interface AccreditPageProps {
  onAuthExpired: () => void;
}

export default function AccreditPage({ onAuthExpired }: AccreditPageProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Guest[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [accreditingId, setAccreditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<Guest | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Debounced auto-search (~250ms): partial names like "sam" or "moh"
  // match immediately without a request per keystroke or needing full names.
  // The Search button stays for explicit submits and keyboard users.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || searching || scanning || lookingUp) return;
    const timer = setTimeout(() => {
      setError(null);
      setNotice(null);
      setScanned(null);
      void searchGuests(q)
        .then((found) => setResults(found))
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.status === 401) {
            onAuthExpired();
            return;
          }
          setError(getErrorMessage(err));
          setResults(null);
        });
    }, 250);
    return () => clearTimeout(timer);
    // onAuthExpired is a stable App-level callback; query drives the timer.
  }, [query, onAuthExpired]);

  const runSearch = async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault();
    if (searching) return;
    const q = query.trim();
    if (q.length < 2) {
      setError("Type at least 2 characters to search.");
      setResults(null);
      return;
    }
    setSearching(true);
    setError(null);
    setNotice(null);
    try {
      setResults(await searchGuests(q));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
        return;
      }
      setError(getErrorMessage(err));
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  const replaceGuest = (updated: Guest): void => {
    setResults((prev) => (prev ? prev.map((g) => (g.id === updated.id ? updated : g)) : prev));
    // The scanned card shows the same guest object - keep it in sync too.
    setScanned((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  // A scan only IDENTIFIES: the decoded value goes to the lookup endpoint,
  // and the guest appears unaccredited until staff press Accredit.
  const handleScanValue = async (value: string): Promise<void> => {
    setScanning(false);
    setLookingUp(true);
    setError(null);
    setNotice(null);
    try {
      const guest = await getGuestByQrToken(value.trim());
      setScanned(guest);
      setResults(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
        return;
      }
      setScanned(null);
      setError(
        err instanceof ApiError && (err.status === 404 || err.status === 400)
          ? "This QR code does not match any guest."
          : getErrorMessage(err)
      );
    } finally {
      setLookingUp(false);
    }
  };

  const handleAccredit = async (guest: Guest): Promise<void> => {
    if (accreditingId !== null) return;
    setAccreditingId(guest.id);
    setNotice(null);
    setError(null);
    try {
      replaceGuest(await accreditGuest(guest.id));
      setNotice(`${guest.first_name} ${guest.last_name} accredited.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        // Lost the race: someone stamped first. Say so, then show the
        // backend's truth instead of our stale row.
        setNotice("This guest has already been accredited.");
        try {
          replaceGuest(await getGuestById(guest.id));
        } catch {
          // Refresh failed - the notice already explains the situation.
        }
        return;
      }
      setError(err instanceof ApiError && err.status === 404 ? "Guest not found." : getErrorMessage(err));
    } finally {
      setAccreditingId(null);
    }
  };

  // One card for search hits AND scanned guests: details, accreditation
  // state, and the explicit Accredit action. Scanning never accredits.
  const guestCard = (g: Guest): JSX.Element => (
    <li key={g.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{g.first_name} {g.last_name}</p>
          <p className="break-words text-sm text-slate-600">{g.email}{g.phone ? ` | ${g.phone}` : ""}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Attendance: <strong className="text-slate-700">{g.attendance_status}</strong></span>
            <span aria-hidden="true">|</span>
            <span>{g.ticket_number ? `Ticket ${g.ticket_number}` : "No ticket"}</span>
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          {g.accredited_at ? (
            <span>
              <Badge tone="blue">Accredited</Badge>
              <span className="mt-1 block text-xs text-slate-500">{new Date(g.accredited_at).toLocaleString()}</span>
            </span>
          ) : (
            <button
              onClick={() => { void handleAccredit(g); }}
              disabled={accreditingId === g.id}
              className={`${btnPrimary} w-full px-6 py-2.5 sm:w-auto`}
            >
              {accreditingId === g.id ? "Accrediting..." : "Accredit"}
            </button>
          )}
        </div>
      </div>
    </li>
  );

  return (
    <main className="min-h-screen bg-brand-mist">
      <header className="bg-brand-navy text-white shadow">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <h1 className="text-base font-bold sm:text-lg">Accreditation Desk</h1>
          <a href="#/" className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium transition hover:bg-white/10">
            Back to dashboard
          </a>
        </div>
        <div className="h-1 bg-brand-gold" aria-hidden="true" />
      </header>

      <section className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <form onSubmit={(e) => { void runSearch(e); }} className="flex flex-col gap-2 sm:flex-row" role="search">
          <label htmlFor="accredit-search" className="sr-only">Search guests by name, email, phone, or ticket</label>
          <input
            id="accredit-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, phone, or ticket..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 shadow-sm placeholder:text-slate-400"
          />
          <button type="submit" disabled={searching} className={`${btnPrimary} sm:w-auto`}>
            {searching ? "Searching..." : "Search"}
          </button>
        </form>

        {!scanning && !scanned && (
          <button
            onClick={() => { setScanning(true); setError(null); setNotice(null); }}
            className={`${btnSecondary} w-full py-3 font-semibold`}
          >
            Scan QR code
          </button>
        )}

        {scanning && (
          <div className="space-y-2">
            <QrScanner onScan={(value) => { void handleScanValue(value); }} onError={setError} />
            <button
              onClick={() => setScanning(false)}
              className={`${btnSecondary} w-full`}
            >
              Cancel scan
            </button>
          </div>
        )}

        {lookingUp && (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500" role="status">
            Reading QR code...
          </p>
        )}

        {scanned && (
          <div className="space-y-2">
            <ul className="space-y-3">{guestCard(scanned)}</ul>
            <button
              onClick={() => { setScanned(null); setScanning(true); setError(null); setNotice(null); }}
              className={`${btnSecondary} w-full`}
            >
              Scan another guest
            </button>
          </div>
        )}

        {notice && <p role="status" className={noticeSuccessCls}>{notice}</p>}
        {error && <p role="alert" className={alertErrorCls}>{error}</p>}

        {results !== null && results.length === 0 && !error && (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            No guests match. Try a different name, email, phone, or ticket number.
          </p>
        )}

        {results !== null && results.length > 0 && (
          <ul className="space-y-3">{results.map(guestCard)}</ul>
        )}
      </section>
    </main>
  );
}
