import { useEffect, useState } from "react";
import { ApiError, apiFetch, getErrorMessage } from "../api/client.js";

// Learn: the public ticket card. No login, no token needed: anyone with
// the QR link sees ONLY name + company (the endpoint refuses the rest).
// Staff QRs resolve here too - same token= links, prettier landing.

interface PublicTicket {
  first_name: string;
  last_name: string;
  company: string | null;
}

export default function TicketPage(): JSX.Element {
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
    if (!token) {
      setFailed("This ticket link is incomplete.");
      return;
    }
    let cancelled = false;
    void apiFetch<PublicTicket>(`/api/ticket?token=${encodeURIComponent(token)}`, { auth: false })
      .then((found) => {
        if (!cancelled) setTicket(found);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailed(
          err instanceof ApiError && (err.status === 404 || err.status === 400)
            ? "This ticket could not be verified."
            : getErrorMessage(err)
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-deep p-4">
      <section aria-label="Entry ticket" className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-brand-navy px-6 py-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">
            Entry Ticket
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-wide text-white">
            THE TEXCELLENCE CONFERENCE
          </h1>
        </div>
        <div className="px-6 py-10 text-center">
          {ticket ? (
            <>
              <p className="text-sm text-slate-500">Guest</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">
                {ticket.first_name} {ticket.last_name}
              </p>
              {ticket.company && (
                <p className="mt-2 text-lg font-medium text-slate-600">{ticket.company}</p>
              )}
            </>
          ) : failed ? (
            <>
              <p className="text-xl font-bold text-slate-900">Ticket not found</p>
              <p className="mt-2 text-sm text-slate-500">{failed}</p>
            </>
          ) : (
            <p className="text-slate-500">Verifying ticket...</p>
          )}
        </div>
      </section>
    </main>
  );
}
