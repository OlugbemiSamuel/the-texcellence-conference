import { useEffect, useMemo, useState } from "react";
import { ApiError, getErrorMessage } from "../api/client.js";
import { listGuests } from "../api/guests.api.js";
import type { AttendanceStatus, Guest } from "../types/guest.types.js";
import type { AuthAdmin } from "../types/auth.types.js";
import GuestEditModal from "../components/GuestEditModal.js";
import GuestTable from "../components/GuestTable.js";

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
        {!loading && !error && <GuestTable guests={visible} onEdit={setEditing} />}

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
