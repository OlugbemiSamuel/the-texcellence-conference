import type { AttendanceStatus, Guest } from "../types/guest.types.js";
import { Badge, btnSmallAccent, btnSmallGhost, btnSmallPrimary } from "./ui.js";

// Learn: status pills carry a text label plus colour, so meaning never
// depends on hue alone. Action buttons share one size/shape language.

const attendanceTone: Record<AttendanceStatus, "amber" | "green" | "gray"> = {
  pending: "amber",
  yes: "green",
  no: "gray",
};

interface GuestTableProps {
  guests: Guest[];
  startIndex: number;
  accreditingId: number | null;
  generatingTicketId: number | null;
  sendingRsvpId: number | null;
  onEdit: (guest: Guest) => void;
  onAccredit: (guest: Guest) => void;
  onGenerateTicket: (guest: Guest) => void;
  onViewTicket: (guest: Guest) => void;
  onSendRsvp: (guest: Guest) => void;
}

export default function GuestTable({ guests, startIndex, accreditingId, generatingTicketId, sendingRsvpId, onEdit, onAccredit, onGenerateTicket, onViewTicket, onSendRsvp }: GuestTableProps): JSX.Element {
  if (guests.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="font-medium text-slate-700">No guests found</p>
        <p className="mt-1 text-sm text-slate-500">Try a different search or filter.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold text-slate-700">#</th>
            <th scope="col" className="px-4 py-3 font-semibold text-slate-700">Name</th>
            <th scope="col" className="px-4 py-3 font-semibold text-slate-700">Email</th>
            <th scope="col" className="px-4 py-3 font-semibold text-slate-700">Phone</th>
            <th scope="col" className="px-4 py-3 font-semibold text-slate-700">Attendance</th>
            <th scope="col" className="px-4 py-3 font-semibold text-slate-700">Ticket</th>
            <th scope="col" className="px-4 py-3 font-semibold text-slate-700">Accreditation</th>
            <th scope="col" className="px-4 py-3 font-semibold text-slate-700">RSVP</th>
            <th scope="col" className="px-4 py-3 font-semibold text-slate-700">Registered</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {guests.map((g, i) => (
            <tr key={g.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3 tabular-nums text-slate-400">{startIndex + i + 1}</td>
              <td className="px-4 py-3 font-semibold text-slate-900">
                {g.first_name} {g.last_name}
              </td>
              <td className="px-4 py-3 text-slate-700">{g.email}</td>
              <td className="px-4 py-3 text-slate-700">{g.phone ?? "-"}</td>
              <td className="px-4 py-3">
                <Badge tone={attendanceTone[g.attendance_status]}>{g.attendance_status}</Badge>
              </td>
              <td className="px-4 py-3">
                {g.ticket_number ? (
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{g.ticket_number}</span>
                    <button onClick={() => onViewTicket(g)} className={btnSmallGhost}>
                      View Ticket
                    </button>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">No Ticket</span>
                    <button
                      onClick={() => onGenerateTicket(g)}
                      disabled={generatingTicketId === g.id}
                      className={btnSmallAccent}
                    >
                      {generatingTicketId === g.id ? "..." : "Generate Ticket"}
                    </button>
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {g.accredited_at ? (
                  <span className="block">
                    <Badge tone="blue">Accredited</Badge>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {new Date(g.accredited_at).toLocaleString()}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Not accredited</span>
                    <button
                      onClick={() => onAccredit(g)}
                      disabled={accreditingId === g.id}
                      className={btnSmallPrimary}
                    >
                      {accreditingId === g.id ? "..." : "Accredit"}
                    </button>
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {g.is_sent === 1 ? (
                  <Badge tone="green">Sent</Badge>
                ) : (
                  <button
                    onClick={() => onSendRsvp(g)}
                    disabled={sendingRsvpId === g.id}
                    className="rounded-md bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendingRsvpId === g.id ? "..." : "Send RSVP"}
                  </button>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(g.created_at).toLocaleString()}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => onEdit(g)} aria-label={`Edit ${g.first_name} ${g.last_name}`} className={btnSmallGhost}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
