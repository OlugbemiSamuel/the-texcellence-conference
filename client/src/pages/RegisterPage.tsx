import { useState } from "react";
import { getErrorMessage } from "../api/client.js";
import { submitRegistration } from "../api/registration.api.js";
import type { Guest } from "../types/guest.types.js";
import { alertErrorCls, btnPrimary, fieldErrorCls, inputCls } from "../components/ui.js";

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

  const nameEmailFields = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-first" className="block text-sm font-medium text-slate-700">First name</label>
          <input id="reg-first" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          {fieldErrors.firstName && <p className={fieldErrorCls}>{fieldErrors.firstName}</p>}
        </div>
        <div>
          <label htmlFor="reg-last" className="block text-sm font-medium text-slate-700">Last name</label>
          <input id="reg-last" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
          {fieldErrors.lastName && <p className={fieldErrorCls}>{fieldErrors.lastName}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700">Email</label>
        <input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        {fieldErrors.email && <p className={fieldErrorCls}>{fieldErrors.email}</p>}
      </div>
    </>
  );

  // Brand hero (navy, gold accent) + white card. Stacks on mobile.
  const shell = (title: string, subtitle: string | null, body: React.ReactNode): JSX.Element => (
    <main className="min-h-screen bg-brand-mist">
      <div className="bg-brand-navy text-white">
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-10 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-gold">
            The TeXcellence Conference
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
            Accelerating Africa&apos;s Digital Future
          </h1>
          <p className="mt-3 text-sm text-slate-200 sm:text-base">
            Tuesday, 13 October 2026 &nbsp;|&nbsp; Landmark Event Centre
          </p>
        </div>
      </div>
      <section className="mx-auto -mt-6 w-full max-w-2xl px-4 pb-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="h-1 w-16 rounded bg-brand-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          <div className="mt-5">{body}</div>
        </div>
      </section>
    </main>
  );

  if (savedGuest) {
    return shell(
      "Registration successful",
      null,
      <div className="rounded-xl bg-green-50 p-4 text-green-900">
        <p className="font-semibold">Thank you, {savedGuest.first_name}.</p>
        <p className="mt-1 text-sm">Your attendance has been recorded. We look forward to seeing you on 13 October 2026 at the Landmark Event Centre.</p>
      </div>
    );
  }

  if (declined) {
    return shell(
      "Response recorded",
      null,
      <div>
        <p className="text-slate-700">Thank you for letting us know you will not be attending. You&apos;ll be missed.</p>
        <button onClick={resetChoice} className="mt-4 text-sm font-medium text-brand-navy underline">
          I changed my mind
        </button>
      </div>
    );
  }

  if (step === "ask") {
    return shell(
      "Will you be attending?",
      "Please choose one option to continue.",
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={() => { setStep("form"); setServerError(null); }}
          className="rounded-xl bg-brand-navy px-4 py-4 text-base font-bold text-white shadow transition hover:bg-brand-deep"
        >
          YES, I&apos;ll attend
        </button>
        <button
          onClick={() => { setStep("decline"); setServerError(null); }}
          className="rounded-xl border-2 border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          NO, I can&apos;t make it
        </button>
      </div>
    );
  }

  if (step === "decline") {
    return shell(
      "Sorry you'll miss it",
      "Leave your name and email so we can record your response.",
      <form
        onSubmit={(e) => { void e.preventDefault(); void submit("no", false); }}
        className="space-y-4"
        noValidate
      >
        {nameEmailFields}
        {serverError && <p role="alert" className={alertErrorCls}>{serverError}</p>}
        <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-3 text-base`}>
          {loading ? "Recording..." : "Confirm I can't attend"}
        </button>
        <button type="button" onClick={resetChoice} className="w-full py-2 text-sm font-medium text-brand-navy underline">
          Back to YES / NO choice
        </button>
      </form>
    );
  }

  return shell(
    "Register to attend",
    "Fill in your details below. All fields except phone are required.",
    <form
      onSubmit={(e) => { void e.preventDefault(); void submit("yes", true); }}
      className="space-y-4"
      noValidate
    >
      {nameEmailFields}
      <div>
        <label htmlFor="reg-phone" className="block text-sm font-medium text-slate-700">
          Phone number <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input id="reg-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
      </div>
      {serverError && <p role="alert" className={alertErrorCls}>{serverError}</p>}
      <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-3 text-base`}>
        {loading ? "Submitting..." : "Complete registration"}
      </button>
      <button type="button" onClick={resetChoice} className="w-full py-2 text-sm font-medium text-brand-navy underline">
        Back to YES / NO choice
      </button>
    </form>
  );
}
