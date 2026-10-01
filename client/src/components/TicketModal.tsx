import { QRCodeSVG } from "qrcode.react";
import type { Guest } from "../types/guest.types.js";

// Learn: a conference ticket on screen. Guest identity + ticket number
// for humans, QR for the future scanner. The QR encodes ONLY qr_token
// (an opaque random string) - never email, password, JWT, or the guest id.

interface TicketModalProps {
  guest: Guest;
  onClose: () => void;
}

export default function TicketModal({ guest, onClose }: TicketModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <section className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-lg">
        <p className="text-xs font-semibold tracking-widest text-gray-500">TEXCELLENCE CONFERENCE</p>
        <h2 className="mt-1 text-xl font-bold">
          {guest.first_name} {guest.last_name}
        </h2>
        <p className="text-sm text-gray-600">{guest.email}</p>
        <p className="mt-3 text-sm text-gray-500">Ticket</p>
        <p className="text-lg font-bold tracking-wide">{guest.ticket_number}</p>
        {guest.qr_token && (
          <div className="mx-auto mt-3 w-fit rounded border p-3">
            <QRCodeSVG value={guest.qr_token} size={180} />
          </div>
        )}
        <div className="mt-3 text-sm">
          {guest.accredited_at ? (
            <p>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Accredited</span>
              <span className="block text-xs text-gray-500">{new Date(guest.accredited_at).toLocaleString()}</span>
            </p>
          ) : (
            <p className="text-gray-500">Not Accredited</p>
          )}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded bg-blue-600 px-4 py-2 font-medium text-white">
          Close
        </button>
      </section>
    </div>
  );
}
