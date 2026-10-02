import { useState } from "react";

// Public landing page: conference presentation + the way in.
// Brand art loads from /brand/flyer.jpg when provided (see note below);
// the page stays complete with the text lockup if the file is absent.

const FLYER_SRC = "/brand/flyer.jpg";

export default function HomePage(): JSX.Element {
  const [flyerVisible, setFlyerVisible] = useState(true);

  return (
    <main className="min-h-screen bg-brand-mist">
      <div className="bg-brand-navy text-white">
        <div className="mx-auto max-w-4xl px-4 pb-10 pt-10 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-gold">
            The TeXcellence Conference
          </p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
            Accelerating Africa&apos;s Digital Future
          </h1>
          <p className="mt-4 text-sm text-slate-200 sm:text-base">
            Tuesday, 13 October 2026 &nbsp;|&nbsp; Landmark Event Centre
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="#/register"
              className="rounded-xl bg-brand-gold px-8 py-3.5 text-base font-bold text-brand-deep shadow transition hover:brightness-95"
            >
              Register to attend
            </a>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        {flyerVisible && (
          <img
            src={FLYER_SRC}
            alt="The Texcellence Conference official flyer"
            onError={() => setFlyerVisible(false)}
            className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 shadow-lg"
          />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Attend</h2>
            <p className="mt-1 text-sm text-slate-600">
              Tell us you&apos;re coming in under a minute.
            </p>
            <a href="#/register" className="mt-3 inline-block text-sm font-semibold text-brand-navy underline">
              Go to registration
            </a>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Event team</h2>
            <p className="mt-1 text-sm text-slate-600">
              Manage guests, tickets and RSVP emails.
            </p>
            <a href="#/admin" className="mt-3 inline-block text-sm font-semibold text-brand-navy underline">
              Admin sign in
            </a>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Door staff</h2>
            <p className="mt-1 text-sm text-slate-600">
              Search or scan QR codes to accredit guests.
            </p>
            <a href="#/accredit-login" className="mt-3 inline-block text-sm font-semibold text-brand-navy underline">
              Accreditation sign in
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
