import { useState } from "react";
import { getErrorMessage } from "../api/client.js";
import { submitRegistration } from "../api/registration.api.js";

// Learn: controlled form - one state per field, validated twice:
// instantly in the browser (fast feedback) AND on the backend
// (the real authority, since browser checks can be bypassed).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage(): JSX.Element {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (firstName.trim() === "") errors.firstName = "First name is required.";
    if (lastName.trim() === "") errors.lastName = "Last name is required.";
    if (email.trim() === "") errors.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (loading || success) return;
    setServerError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      // attendance_status stays "pending": the YES/NO branching is Chunk 4.
      await submitRegistration({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() === "" ? undefined : phone.trim(),
        attendance_status: "pending",
      });
      setSuccess(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <section className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold">Registration successful</h1>
          <p className="mt-2 text-gray-700">
            Thank you for registering for The Texcellence Conference.
          </p>
          <p className="mt-1 text-sm text-gray-500">13 October 2026 | Landmark Event Centre</p>
        </section>
      </main>
    );
  }

  const inputClass = "mt-1 w-full rounded border px-3 py-2";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <section className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-bold">The Texcellence Conference</h1>
        <p className="mt-1 text-sm text-gray-600">Accelerating Africa&apos;s Digital Future</p>
        <p className="text-sm text-gray-600">13 October 2026 | Landmark Event Centre</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="reg-first" className="block text-sm font-medium">First name</label>
            <input id="reg-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            {fieldErrors.firstName && <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>}
          </div>
          <div>
            <label htmlFor="reg-last" className="block text-sm font-medium">Last name</label>
            <input id="reg-last" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            {fieldErrors.lastName && <p className="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>}
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium">Email</label>
            <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
          </div>
          <div>
            <label htmlFor="reg-phone" className="block text-sm font-medium">Phone number <span className="font-normal text-gray-500">(optional)</span></label>
            <input id="reg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          {serverError && (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}
          <button type="submit" disabled={loading} className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50">
            {loading ? "Submitting..." : "Register"}
          </button>
        </form>
      </section>
    </main>
  );
}
