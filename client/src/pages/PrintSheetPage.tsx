import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ApiError, getErrorMessage } from "../api/client.js";
import { listGuests } from "../api/guests.api.js";
import type { Guest } from "../types/guest.types.js";
import { buildAccreditUrl } from "../utils/accredit-link.js";

// Learn: the office backup printout. Same Name + QR rows as the xlsx,
// rendered for paper: compact rows, one Print button, print CSS hides
// everything but the sheet. Guests render in chunks so 1354+ QRs never
// freeze the tab - "Show all" only when actually printing.

const CHUNK = 100;

export default function PrintSheetPage({ onAuthExpired }: { onAuthExpired: () => void }): JSX.Element {
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [shown, setShown] = useState(CHUNK);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listGuests()
      .then((all) => {
        if (cancelled) return;
        const ordered = [...all].sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, undefined, { sensitivity: "base" })
        );
        setGuests(ordered);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onAuthExpired();
          return;
        }
        setError(getErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = guests?.slice(0, shown) ?? [];

  return (
    <div className="min-h-screen bg-white">
      <style>{`@media print { .print-hide { display: none !important; } .print-row { break-inside: avoid; } }`}</style>
      <div className="print-hide mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Print sheet</h1>
          <p className="text-sm text-slate-500">
            {guests ? `${guests.length} guests, A-Z. Each QR opens the guest's ticket card.` : "Loading guests..."}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {guests && shown < guests.length && (
            <>
              <button onClick={() => setShown((s) => s + 500)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                Show more ({shown}/{guests.length})
              </button>
              <button onClick={() => setShown(guests.length)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                Show all
              </button>
            </>
          )}
          <button onClick={() => window.print()} disabled={!guests} className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Print
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mx-auto max-w-3xl px-4 text-sm text-red-700">{error}</p>}
      <ul className="mx-auto max-w-3xl px-4 pb-10">
        {visible.map((g) => (
          <li key={g.id} className="print-row flex items-center gap-4 border-b border-slate-200 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold text-slate-900">{g.first_name} {g.last_name}</span>
            </span>
            {g.qr_token ? (
              <QRCodeSVG value={buildAccreditUrl(g.qr_token)} size={72} role="img" aria-label={`QR for ${g.first_name} ${g.last_name}`} />
            ) : (
              <span className="text-xs text-slate-400">No QR</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
