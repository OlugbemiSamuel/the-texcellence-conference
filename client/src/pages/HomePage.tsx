// Public landing page: conference presentation + the way in.
// Brand art loads from /brand/flyer.jpg when provided; the layout stays
// complete with the text lockup if the file is absent.

import { useState } from "react";

const FLYER_SRC = "/brand/flyer.jpg";

const iconCls = "h-4 w-4 shrink-0 text-brand-gold";

export default function HomePage(): JSX.Element {
  const [flyerVisible, setFlyerVisible] = useState(true);

  return (
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
        {flyerVisible && (
          <img
            src={FLYER_SRC}
            alt="The Texcellence Conference official flyer"
            onError={() => setFlyerVisible(false)}
            className="w-full rounded-2xl border border-slate-200 shadow-lg"
          />
        )}
        <a
          href="#/register"
          className="mt-6 block w-full animate-pulse rounded-xl bg-brand-gold px-6 py-4 text-center text-base font-bold text-brand-deep shadow-lg transition hover:brightness-95 sm:mx-auto sm:w-auto sm:min-w-[320px] sm:text-lg"
        >
          Register to attend - save your seat
        </a>
      </section>
    </main>
  );
}
