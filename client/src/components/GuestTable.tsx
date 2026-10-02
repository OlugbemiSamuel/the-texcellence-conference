import type { AttendanceStatus, Guest } from "../types/guest.types.js";

// Learn: a tiny lookup turns the attendance word into a colored badge.
// pending = amber (waiting), yes = green (coming), no = gray (not coming).

const badgeClass: Record<AttendanceStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  yes: "bg-green-100 text-green-800",
  no: "bg-gray-200 text-gray-700",
};

interface GuestTableProps {
  guests: Guest[];
  accreditingId: number | null;
  generatingTicketId: number | null;
  sendingRsvpId: number | null;
  onEdit: (guest: Guest) => void;
  onAccredit: (guest: Guest) => void;
  onGenerateTicket: (guest: Guest) => void;
  onViewTicket: (guest: Guest) => void;
  onSendRsvp: (guest: Guest) => void;
}

export default function GuestTable({ guests, accreditingId, generatingTicketId, sendingRsvpId, onEdit, onAccredit, onGenerateTicket, onViewTicket, onSendRsvp }: GuestTableProps): JSX.Element {
  if (guests.length === 0) {
    return <p className="rounded bg-white p-6 text-center text-gray-500">No guests match.</p>;
  }
  return (
    <div className="overflow-x-auto rounded bg-white shadow">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2">Attendance</th>
            <th className="px-4 py-2">Ticket</th>
            <th className="px-4 py-2">Accreditation</th>
            <th className="px-4 py-2">RSVP</th>
            <th className="px-4 py-2">Registered</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {guests.map((g) => (
            <tr key={g.id} className="border-b last:border-0">
              <td className="px-4 py-2 font-medium">
                {g.first_name} {g.last_name}
              </td>
              <td className="px-4 py-2">{g.email}</td>
              <td className="px-4 py-2">{g.phone ?? "-"}</td>
              <td className="px-4 py-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeClass[g.attendance_status]}`}>
                  {g.attendance_status}
                </span>
              </td>
              <td className="px-4 py-2">
                {g.ticket_number ? (
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{g.ticket_number}</span>
                    <button onClick={() => onViewTicket(g)} className="rounded border px-3 py-1 text-xs hover:bg-gray-50">
                      View Ticket
                    </button>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">No Ticket</span>
                    <button
                      onClick={() => onGenerateTicket(g)}
                      disabled={generatingTicketId === g.id}
                      className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {generatingTicketId === g.id ? "..." : "Generate Ticket"}
                    </button>
                  </span>
                )}
              </td>
              <td className="px-4 py-2">
                {g.accredited_at ? (
                  <span className="block">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      Accredited
                    </span>
                    <span className="block text-xs text-gray-500">
                      {new Date(g.accredited_at).toLocaleString()}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Not accredited</span>
                    <button
                      onClick={() => onAccredit(g)}
                      disabled={accreditingId === g.id}
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {accreditingId === g.id ? "..." : "Accredit"}
                    </button>
                  </span>
                )}
              </td>
              <td className="px-4 py-2">
                {g.is_sent === 1 ? (
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Sent
                  </span>
                ) : (
                  <button
                    onClick={() => onSendRsvp(g)}
                    disabled={sendingRsvpId === g.id}
                    className="rounded bg-purple-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {sendingRsvpId === g.id ? "..." : "Send RSVP"}
                  </button>
                )}
              </td>
              <td className="px-4 py-2 text-gray-500">{new Date(g.created_at).toLocaleString()}</td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onEdit(g)} className="rounded border px-3 py-1 hover:bg-gray-50">
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
