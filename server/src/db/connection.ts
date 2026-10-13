import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  ADD_ACCREDITED_AT_SQL,
  GUEST_TABLE_SQL,
} from "./schema.js";

// Learn: connection = the open door to the database file.
// We keep ONE shared connection (singleton), like one register book
// on the reception desk that everyone writes in, not a new book per person.
//
// Why node:sqlite (built into Node 22+) instead of better-sqlite3?
// better-sqlite3 ships a native binary that needs a new OS (GLIBC 2.29+).
// Namecheap shared hosting runs an older OS, so that binary refuses to
// load (ERR_DLOPEN_FAILED) and the whole API returns 503. node:sqlite
// comes with Node itself, so there is nothing to compile or download.

let db: DatabaseSync | null = null;

const resolveDbPath = (): string => {
  const configured = process.env.DATABASE_PATH || "./data/texcellence.sqlite";
  return path.resolve(process.cwd(), configured);
};

export const getDb = (): DatabaseSync => {
  if (db) return db;
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  return db;
};

// Creates tables if they do not exist. Safe to run on every startup.
export const initDb = (): DatabaseSync => {
  const database = getDb();
  database.exec(GUEST_TABLE_SQL);
  // One-time rebuild: older databases declared email NOT NULL, which bars
  // printed-list guests admitted by name. New schema keeps email UNIQUE
  // but nullable (SQLite lets many NULLs coexist). The rebuild copies
  // every column the old table actually has; missing ones take defaults.
  // Runs once: afterwards email is already nullable and this is skipped.
  const emailCol = (
    database.prepare(`PRAGMA table_info(guests)`).all() as {
      name: string;
      notnull: number;
    }[]
  ).find((col) => col.name === "email");
  if (emailCol && emailCol.notnull === 1) {
    database.exec("ALTER TABLE guests RENAME TO guests_old");
    database.exec(GUEST_TABLE_SQL);
    const oldNames = (
      database.prepare(`PRAGMA table_info(guests_old)`).all() as {
        name: string;
      }[]
    ).map((col) => col.name);
    const wanted = [
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "attendance_status",
      "ticket_number",
      "qr_token",
      "is_sent",
      "ticket_sent_count",
      "accredited_at",
      "job_title",
      "company",
      "industry",
      "external_pass_id",
      "created_at",
      "updated_at",
    ];
    const shared = wanted.filter((name) => oldNames.includes(name));
    const list = shared.join(", ");
    database.exec(`INSERT INTO guests (${list}) SELECT ${list} FROM guests_old`);
    database.exec("DROP TABLE guests_old");
    database.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_external_pass_id ON guests(external_pass_id)"
    );
  }
  // Chunk 7 migration: older dev databases lack accredited_at.
  // PRAGMA table_info lists existing columns; ALTER only when missing.
  // No data is touched - existing rows simply get NULL (not accredited).
  const columns = database.prepare(`PRAGMA table_info(guests)`).all() as {
    name: string;
  }[];
  const hasColumn = (name: string): boolean =>
    columns.some((col) => col.name === name);
  if (!hasColumn("accredited_at")) {
    database.exec(ADD_ACCREDITED_AT_SQL);
  }
  // Registry integration: each column added only if missing (idempotent,
  // so a half-migrated DB from a crashed restart still recovers).
  // NOTE: SQLite forbids ALTER TABLE ... ADD COLUMN ... UNIQUE, so the
  // pass-id column is added plain and uniqueness comes from a separate
  // index (same guarantee, migration-safe).
  if (!hasColumn("job_title")) {
    database.exec("ALTER TABLE guests ADD COLUMN job_title TEXT");
  }
  if (!hasColumn("company")) {
    database.exec("ALTER TABLE guests ADD COLUMN company TEXT");
  }
  if (!hasColumn("industry")) {
    database.exec("ALTER TABLE guests ADD COLUMN industry TEXT");
  }
  if (!hasColumn("external_pass_id")) {
    database.exec("ALTER TABLE guests ADD COLUMN external_pass_id TEXT");
    database.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_external_pass_id ON guests(external_pass_id)"
    );
  }
  if (!hasColumn("ticket_sent_count")) {
    database.exec("ALTER TABLE guests ADD COLUMN ticket_sent_count INTEGER NOT NULL DEFAULT 0");
  }
  return database;
};

export const closeDb = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};
