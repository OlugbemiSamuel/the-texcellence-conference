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
