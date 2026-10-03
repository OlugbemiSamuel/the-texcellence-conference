import fs from "node:fs";
import { closeDb, initDb } from "../db/connection.js";
import { findGuestByEmail } from "../repositories/guest.repository.js";
import { createGuest } from "../repositories/guest.repository.js";
import { generateTicketCredentials } from "../repositories/guest.repository.js";
import { accreditGuestById } from "../repositories/guest.repository.js";
import { importGuestsFromCsv } from "../services/csv-import.service.js";

// Chunk CSV-import proof on a throwaway DB. Run with: npm run csv:verify

const check = (name: string, ok: boolean): void => {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  if (!ok) process.exitCode = 1;
};

const run = (): void => {
  const testPath = "./data/.verify-csv-import.sqlite";
  process.env.DATABASE_PATH = testPath;
  try {
    fs.rmSync(testPath, { force: true });
  } catch {
    // ignore - first run has no file
  }
  initDb();

  // 1. valid CSV, all new.
  const r1 = importGuestsFromCsv(
    "first_name,last_name,email,phone,attendance_status\nAda,Obi,ada@example.com,08011111111,yes\nTunde,Ade,tunde@example.com,,no\n"
  );
  check("1 new guests created", r1.created === 2 && r1.updated === 0 && r1.skipped === 0 && r1.processed === 2);

  // Pre-arm guest 1 with ticket + accreditation for preservation tests.
  generateTicketCredentials(1);
  accreditGuestById(1);
  const before = findGuestByEmail("ada@example.com");
  check("armed ticket+stamp", !!before?.ticket_number && !!before?.qr_token && !!before?.accredited_at);

  // 2/3. existing email updates + in-file duplicate (last wins, reported).
  const r2 = importGuestsFromCsv(
    "first_name,last_name,email,phone,attendance_status\nAda,Obi,ada@example.com,08099999999,no\nAda,X,ada@example.com,,yes\n"
  );
  check("2 existing email updated not duplicated", r2.updated === 1 && r2.created === 0);
  check("3 in-file duplicate reported, last wins", r2.skipped === 1 && r2.errors.length === 1);
  const ada = findGuestByEmail("ada@example.com");
  check("last row won", ada?.last_name === "X" && ada?.attendance_status === "yes");

  // 9-13. protected state preserved through updates.
  check("9 ticket preserved", ada?.ticket_number === before?.ticket_number);
  check("10 qr preserved", ada?.qr_token === before?.qr_token);
  check("11 accreditation preserved", ada?.accredited_at === before?.accredited_at);
  check("12 is_sent preserved", ada?.is_sent === 0);
  check("created_at preserved", ada?.created_at === before?.created_at);

  // 4-8. row-level rejections, each reported with its row number.
  const r3 = importGuestsFromCsv(
    "first_name,last_name,email,phone,attendance_status\n" +
      "A,B,not-an-email,,yes\n" +
      ",B,noname1@example.com,,yes\n" +
      "A,,noname2@example.com,,yes\n" +
      "A,B,,,yes\n" +
      "A,B,maybe@example.com,,maybe\n"
  );
  check("4-8 all bad rows skipped", r3.created === 0 && r3.updated === 0 && r3.skipped === 5 && r3.errors.length === 5);
  check("row numbers reported", r3.errors.every((e) => e.row >= 2));

  // Pending rejected in import (explicit final answer required).
  const r4 = importGuestsFromCsv("first_name,last_name,email,phone,attendance_status\nA,B,pend@example.com,,pending\n");
  check("pending rejected", r4.skipped === 1 && r4.created === 0);

  // Protected + unknown columns rejected at the header.
  try {
    importGuestsFromCsv("first_name,last_name,email,is_sent\nA,B,x@example.com,1\n");
    check("protected column rejected", false);
  } catch {
    check("protected column rejected", true);
  }
  try {
    importGuestsFromCsv("first_name,last_name,email,nickname\nA,B,y@example.com,Z\n");
    check("unknown column rejected", false);
  } catch {
    check("unknown column rejected", true);
  }

  // Header + empty body validation.
  try {
    importGuestsFromCsv("first_name,last_name,email\n");
    check("empty body rejected", false);
  } catch {
    check("empty body rejected", true);
  }

  closeDb();
  fs.rmSync(testPath, { force: true });
  console.log("CSV import verification done.");
};

run();
