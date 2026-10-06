import { useState } from "react";
import { getErrorMessage } from "../api/client.js";
import { submitRegistration } from "../api/registration.api.js";
import type { Guest } from "../types/guest.types.js";
import {
  alertErrorCls,
  btnPrimary,
  fieldErrorCls,
  inputCls,
} from "../components/ui.js";

// Learn: attendance is a BUSINESS decision, asked FIRST.
// YES -> full form (submits "yes"). NO -> thank-you modal, nothing is
// submitted or stored. The backend still re-validates everything on YES.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const iconCls = "h-4 w-4 shrink-0 text-brand-gold";

export default function RegisterPage(): JSX.Element {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [asking, setAsking] = useState(true);
  const [sayingNo, setSayingNo] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedGuest, setSavedGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(false);

  const validateNameEmail = (): boolean => {
    const errors: Record<string, string> = {};
    if (firstName.trim() === "") errors.firstName = "First name is required.";
    if (lastName.trim() === "") errors.lastName = "Last name is required.";
    if (email.trim() === "") errors.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(email.trim()))
      errors.email = "Enter a valid email address.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitYes = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (loading) return;
    setServerError(null);
    if (!validateNameEmail()) return;
    setLoading(true);
    try {
      setSavedGuest(
        await submitRegistration({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() === "" ? undefined : phone.trim(),
          attendance_status: "yes",
        }),
      );
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const backToAsk = (): void => {
    setSayingNo(false);
    setAsking(true);
    setServerError(null);
    setFieldErrors({});
  };

  // Brand hero (navy, gold accent) + white card. Stacks on mobile.
  const shell = (title: string | null, body: React.ReactNode): JSX.Element => (
    <main className="min-h-screen bg-brand-mist">
      <div className="bg-brand-navy text-white">
        <div className="mx-auto max-w-2xl px-4 pb-6 pt-8 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-gold">
            The TeXcellence Conference
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
            Accelerating Africa&apos;s Digital Future
          </h1>
          <div className="mt-3 flex flex-col items-center gap-1.5 text-sm text-slate-200 sm:text-base">
            <p className="flex items-center gap-1.5 whitespace-nowrap">
              <svg
                className={iconCls}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span>
                <strong className="font-semibold text-white">Date:</strong>{" "}
                Tuesday, 13 October 2026
              </span>
            </p>
            <p className="flex items-center gap-1.5 whitespace-nowrap">
              <svg
                className={iconCls}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>
                <strong className="font-semibold text-white">Location:</strong>{" "}
                Landmark Event Centre
              </span>
            </p>
          </div>
        </div>
      </div>
      <section className="mx-auto w-full max-w-2xl px-4 pb-8 pt-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="h-1 w-16 rounded bg-brand-gold" aria-hidden="true" />
          {title && (
            <h2 className="mt-3 text-xl font-bold text-slate-900">{title}</h2>
          )}
          <div className="mt-4">{body}</div>
        </div>
      </section>

      {sayingNo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-deep/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="thanks-heading"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl sm:p-8">
            <p
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-goldlight text-xl font-bold text-brand-deep"
              aria-hidden="true"
            >
              ✓
            </p>
            <h2
              id="thanks-heading"
              className="mt-3 text-xl font-bold text-slate-900"
            >
              Thank you for your response
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              We&apos;re sorry you can&apos;t make it. You&apos;ll be missed.
            </p>
            <button
              onClick={backToAsk}
              className={`${btnPrimary} mt-5 w-full py-3`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );

  if (savedGuest) {
    return shell(
      "Registration successful",
      <div>
        <div className="rounded-xl bg-green-50 p-4 text-green-900">
          <p className="font-semibold">Thank you, {savedGuest.first_name}.</p>
          <p className="mt-1 text-sm">
            Your attendance has been recorded. Please check your email — your QR
            code for entry to the Landmark Event Centre will arrive there.
          </p>
        </div>
        <a
          href="#/"
          className="mt-4 block py-2 text-center text-sm font-medium text-brand-navy underline"
        >
          ← Back to homepage
        </a>
      </div>,
    );
  }

  if (asking) {
    return shell(
      "Will you be attending the Texcellence Conference?",
      <div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => setAsking(false)}
            className="rounded-xl bg-brand-navy px-4 py-4 text-base font-bold text-white shadow transition hover:bg-brand-deep"
          >
            YES, I&apos;ll attend
          </button>
          <button
            onClick={() => setSayingNo(true)}
            className="rounded-xl border-2 border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            NO, I can&apos;t make it
          </button>
        </div>
        <a
          href="#/"
          className="mt-4 block py-2 text-center text-sm font-medium text-brand-navy underline"
        >
          ← Back to homepage
        </a>
      </div>,
    );
  }

  return shell(
    "Register to attend",
    <form onSubmit={submitYes} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="reg-first"
            className="block text-sm font-medium text-slate-700"
          >
            First name{" "}
            <span className="text-red-600" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="reg-first"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputCls}
          />
          {fieldErrors.firstName && (
            <p className={fieldErrorCls}>{fieldErrors.firstName}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="reg-last"
            className="block text-sm font-medium text-slate-700"
          >
            Last name{" "}
            <span className="text-red-600" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="reg-last"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputCls}
          />
          {fieldErrors.lastName && (
            <p className={fieldErrorCls}>{fieldErrors.lastName}</p>
          )}
        </div>
      </div>
      <div>
        <label
          htmlFor="reg-email"
          className="block text-sm font-medium text-slate-700"
        >
          Email{" "}
          <span className="text-red-600" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
        {fieldErrors.email && (
          <p className={fieldErrorCls}>{fieldErrors.email}</p>
        )}
      </div>
      <div>
        <label
          htmlFor="reg-phone"
          className="block text-sm font-medium text-slate-700"
        >
          Phone number{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="reg-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputCls}
        />
      </div>
      {serverError && (
        <p role="alert" className={alertErrorCls}>
          {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className={`${btnPrimary} w-full py-3 text-base`}
      >
        {loading ? "Submitting..." : "Complete registration"}
      </button>
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="w-full py-2 text-sm font-medium text-brand-navy underline"
      >
        ← Change your answer
      </button>
    </form>,
  );
}
