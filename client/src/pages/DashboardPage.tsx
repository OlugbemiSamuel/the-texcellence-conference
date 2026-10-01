import { useEffect, useMemo, useState } from "react";
import { ApiError, getErrorMessage } from "../api/client.js";
import { accreditGuest, generateGuestTicket, getGuestById, listGuests } from "../api/guests.api.js";
import type { AttendanceStatus, Guest } from "../types/guest.types.js";
import type { AuthAdmin } from "../types/auth.types.js";
import GuestEditModal from "../components/GuestEditModal.js";
import GuestTable from "../components/GuestTable.js";
import TicketModal from "../components/TicketModal.js";

// Learn: the dashboard owns guest DATA (the full list) while the search
// box + filter only own FILTER state. The visible rows are derived with
// useMemo - no second copy of guests to keep in sync, no server roundtrip.

type AttendanceFilter = "all" | AttendanceStatus;

interface DashboardPageProps {
  admin: AuthAdmin;
  onLogout: () => void;
  onAuthExpired: () => void;
}

export default function DashboardPage({ admin, onLogout, onAuthExpired }: DashboardPageProps): JSX.Element {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState<AttendanceFilter>("all");
  const [editing, setEditing] = useState<Guest | null>(null);
  const [accreditingId, setAccreditingId] = useState<number | null>(null);
  const [generatingTicketId, setGeneratingTicketId] = useState<number | null>(null);
  const [ticketGuest, setTicketGuest] = useState<Guest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setGuests(await listGuests());
      } catch (err) {
        // Token died mid-session -> back to login, not a stuck dashboard.
        if (err instanceof ApiError && err.status === 401) {
          onAuthExpired();
          return;
        }
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [onAuthExpired]);

  // Accreditation: disable the row button, stamp via backend, then swap
  // the confirmed guest into the list. accredited_at from the server is
  // the ONLY truth - no local "accredited" flags anywhere.
  const handleAccredit = async (guest: Guest): Promise<void> => {
    if (accreditingId !== null) return;
    setAccreditingId(guest.id);
    setNotice(null);
    try {
      const updated = await accreditGuest(guest.id);
      setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        // Someone (or a double click) already stamped this guest:
        // say so, then re-fetch the row so the UI shows the real state.
        setNotice("This guest has already been accredited.");
        try {
          const fresh = await getGuestById(guest.id);
          setGuests((prev) => prev.map((g) => (g.id === fresh.id ? fresh : g)));
        } catch {
          // Refresh failed - the notice already explains the situation.
        }
        return;
      }
      setNotice(getErrorMessage(err));
    } finally {
      setAccreditingId(null);
    }
  };

  // Ticket generation: loading on the row, backend stamps once and
  // returns the SAME credentials on repeat calls (idempotent), then the
  // ticket modal opens with the confirmed guest.
  const handleGenerateTicket = async (guest: Guest): Promise<void> => {
    if (generatingTicketId !== null) return;
    setGeneratingTicketId(guest.id);
    setNotice(null);
    try {
      const updated = await generateGuestTicket(guest.id);
      setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setTicketGuest(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
        return;
      }
      setNotice(getErrorMessage(err));
    } finally {
      setGeneratingTicketId(null);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (attendance !== "all" && g.attendance_status !== attendance) return false;
      if (!q) return true;
      // One search box across every useful field, incl. null-safe phone/ticket.
      return [g.first_name, g.last_name, g.email, g.phone ?? "", g.ticket_number ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [guests, search, attendance]);

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow">
        <div>
          <h1 className="font-bold">Texcellence Admin</h1>
          <p className="text-xs text-gray-500">{admin.email}</p>
        </div>
        <button onClick={onLogout} className="rounded border px-4 py-1.5 text-sm hover:bg-gray-50">
          Log out
        </button>
      </header>

      <section className="mx-auto max-w-6xl space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, ticket..."
            className="flex-1 rounded border px-3 py-2"
          />
          <select value={attendance} onChange={(e) => setAttendance(e.target.value as AttendanceFilter)} className="rounded border px-3 py-2">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        {loading && <p className="rounded bg-white p-6 text-center text-gray-500">Loading guests...</p>}
        {!loading && error && (
          <p role="alert" className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {notice}
          </p>
        )}
        {!loading && !error && (
          <GuestTable
            guests={visible}
            accreditingId={accreditingId}
            generatingTicketId={generatingTicketId}
            onEdit={setEditing}
            onAccredit={handleAccredit}
            onGenerateTicket={handleGenerateTicket}
            onViewTicket={setTicketGuest}
          />
        )}

        {ticketGuest && <TicketModal guest={ticketGuest} onClose={() => setTicketGuest(null)} />}

        {editing && (
          <GuestEditModal
            guest={editing}
            onClose={() => setEditing(null)}
            onSaved={(updated) => {
              // Replace the edited row in place - backend already confirmed it.
              setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
              setEditing(null);
            }}
            onAuthExpired={onAuthExpired}
          />
        )}
      </section>
    </main>
  );
}
