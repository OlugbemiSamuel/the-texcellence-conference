import { useState } from "react";
import { ApiError, getErrorMessage } from "../api/client.js";
import { accreditGuest, getGuestById, searchGuests } from "../api/guests.api.js";
import type { Guest } from "../types/guest.types.js";

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

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow">
        <h1 className="font-bold">Accreditation Desk</h1>
        <a href="#/" className="rounded border px-4 py-1.5 text-sm hover:bg-gray-50">
          Back to dashboard
        </a>
      </header>

      <section className="mx-auto max-w-3xl space-y-4 p-6">
        <form onSubmit={(e) => { void runSearch(e); }} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, phone, or ticket..."
            className="flex-1 rounded border px-3 py-2"
          />
          <button type="submit" disabled={searching} className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50">
            {searching ? "..." : "Search"}
          </button>
        </form>

        {notice && (
          <p role="status" className="rounded bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>
        )}
        {error && (
          <p role="alert" className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {results !== null && results.length === 0 && !error && (
          <p className="rounded bg-white p-6 text-center text-gray-500">No guests match.</p>
        )}

        {results !== null && results.length > 0 && (
          <ul className="space-y-3">
            {results.map((g) => (
              <li key={g.id} className="rounded bg-white p-4 shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{g.first_name} {g.last_name}</p>
                    <p className="text-sm text-gray-600">{g.email}{g.phone ? ` | ${g.phone}` : ""}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Attendance: {g.attendance_status}
                      {g.ticket_number ? ` | Ticket ${g.ticket_number}` : " | No ticket"}
                    </p>
                  </div>
                  {g.accredited_at ? (
                    <span className="text-right">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Accredited</span>
                      <span className="block text-xs text-gray-500">{new Date(g.accredited_at).toLocaleString()}</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => { void handleAccredit(g); }}
                      disabled={accreditingId === g.id}
                      className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {accreditingId === g.id ? "..." : "Accredit"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
