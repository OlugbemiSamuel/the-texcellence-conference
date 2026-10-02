import { useState } from "react";
import { createGuest } from "../api/guests.api.js";
import { ApiError, getErrorMessage } from "../api/client.js";
import type { Guest } from "../types/guest.types.js";
import { alertErrorCls, btnPrimary, btnSecondary, fieldErrorCls, inputCls } from "./ui.js";

// Admin-only guest creation (dashboard). New guests start as "pending";
// the guest completes YES/NO later via public registration, which finds
// this same record by email instead of creating a duplicate.

interface GuestAddModalProps {
  onClose: () => void;
  onCreated: (guest: Guest) => void;
  onAuthExpired: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GuestAddModal({ onClose, onCreated, onAuthExpired }: GuestAddModalProps): JSX.Element {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (loading) return;
    const problems: Record<string, string> = {};
    if (firstName.trim() === "") problems.firstName = "First name is required.";
    if (lastName.trim() === "") problems.lastName = "Last name is required.";
    if (email.trim() === "") problems.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(email.trim())) problems.email = "Enter a valid email address.";
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setLoading(true);
    setError(null);
    try {
      onCreated(
        await createGuest({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() === "" ? undefined : phone.trim(),
        })
      );
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
      <section aria-labelledby="add-guest-heading" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <h2 id="add-guest-heading" className="text-lg font-bold text-slate-900">Add guest</h2>
        <p className="mt-1 text-sm text-slate-600">
          The guest starts as pending and completes registration via the public link.
        </p>
        <form onSubmit={handleSave} className="mt-4 space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="add-first" className="block text-sm font-medium text-slate-700">First name</label>
              <input id="add-first" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
              {fieldErrors.firstName && <p className={fieldErrorCls}>{fieldErrors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="add-last" className="block text-sm font-medium text-slate-700">Last name</label>
              <input id="add-last" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
              {fieldErrors.lastName && <p className={fieldErrorCls}>{fieldErrors.lastName}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="add-email" className="block text-sm font-medium text-slate-700">Email</label>
            <input id="add-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            {fieldErrors.email && <p className={fieldErrorCls}>{fieldErrors.email}</p>}
          </div>
          <div>
            <label htmlFor="add-phone" className="block text-sm font-medium text-slate-700">
              Phone <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input id="add-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          {error && <p role="alert" className={alertErrorCls}>{error}</p>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? "Adding..." : "Add guest"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
