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
  onEdit: (guest: Guest) => void;
}

export default function GuestTable({ guests, onEdit }: GuestTableProps): JSX.Element {
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
              <td className="px-4 py-2">{g.ticket_number ?? "-"}</td>
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
