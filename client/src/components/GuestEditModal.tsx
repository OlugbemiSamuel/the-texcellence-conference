import { useState } from "react";
import { updateGuest } from "../api/guests.api.js";
import { ApiError, getErrorMessage } from "../api/client.js";
import type { AttendanceStatus, Guest, UpdateGuestPayload } from "../types/guest.types.js";

// Learn: the modal owns a DRAFT copy of the guest. Typing edits the draft,
// Save sends only the 5 allowed fields via PATCH. The list updates only
// after the backend confirms - backend is the authority, not the form.

interface GuestEditModalProps {
  guest: Guest;
  onClose: () => void;
  onSaved: (updated: Guest) => void;
  onAuthExpired: () => void;
}

export default function GuestEditModal({ guest, onClose, onSaved, onAuthExpired }: GuestEditModalProps): JSX.Element {
  const [firstName, setFirstName] = useState(guest.first_name);
  const [lastName, setLastName] = useState(guest.last_name);
  const [email, setEmail] = useState(guest.email);
  const [phone, setPhone] = useState(guest.phone ?? "");
  const [attendance, setAttendance] = useState<AttendanceStatus>(guest.attendance_status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // Empty phone box means "no phone" (null), matching backend rules.
      const patch: UpdateGuestPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() === "" ? null : phone.trim(),
        attendance_status: attendance,
      };
      onSaved(await updateGuest(guest.id, patch));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold">Edit guest</h2>
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              First name
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </label>
            <label className="block text-sm">
              Last name
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm">
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm">
            Attendance
            <select value={attendance} onChange={(e) => setAttendance(e.target.value as AttendanceStatus)} className="mt-1 w-full rounded border px-3 py-2">
              <option value="pending">pending</option>
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
          </label>
          {error && (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="rounded border px-4 py-2">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50">
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
