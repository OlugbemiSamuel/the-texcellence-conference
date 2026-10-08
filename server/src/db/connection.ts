import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { ADD_ACCREDITED_AT_SQL, ADD_EXTERNAL_COLUMNS_SQL, GUEST_TABLE_SQL } from "./schema.js";

// Learn: connection = the open door to the database file.
// We keep ONE shared connection (singleton), like one register book
// on the reception desk that everyone writes in, not a new book per person.

let db: Database.Database | null = null;

const resolveDbPath = (): string => {
  const configured = process.env.DATABASE_PATH || "./data/texcellence.sqlite";
  return path.resolve(process.cwd(), configured);
};

export const getDb = (): Database.Database => {
  if (db) return db;
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  return db;
};

// Creates tables if they do not exist. Safe to run on every startup.
export const initDb = (): Database.Database => {
  const database = getDb();
  database.exec(GUEST_TABLE_SQL);
  // Chunk 7 migration: older dev databases lack accredited_at.
  // PRAGMA table_info lists existing columns; ALTER only when missing.
  // No data is touched - existing rows simply get NULL (not accredited).
  const columns = database.prepare(`PRAGMA table_info(guests)`).all() as { name: string }[];
  const hasColumn = (name: string): boolean => columns.some((col) => col.name === name);
  if (!hasColumn("accredited_at")) {
    database.exec(ADD_ACCREDITED_AT_SQL);
  }
  // Registry integration: one statement per column (SQLite runs them in order).
  if (!hasColumn("job_title") || !hasColumn("company") || !hasColumn("external_pass_id")) {
    for (const statement of ADD_EXTERNAL_COLUMNS_SQL.split(";")) {
      if (statement.trim()) database.exec(statement);
    }
  }
  return database;
};

export const closeDb = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};
