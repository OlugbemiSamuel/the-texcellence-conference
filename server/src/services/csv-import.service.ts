import {
  generateTicketCredentials,
  createGuest,
  findGuestByEmail,
  updateGuestById as persistGuestUpdate,
} from "../repositories/guest.repository.js";
import {
  normalizeAttendance,
  normalizeEmail,
  normalizeFirstName,
  normalizeLastName,
  normalizeOptionalText,
  normalizePhone,
} from "./guest.service.js";
import { ValidationError } from "../errors/http.error.js";

// Learn: CSV import is the admin bulk upsert. Accepted columns are the
// registration fields plus invite-list profile columns - anything else
// (id, ticket_number, qr_token, accredited_at, is_sent, timestamps) is
// rejected at the header, so protected state can never be smuggled in
// through a spreadsheet.

export interface CsvImportRowError {
  row: number;
  email: string;
  message: string;
}

export interface CsvImportResult {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: CsvImportRowError[];
}

const MAX_ROWS = 2000;
const ALLOWED_COLUMNS = ["first_name", "last_name", "email", "phone", "mobile", "attendance_status", "company", "job_title", "industry", "external_pass_id"] as const;
const PROTECTED_COLUMNS = ["id", "ticket_number", "qr_token", "accredited_at", "is_sent", "created_at", "updated_at"];

// Minimal RFC-4180-style parser: commas, "quoted, fields" and "" escapes,
// CRLF or LF rows. No dependency needed for a 5-column admin upload.
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);
  // Drop fully-blank lines (trailing newline, spreadsheet gaps).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
};

export const importGuestsFromCsv = (rawCsv: unknown): CsvImportResult => {
  if (typeof rawCsv !== "string" || rawCsv.trim() === "") {
    throw new ValidationError("CSV content is required");
  }
  const rows = parseCsv(rawCsv);
  if (rows.length < 2) {
    throw new ValidationError("CSV must contain a header row and at least one guest row");
  }
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  for (const required of ["first_name", "last_name", "email"] as const) {
    if (!headers.includes(required)) {
      throw new ValidationError(`CSV header is missing required column: ${required}`);
    }
  }
  const forbidden = headers.filter((h) => (PROTECTED_COLUMNS as readonly string[]).includes(h));
  if (forbidden.length > 0) {
    throw new ValidationError(`CSV must not contain protected columns: ${forbidden.join(", ")}`);
  }
  const unknown = headers.filter((h) => !(ALLOWED_COLUMNS as readonly string[]).includes(h));
  if (unknown.length > 0) {
    throw new ValidationError(`CSV contains unknown columns: ${unknown.join(", ")}`);
  }

  const data = rows.slice(1);
  if (data.length > MAX_ROWS) {
    throw new ValidationError(`CSV has too many rows (maximum ${MAX_ROWS})`);
  }

  const idx = (name: string): number => headers.indexOf(name);
  const result: CsvImportResult = { processed: data.length, created: 0, updated: 0, skipped: 0, errors: [] };
  // Duplicate emails inside one file: last row wins, earlier ones are
  // reported as skipped so nothing is silently discarded.
  const seen = new Map<string, number>();
  data.forEach((cells, i) => {
    const emailRaw = cells[idx("email")] ?? "";
    const key = emailRaw.trim().toLowerCase();
    if (key !== "") {
      if (seen.has(key)) {
        const firstRow = seen.get(key) as number;
        result.errors.push({ row: firstRow, email: emailRaw.trim(), message: `Duplicate email in file; kept row ${i + 2}` });
        result.skipped += 1;
      }
      seen.set(key, i + 2);
    }
  });

  data.forEach((cells, i) => {
    const rowNumber = i + 2;
    const emailRaw = cells[idx("email")] ?? "";
    const key = emailRaw.trim().toLowerCase();
    // Superseded by a later duplicate row - already counted above.
    if (key !== "" && seen.get(key) !== rowNumber) return;
    const fail = (message: string): void => {
      result.errors.push({ row: rowNumber, email: emailRaw.trim(), message });
      result.skipped += 1;
    };
    let first_name: string;
    let last_name: string;
    let email: string;
    let phone: string | null;
    let attendance_status: "yes" | "no" | "pending";
    let company: string | null;
    let job_title: string | null;
    let industry: string | null;
    let external_pass_id: string | null;
    try {
      first_name = normalizeFirstName(cells[idx("first_name")] ?? "");
      last_name = normalizeLastName(cells[idx("last_name")] ?? "");
      email = normalizeEmail(emailRaw);
      // Phone or Mobile header both land in the guest's single phone field:
      // Phone wins when both are filled, Mobile fills the gaps.
      // (Invite sheets split them across two columns; the table keeps one.)
      const rawPhone = cells[idx("phone")] ?? "";
      const rawMobile = idx("mobile") >= 0 ? cells[idx("mobile")] ?? "" : "";
      const pickedPhone = rawPhone.trim() !== "" ? rawPhone : rawMobile;
      phone = idx("phone") >= 0 || idx("mobile") >= 0 ? normalizePhone(pickedPhone) : null;
      const rawAttendance = idx("attendance_status") >= 0 ? cells[idx("attendance_status")] ?? "" : "";
      // Invite lists arrive with no response yet: blank attendance means
      // "pending" (invited, not yet replied). Explicit yes/no still enforced
      // wherever a final answer is required (public registration).
      if (typeof rawAttendance !== "string" || rawAttendance.trim() === "") {
        attendance_status = "pending";
      } else {
        attendance_status = normalizeAttendance(rawAttendance);
      }
      company = idx("company") >= 0 ? normalizeOptionalText(cells[idx("company")] ?? "", "company") : null;
      job_title = idx("job_title") >= 0 ? normalizeOptionalText(cells[idx("job_title")] ?? "", "job_title") : null;
      industry = idx("industry") >= 0 ? normalizeOptionalText(cells[idx("industry")] ?? "", "industry") : null;
      external_pass_id = idx("external_pass_id") >= 0 ? normalizeOptionalText(cells[idx("external_pass_id")] ?? "", "external_pass_id") : null;
    } catch (err) {
      fail(err instanceof Error ? err.message : "Invalid row");
      return;
    }

    const existing = findGuestByEmail(email);
    try {
      if (existing) {
        persistGuestUpdate(existing.id, { first_name, last_name, email, phone, attendance_status, company, job_title, industry, external_pass_id });
        // Imported rows always leave with a ticket (idempotent when present).
        generateTicketCredentials(existing.id);
        result.updated += 1;
      } else {
        const created = createGuest({ first_name, last_name, email, phone, attendance_status, company, job_title, industry, external_pass_id });
        generateTicketCredentials(created.id);
        result.created += 1;
      }
    } catch (err) {
      // Race on UNIQUE (two admins importing at once): re-read and update.
      if (err instanceof Error && err.message.includes("UNIQUE")) {
        const raced = findGuestByEmail(email);
        if (raced) {
          persistGuestUpdate(raced.id, { first_name, last_name, email, phone, attendance_status, company, job_title, industry, external_pass_id });
          result.updated += 1;
          return;
        }
      }
      fail("Could not save guest");
    }
  });

  return result;
};
