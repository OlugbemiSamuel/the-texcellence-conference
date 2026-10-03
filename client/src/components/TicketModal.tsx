import { QRCodeSVG } from "qrcode.react";
import type { Guest } from "../types/guest.types.js";
import { buildAccreditUrl } from "../utils/accredit-link.js";
import { Badge, btnPrimary } from "./ui.js";

// Learn: a conference ticket on screen. Guest identity + ticket number
// for humans, QR for the scanner. The QR encodes an accreditation URL
// carrying ONLY the opaque qr_token - never email, password, or JWT.

interface TicketModalProps {
  guest: Guest;
  onClose: () => void;
}

export default function TicketModal({ guest, onClose }: TicketModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-deep/60 p-4">
      <section aria-labelledby="ticket-heading" className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-brand-navy px-6 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-gold">
            TeXcellence Conference
          </p>
          <p className="mt-0.5 text-xs text-slate-300">13 October 2026 | Landmark Event Centre</p>
        </div>
        <div className="px-6 py-5 text-center">
          <h2 id="ticket-heading" className="text-xl font-extrabold text-slate-900">
            {guest.first_name} {guest.last_name}
          </h2>
          <p className="text-sm text-slate-600">{guest.email}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Ticket</p>
          <p className="text-2xl font-extrabold tracking-wide text-brand-navy">{guest.ticket_number}</p>
          {guest.qr_token && (
            <div className="mx-auto mt-4 w-fit rounded-xl border-2 border-brand-gold/60 bg-white p-3">
              <QRCodeSVG value={buildAccreditUrl(guest.qr_token)} size={180} role="img" aria-label={`QR code for ticket ${guest.ticket_number}`} />
            </div>
          )}
          <div className="mt-4 text-sm">
            {guest.accredited_at ? (
              <p>
                <Badge tone="blue">Accredited</Badge>
                <span className="mt-1 block text-xs text-slate-500">{new Date(guest.accredited_at).toLocaleString()}</span>
              </p>
            ) : (
              <p className="text-slate-500">Not Accredited</p>
            )}
          </div>
          <button onClick={onClose} className={`${btnPrimary} mt-5 w-full py-3`}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
