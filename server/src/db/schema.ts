// Guest table definition (Chunk 2: guests ONLY, no accreditation table).
// Learn: schema = the written plan of a table: which columns exist,
// what type each column holds, and what rules the database must enforce.

export const GUEST_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  attendance_status TEXT NOT NULL DEFAULT 'pending',
  ticket_number TEXT UNIQUE,
  qr_token TEXT UNIQUE,
  is_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
