import { randomBytes } from "node:crypto";
import type { CreateGuestInput, Guest } from "../types/guest.types.js";
import { getDb } from "../db/connection.js";

// Learn: repository = the ONLY staff allowed to touch the register book.
// Controllers/services must ask the repository; they never run SQL directly.
// This keeps SQL in one place so a schema change touches one file.

// Row as better-sqlite3 returns it (snake_case, matches table columns).
type GuestRow = Guest;

const toGuest = (row: GuestRow): Guest => ({ ...row });

export const createGuest = (input: CreateGuestInput): Guest => {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO guests (first_name, last_name, email, phone, attendance_status, ticket_number, qr_token)
    VALUES (@first_name, @last_name, @email, @phone, @attendance_status, @ticket_number, @qr_token)
  `);
  const result = stmt.run({
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email,
    phone: input.phone ?? null,
    attendance_status: input.attendance_status ?? "pending",
    ticket_number: input.ticket_number ?? null,
    qr_token: input.qr_token ?? null,
  });
  const created = db
    .prepare(`SELECT * FROM guests WHERE id = ?`)
    .get(Number(result.lastInsertRowid)) as GuestRow | undefined;
  if (!created) throw new Error("Failed to read back created guest");
  return toGuest(created);
};

export const findGuestById = (id: number): Guest | null => {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM guests WHERE id = ?`).get(id) as
    | GuestRow
    | undefined;
  return row ? toGuest(row) : null;
};

export const findGuestByEmail = (email: string): Guest | null => {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM guests WHERE email = ?`)
    .get(email) as GuestRow | undefined;
  return row ? toGuest(row) : null;
};

export const listGuests = (limit = 50): Guest[] => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM guests ORDER BY id ASC LIMIT ?`)
    .all(limit) as GuestRow[];
  return rows.map(toGuest);
};

// Allowed columns for PATCH. System fields (id, ticket_number, qr_token,
// is_sent, created_at, updated_at) are deliberately absent: the repository
// will never write them, so no caller can smuggle them in.
export type GuestPatch = Partial<
  Pick<Guest, "first_name" | "last_name" | "email" | "phone" | "attendance_status">
>;

export const updateGuestById = (id: number, patch: GuestPatch): Guest | null => {
  const columns = Object.keys(patch) as (keyof GuestPatch)[];
  if (columns.length === 0) return findGuestById(id);
  const db = getDb();
  // SET clause is built from a fixed allow-list above, never from raw
  // client input, so column names cannot be injected. Values stay as
  // named parameters (@first_name, ...) handled by the driver.
  const setClause = columns.map((col) => `${col} = @${col}`).join(", ");
  db.prepare(
    `UPDATE guests SET ${setClause}, updated_at = datetime('now') WHERE id = @id`
  ).run({ ...patch, id });
  return findGuestById(id);
};

// Result of an accreditation attempt. The single conditional UPDATE below
// is atomic, so two simultaneous requests cannot both succeed - but a
// zero-change result is ambiguous, and the service needs to answer
// 404 (no such guest) vs 409 (already accredited) correctly.
export type AccreditResult =
  | { status: "accredited"; guest: Guest }
  | { status: "not_found" }
  | { status: "already_accredited"; guest: Guest };

export const accreditGuestById = (id: number): AccreditResult => {
  const db = getDb();
  // One statement, one rule: only a row that is still NULL gets stamped.
  // If two requests race, SQLite runs them in order and the second finds
  // no matching row (changes = 0). No check-then-update gap exists.
  const result = db
    .prepare(
      `UPDATE guests
       SET accredited_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND accredited_at IS NULL`
    )
    .run(id);
  if (result.changes > 0) {
    const guest = findGuestById(id);
    // We just updated it, so it must exist; guard is for TypeScript.
    if (guest) return { status: "accredited", guest };
  }
  const existing = findGuestById(id);
  if (!existing) return { status: "not_found" };
  return { status: "already_accredited", guest: existing };
};

// Marks the RSVP email as sent. Called ONLY after SMTP confirms delivery,
// so is_sent = 1 always means "the mail server accepted it".
// Nothing else in the codebase writes this column: PATCH rejects it,
// public registration cannot touch it, admin creation leaves it 0.
export const markRsvpSent = (id: number): Guest | null => {
  const db = getDb();
  db.prepare(
    `UPDATE guests SET is_sent = 1, updated_at = datetime('now') WHERE id = ?`
  ).run(id);
  return findGuestById(id);
};

// Ticket format: TEX-000001, derived from the guest's own id.
// Unique because ids are unique; human-readable; backend-only.
// A 32-byte (64 hex char) random token: unguessable, opaque, no PII.
const TICKET_PREFIX = "TEX";
const QR_TOKEN_BYTES = 32;

const ticketNumberFor = (id: number): string => {
  return `${TICKET_PREFIX}-${String(id).padStart(6, "0")}`;
};

export const generateTicketCredentials = (id: number): Guest | null => {
  const db = getDb();
  // Transaction = all-or-nothing: the row is read, stamped, and re-read
  // as one unit, so concurrent admins can't half-write each other's work.
  // Idempotent: existing credentials are returned untouched, never rotated.
  const run = db.transaction((guestId: number): Guest | null => {
    const existing = findGuestById(guestId);
    if (!existing) return null;
    if (existing.ticket_number && existing.qr_token) return existing;
    const ticket_number = existing.ticket_number ?? ticketNumberFor(guestId);
    let qr_token = existing.qr_token;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = qr_token ?? randomBytes(QR_TOKEN_BYTES).toString("hex");
      try {
        db.prepare(
          `UPDATE guests
           SET ticket_number = @ticket_number, qr_token = @qr_token,
               updated_at = datetime('now')
           WHERE id = @id`
        ).run({ ticket_number, qr_token: candidate, id: guestId });
        qr_token = candidate;
        break;
      } catch (err) {
        // Near-impossible random collision: try a fresh token, same ticket.
        if (err instanceof Error && err.message.includes("UNIQUE") && attempt < 4) {
          qr_token = null;
          continue;
        }
        throw err;
      }
    }
    return findGuestById(guestId);
  });
  return run(id);
};
