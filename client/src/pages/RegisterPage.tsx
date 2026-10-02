import { useState } from "react";
import { getErrorMessage } from "../api/client.js";
import { submitRegistration } from "../api/registration.api.js";
import type { Guest } from "../types/guest.types.js";

// Learn: attendance is a BUSINESS decision, asked FIRST.
// YES -> full form (submits "yes"). NO -> short decline form (submits
// "no") so the backend records the answer instead of frontend memory.
// The backend still re-validates everything - this screen is convenience,
// the service is the boundary.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "ask" | "form" | "decline";

export default function RegisterPage(): JSX.Element {
  const [step, setStep] = useState<Step>("ask");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedGuest, setSavedGuest] = useState<Guest | null>(null);
  const [declined, setDeclined] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateNameEmail = (): boolean => {
    const errors: Record<string, string> = {};
    if (firstName.trim() === "") errors.firstName = "First name is required.";
    if (lastName.trim() === "") errors.lastName = "Last name is required.";
    if (email.trim() === "") errors.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async (attendance: "yes" | "no", withPhone: boolean): Promise<void> => {
    if (loading) return;
    setServerError(null);
    if (!validateNameEmail()) return;
    setLoading(true);
    try {
      const saved = await submitRegistration({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: withPhone && phone.trim() !== "" ? phone.trim() : undefined,
        attendance_status: attendance,
      });
      if (attendance === "yes") setSavedGuest(saved);
      else setDeclined(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetChoice = (): void => {
    setStep("ask");
    setServerError(null);
    setFieldErrors({});
  };

  const inputClass = "mt-1 w-full rounded border px-3 py-2";
  const nameEmailFields = (
    <>
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
    </>
  );

  const shell = (title: string, body: React.ReactNode): JSX.Element => (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <section className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-bold">The Texcellence Conference</h1>
        <p className="mt-1 text-sm text-gray-600">Accelerating Africa&apos;s Digital Future</p>
        <p className="text-sm text-gray-600">13 October 2026 | Landmark Event Centre</p>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        {body}
      </section>
    </main>
  );

  if (savedGuest) {
    return shell(
      "Registration successful",
      <p className="mt-2 text-gray-700">
        Thank you, {savedGuest.first_name}. Your attendance has been recorded for The Texcellence Conference.
      </p>
    );
  }

  if (declined) {
    return shell(
      "Response recorded",
      <div className="mt-2 text-gray-700">
        <p>Thank you for letting us know you will not be attending.</p>
        <button onClick={resetChoice} className="mt-4 text-sm text-blue-600 underline">
          I changed my mind
        </button>
      </div>
    );
  }

  if (step === "ask") {
    return shell(
      "Will you be attending the Texcellence Conference?",
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => { setStep("form"); setServerError(null); }} className="rounded bg-blue-600 px-4 py-2 font-medium text-white">
          YES
        </button>
        <button onClick={() => { setStep("decline"); setServerError(null); }} className="rounded border px-4 py-2 font-medium">
          NO
        </button>
      </div>
    );
  }

  if (step === "decline") {
    return shell(
      "Sorry you'll miss it",
      <form
        onSubmit={(e) => { void e.preventDefault(); void submit("no", false); }}
        className="mt-4 space-y-4"
        noValidate
      >
        <p className="text-sm text-gray-600">
          Please leave your name and email so we can record your response.
        </p>
        {nameEmailFields}
        {serverError && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
        )}
        <button type="submit" disabled={loading} className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          {loading ? "Recording..." : "Confirm I can't attend"}
        </button>
        <button type="button" onClick={resetChoice} className="w-full text-sm text-blue-600 underline">
          Back to YES / NO choice
        </button>
      </form>
    );
  }

  return shell(
    "Registration",
    <form
      onSubmit={(e) => { void e.preventDefault(); void submit("yes", true); }}
      className="mt-4 space-y-4"
      noValidate
    >
      {nameEmailFields}
      <div>
        <label htmlFor="reg-phone" className="block text-sm font-medium">Phone number <span className="font-normal text-gray-500">(optional)</span></label>
        <input id="reg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
      </div>
      {serverError && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
      )}
      <button type="submit" disabled={loading} className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50">
        {loading ? "Submitting..." : "Register"}
      </button>
      <button type="button" onClick={resetChoice} className="w-full text-sm text-blue-600 underline">
        Back to YES / NO choice
      </button>
    </form>
  );
}
