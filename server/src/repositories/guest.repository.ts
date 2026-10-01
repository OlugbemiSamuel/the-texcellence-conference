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
