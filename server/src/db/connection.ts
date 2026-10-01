import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { GUEST_TABLE_SQL } from "./schema.js";

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
  return database;
};

export const closeDb = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};
