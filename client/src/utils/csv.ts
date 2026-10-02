import type { Guest } from "../types/guest.types.js";

// Learn: CSV export is pure client-side work over ALREADY-LOADED data -
// no new endpoint needed. qr_token is deliberately excluded: it is an
// opaque credential and should not travel in spreadsheets.

const COLUMNS: { key: string; value: (g: Guest) => string }[] = [
  { key: "id", value: (g) => String(g.id) },
  { key: "first_name", value: (g) => g.first_name },
  { key: "last_name", value: (g) => g.last_name },
  { key: "email", value: (g) => g.email },
  { key: "phone", value: (g) => g.phone ?? "" },
  { key: "attendance_status", value: (g) => g.attendance_status },
  { key: "ticket_number", value: (g) => g.ticket_number ?? "" },
  { key: "accredited_at", value: (g) => g.accredited_at ?? "" },
  { key: "is_sent", value: (g) => String(g.is_sent) },
  { key: "created_at", value: (g) => g.created_at },
];

const escapeCell = (value: string): string => {
  // Quote when the value could break columns: comma, quote, or newline.
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const guestsToCsv = (guests: Guest[]): string => {
  const header = COLUMNS.map((c) => c.key).join(",");
  const rows = guests.map((g) => COLUMNS.map((c) => escapeCell(c.value(g))).join(","));
  return [header, ...rows].join("\r\n");
};

export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
