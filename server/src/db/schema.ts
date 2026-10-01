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
  accredited_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Migration for development databases created before Chunk 7:
// SQLite has no "ADD COLUMN IF NOT EXISTS", so connection.ts checks
// PRAGMA table_info first and only then runs this statement.
// Existing guest rows keep their data; the new column starts as NULL.
export const ADD_ACCREDITED_AT_SQL = `
ALTER TABLE guests ADD COLUMN accredited_at TEXT;
`;
