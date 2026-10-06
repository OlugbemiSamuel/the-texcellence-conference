import { useEffect, useMemo, useState } from "react";
import { ApiError, getErrorMessage } from "../api/client.js";
import {
  accreditGuest,
  generateGuestTicket,
  getGuestById,
  listGuests,
  sendRsvp,
} from "../api/guests.api.js";
import type { AttendanceStatus, Guest } from "../types/guest.types.js";
import type { AuthAdmin } from "../types/auth.types.js";
import GuestEditModal from "../components/GuestEditModal.js";
import GuestAddModal from "../components/GuestAddModal.js";
import GuestImportModal from "../components/GuestImportModal.js";
import GuestTable from "../components/GuestTable.js";
import TicketModal from "../components/TicketModal.js";
import {
  alertErrorCls,
  btnPrimary,
  btnSecondary,
  noticeInfoCls,
} from "../components/ui.js";
import { downloadCsv, guestsToCsv } from "../utils/csv.js";

// Learn: the dashboard owns guest DATA (the full list) while search +
// filters only own FILTER state. Stats, pagination and the CSV export all
// derive from the same list - one source of truth, no extra requests.

type AttendanceFilter = "all" | AttendanceStatus;
type AccreditationFilter = "all" | "accredited" | "not-accredited";
type Section = "overview" | "attendees" | "reports" | "settings";

const PAGE_SIZE = 10;

interface DashboardPageProps {
  admin: AuthAdmin;
  onLogout: () => void;
  onAuthExpired: () => void;
}

export default function DashboardPage({
  admin,
  onLogout,
  onAuthExpired,
}: DashboardPageProps): JSX.Element {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState<AttendanceFilter>("all");
  const [accredFilter, setAccredFilter] = useState<AccreditationFilter>("all");
  const [page, setPage] = useState(1);
  const [section, setSection] = useState<Section>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [adding, setAdding] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [accreditingId, setAccreditingId] = useState<number | null>(null);
  const [generatingTicketId, setGeneratingTicketId] = useState<number | null>(
    null,
  );
  const [sendingRsvpId, setSendingRsvpId] = useState<number | null>(null);
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

  // RSVP: per-row loading, success swaps the confirmed guest in (its
  // is_sent is now 1, so the Sent badge appears). Failures surface in
  // the notice banner; a dead token returns to login like everywhere else.
  const handleSendRsvp = async (guest: Guest): Promise<void> => {
    if (sendingRsvpId !== null) return;
    setSendingRsvpId(guest.id);
    setNotice(null);
    try {
      const updated = await sendRsvp(guest.id);
      setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setNotice(`RSVP email sent to ${updated.email}.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
        return;
      }
      setNotice(getErrorMessage(err));
    } finally {
      setSendingRsvpId(null);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (attendance !== "all" && g.attendance_status !== attendance)
        return false;
      if (accredFilter === "accredited" && !g.accredited_at) return false;
      if (accredFilter === "not-accredited" && g.accredited_at) return false;
      if (!q) return true;
      // One search box across every useful field, incl. null-safe phone/ticket.
      return [
        g.first_name,
        g.last_name,
        g.email,
        g.phone ?? "",
        g.ticket_number ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [guests, search, attendance, accredFilter]);

  // New filter text starts back on page one - otherwise the table can sit
  // on an empty page while matches exist earlier in the list.
  useEffect(() => {
    setPage(1);
  }, [search, attendance, accredFilter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageGuests = visible.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Every number below is counted from the loaded guest list - nothing here
  // is hard-coded or fetched from a second source.
  const stats = useMemo(() => {
    const total = guests.length;
    const attending = guests.filter(
      (g) => g.attendance_status === "yes",
    ).length;
    const notAttending = guests.filter(
      (g) => g.attendance_status === "no",
    ).length;
    const pending = guests.filter(
      (g) => g.attendance_status === "pending",
    ).length;
    const accredited = guests.filter((g) => g.accredited_at).length;
    const rsvpSent = guests.filter((g) => g.is_sent === 1).length;
    const tickets = guests.filter((g) => g.ticket_number).length;
    return {
      total,
      attending,
      notAttending,
      pending,
      accredited,
      notAccredited: total - accredited,
      rsvpSent,
      tickets,
    };
  }, [guests]);

  const handleExport = (): void => {
    // Exports exactly what the filters show - honest WYSIWYG scope.
    downloadCsv(
      `texcellence-guests-${new Date().toISOString().slice(0, 10)}.csv`,
      guestsToCsv(visible),
    );
  };

  const goSection = (s: Section): void => {
    setSection(s);
    setNavOpen(false);
  };

  const navItem = (s: Section, label: string): JSX.Element => (
    <button
      onClick={() => goSection(s)}
      aria-current={section === s ? "page" : undefined}
      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
        section === s
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  const statCard = (
    label: string,
    value: number,
    accent: string,
  ): JSX.Element => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900">
        {value}
      </p>
      <div className={`mt-2 h-1 w-10 rounded ${accent}`} aria-hidden="true" />
    </div>
  );

  const bar = (
    label: string,
    value: number,
    total: number,
    barCls: string,
  ): JSX.Element => {
    const pct = total === 0 ? 0 : Math.round((value / total) * 100);
    return (
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="tabular-nums text-slate-500">
            {value} ({pct}%)
          </span>
        </div>
        <div
          className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            className={`h-full rounded-full ${barCls}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  const sectionTitle: Record<Section, { title: string; hint: string }> = {
    overview: {
      title: "Overview",
      hint: "Event at a glance - 13 October 2026, Landmark Event Centre",
    },
    attendees: {
      title: "Attendees",
      hint: "Search, review and manage every registered guest",
    },
    reports: {
      title: "Reports",
      hint: "Registration and accreditation summaries from live data",
    },
    settings: {
      title: "Settings",
      hint: "Event details, account and data controls",
    },
  };

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-brand-navy px-4 py-3 text-white lg:hidden">
        <p className="text-sm font-bold">
          TEXCELLENCE <span className="font-normal text-slate-300">Admin</span>
        </p>
        <button
          onClick={() => setNavOpen((o) => !o)}
          aria-expanded={navOpen}
          aria-label="Toggle navigation"
          className="rounded-lg border border-white/30 px-3 py-2 text-sm"
        >
          Menu
        </button>
      </div>

      {/* Sidebar / drawer */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-deep/60 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col bg-brand-navy text-white transition-transform lg:static lg:z-auto lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 pb-4 pt-6">
          {/* Project logo: the official flyer is the only brand asset in
              client/public, shown cropped (never stretched) as the mark.
              If a standalone logo file is added later, swap this img src. */}
          <img
            src="/brand/flyer.jpg"
            alt="Texcellence Conference"
            className="h-11 w-11 rounded-lg object-cover object-top"
          />
          <div>
            <p className="text-sm font-extrabold tracking-wide">TEXCELLENCE</p>
            <p className="text-xs text-slate-300">Conference Admin</p>
          </div>
        </div>
        <nav aria-label="Dashboard sections" className="flex-1 space-y-1 px-3">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Manage
          </p>
          {navItem("overview", "Overview")}
          {navItem("attendees", "Attendees")}
          {navItem("reports", "Reports")}
          {navItem("settings", "Settings")}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-xs text-slate-300">{admin.email}</p>
          <button
            onClick={onLogout}
            className="mt-2 w-full rounded-lg border border-white/30 px-3 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            Log out
          </button>
        </div>
        <div className="h-1 bg-brand-gold" aria-hidden="true" />
      </aside>

      {/* Main column */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              {sectionTitle[section].title}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {sectionTitle[section].hint}
            </p>
          </div>

          {notice && (
            <p role="status" className={noticeInfoCls}>
              {notice}
            </p>
          )}

          {section === "overview" && (
            <>
              {loading ? (
                <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                  Loading guests...
                </p>
              ) : error ? (
                <p role="alert" className={alertErrorCls}>
                  {error}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
                    {statCard("Registered", stats.total, "bg-brand-navy")}
                    {statCard("Attending", stats.attending, "bg-green-600")}
                    {statCard(
                      "Not attending",
                      stats.notAttending,
                      "bg-slate-400",
                    )}
                    {statCard("Accredited", stats.accredited, "bg-blue-600")}
                    {statCard(
                      "Not yet accredited",
                      stats.notAccredited,
                      "bg-brand-gold",
                    )}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h2 className="font-bold text-slate-900">
                        Accreditation progress
                      </h2>
                      <div className="mt-3">
                        {bar(
                          "Accredited guests",
                          stats.accredited,
                          stats.total,
                          "bg-blue-600",
                        )}
                      </div>
                      <button
                        onClick={() => goSection("attendees")}
                        className="mt-4 text-sm font-semibold text-brand-navy underline"
                      >
                        Review attendees
                      </button>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h2 className="font-bold text-slate-900">Outreach</h2>
                      <div className="mt-3 space-y-3">
                        {bar(
                          "RSVP emails sent",
                          stats.rsvpSent,
                          stats.total,
                          "bg-purple-600",
                        )}
                        {bar(
                          "Tickets generated",
                          stats.tickets,
                          stats.total,
                          "bg-brand-gold",
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {section === "attendees" && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row">
                  <label htmlFor="guest-search" className="sr-only">
                    Search guests
                  </label>
                  <input
                    id="guest-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, email, phone, ticket..."
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 shadow-sm placeholder:text-slate-400"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label htmlFor="attendance-filter" className="sr-only">
                      Filter by attendance
                    </label>
                    <select
                      id="attendance-filter"
                      value={attendance}
                      onChange={(e) =>
                        setAttendance(e.target.value as AttendanceFilter)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 shadow-sm"
                    >
                      <option value="all">All responses</option>
                      <option value="pending">Pending</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <label htmlFor="accreditation-filter" className="sr-only">
                      Filter by accreditation
                    </label>
                    <select
                      id="accreditation-filter"
                      value={accredFilter}
                      onChange={(e) =>
                        setAccredFilter(e.target.value as AccreditationFilter)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 shadow-sm"
                    >
                      <option value="all">All accreditation</option>
                      <option value="accredited">Accredited</option>
                      <option value="not-accredited">Not accredited</option>
                    </select>
                  </div>
                </div>
                {!loading && !error && (
                  <p className="mt-2 text-xs text-slate-500" role="status">
                    Showing {pageGuests.length} of {visible.length} guests (
                    {guests.length} total)
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => setAdding(true)} className={btnPrimary}>
                  Add guest
                </button>
                <button
                  onClick={handleExport}
                  disabled={visible.length === 0}
                  className={btnSecondary}
                >
                  Export CSV
                </button>
                <button
                  onClick={() => setImportOpen(true)}
                  className={btnSecondary}
                >
                  Import CSV
                </button>
              </div>

              {loading && (
                <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                  Loading guests...
                </p>
              )}
              {!loading && error && (
                <p role="alert" className={alertErrorCls}>
                  {error}
                </p>
              )}
              {!loading && !error && (
                <>
                  <GuestTable
                    guests={pageGuests}
                    startIndex={(safePage - 1) * PAGE_SIZE}
                    accreditingId={accreditingId}
                    generatingTicketId={generatingTicketId}
                    sendingRsvpId={sendingRsvpId}
                    onEdit={setEditing}
                    onAccredit={handleAccredit}
                    onGenerateTicket={handleGenerateTicket}
                    onViewTicket={setTicketGuest}
                    onSendRsvp={handleSendRsvp}
                  />
                  <Pagination
                    page={safePage}
                    totalPages={totalPages}
                    onChange={setPage}
                  />
                </>
              )}
            </>
          )}

          {section === "reports" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-bold text-slate-900">Registration</h2>
                <p className="text-xs text-slate-500">
                  Total responses: {stats.total}
                </p>
                <div className="mt-4 space-y-4">
                  {bar(
                    "Attending",
                    stats.attending,
                    stats.total,
                    "bg-green-600",
                  )}
                  {bar(
                    "Not attending",
                    stats.notAttending,
                    stats.total,
                    "bg-slate-400",
                  )}
                  {bar(
                    "Awaiting response",
                    stats.pending,
                    stats.total,
                    "bg-amber-500",
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-bold text-slate-900">Accreditation</h2>
                <p className="text-xs text-slate-500">
                  One accreditation per guest, enforced by the backend
                </p>
                <div className="mt-4 space-y-4">
                  {bar(
                    "Accredited",
                    stats.accredited,
                    stats.total,
                    "bg-blue-600",
                  )}
                  {bar(
                    "Not yet accredited",
                    stats.notAccredited,
                    stats.total,
                    "bg-brand-gold",
                  )}
                </div>
              </div>
            </div>
          )}

          {section === "settings" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-bold text-slate-900">Event</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Name</dt>
                    <dd className="font-medium text-slate-900">
                      The Texcellence Conference
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Theme</dt>
                    <dd className="text-right font-medium text-slate-900">
                      Accelerating Africa&apos;s Digital Future
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Date</dt>
                    <dd className="font-medium text-slate-900">
                      13 October 2026
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Venue</dt>
                    <dd className="font-medium text-slate-900">
                      Landmark Event Centre
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-bold text-slate-900">Account & data</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Signed in as{" "}
                  <strong className="text-slate-900">{admin.email}</strong>
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleExport}
                    disabled={guests.length === 0}
                    className={btnSecondary}
                  >
                    Export guests CSV
                  </button>
                  <button onClick={onLogout} className={btnSecondary}>
                    Log out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {ticketGuest && (
        <TicketModal guest={ticketGuest} onClose={() => setTicketGuest(null)} onAuthExpired={onAuthExpired} />
      )}

      {importOpen && (
        <GuestImportModal
          onClose={() => setImportOpen(false)}
          onImported={(result) => {
            // Fresh list: imports can create or update many rows at once.
            void listGuests()
              .then((fresh) => setGuests(fresh))
              .catch(() => undefined);
            setNotice(
              `Import done: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`,
            );
          }}
          onAuthExpired={onAuthExpired}
        />
      )}

      {editing && (
        <GuestEditModal
          guest={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            // Replace the edited row in place - backend already confirmed it.
            setGuests((prev) =>
              prev.map((g) => (g.id === updated.id ? updated : g)),
            );
            setEditing(null);
          }}
          onAuthExpired={onAuthExpired}
        />
      )}

      {adding && (
        <GuestAddModal
          onClose={() => setAdding(false)}
          onCreated={(created) => {
            // Newest first: the created row appears at the top of the list.
            setGuests((prev) => [created, ...prev]);
            setAdding(false);
            setNotice(
              `${created.first_name} ${created.last_name} added. They can now register via the public link.`,
            );
          }}
          onAuthExpired={onAuthExpired}
        />
      )}
    </div>
  );
}

// Numbered pagination over the already-filtered list. Page resets to 1
// whenever search or filters change (see effect above), so the control
// can never strand the user on an empty page.
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}): JSX.Element {
  if (totalPages <= 1) return <></>;

  const numbers: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i += 1) numbers.push(i);
  } else {
    numbers.push(1);
    if (page > 3) numbers.push("…");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i += 1
    )
      numbers.push(i);
    if (page < totalPages - 2) numbers.push("…");
    numbers.push(totalPages);
  }

  const btn =
    "min-h-[2.5rem] min-w-[2.5rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <nav
      aria-label="Guest list pages"
      className="flex flex-wrap items-center justify-center gap-1.5"
    >
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={btn}
        aria-label="Previous page"
      >
        Previous
      </button>
      {numbers.map((n, i) =>
        n === "…" ? (
          <span
            key={`gap-${i}`}
            className="px-1 text-slate-400"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            aria-label={`Page ${n}`}
            className={
              n === page
                ? "min-h-[2.5rem] min-w-[2.5rem] rounded-lg bg-brand-navy px-3 py-2 text-sm font-semibold text-white"
                : btn
            }
          >
            {n}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={btn}
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}
