import { useState } from "react";
import { updateGuest } from "../api/guests.api.js";
import { ApiError, getErrorMessage } from "../api/client.js";
import type { AttendanceStatus, Guest, UpdateGuestPayload } from "../types/guest.types.js";
import { alertErrorCls, btnPrimary, btnSecondary, inputCls } from "./ui.js";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-deep/60 p-4">
      <section aria-labelledby="edit-guest-heading" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <h2 id="edit-guest-heading" className="text-lg font-bold text-slate-900">Edit guest</h2>
        <form onSubmit={handleSave} className="mt-4 space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-first" className="block text-sm font-medium text-slate-700">First name</label>
              <input id="edit-first" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="edit-last" className="block text-sm font-medium text-slate-700">Last name</label>
              <input id="edit-last" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label htmlFor="edit-email" className="block text-sm font-medium text-slate-700">Email</label>
            <input id="edit-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="edit-phone" className="block text-sm font-medium text-slate-700">Phone</label>
            <input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className={inputCls} />
          </div>
          <div>
            <label htmlFor="edit-attendance" className="block text-sm font-medium text-slate-700">Attendance</label>
            <select id="edit-attendance" value={attendance} onChange={(e) => setAttendance(e.target.value as AttendanceStatus)} className={inputCls}>
              <option value="pending">pending</option>
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
          </div>
          {error && <p role="alert" className={alertErrorCls}>{error}</p>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
