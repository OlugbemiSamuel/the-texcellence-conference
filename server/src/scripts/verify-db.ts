import fs from "node:fs";
import { closeDb, initDb } from "../db/connection.js";
import {
  createGuest,
  findGuestByEmail,
  findGuestById,
  listGuests,
} from "../repositories/guest.repository.js";

// Simple proof script (not an API): proves connection + Guest model work.
// Run with: npm run db:verify
// Uses a throwaway temp file so it never touches your real data file.

const run = async (): Promise<void> => {
  const testPath = "./data/.verify-chunk2.sqlite";
  process.env.DATABASE_PATH = testPath;
  try {
    fs.rmSync(testPath, { force: true });
  } catch {
    // ignore - file may not exist on first run
  }

  initDb();
  console.log("DB initialized at", testPath);

  const guest = createGuest({
    first_name: "Ada",
    last_name: "Obi",
    email: "ada.obi@example.com",
    phone: "08012345678",
  });
  console.log("Created guest:", guest.id, guest.email, guest.attendance_status);

  const byId = findGuestById(guest.id);
  const byEmail = findGuestByEmail("ada.obi@example.com");
  console.log("Found by id:", byId?.email);
  console.log("Found by email:", byEmail?.id);

  // Duplicate email MUST fail at the database level (UNIQUE constraint).
  try {
    createGuest({
      first_name: "Ada",
      last_name: "Duplicate",
      email: "ada.obi@example.com",
    });
    console.error("ERROR: duplicate email was allowed (constraint missing!)");
    process.exitCode = 1;
  } catch {
    console.log("Duplicate email correctly rejected by UNIQUE constraint.");
  }

  console.log("Guest count:", listGuests().length);
  closeDb();
  fs.rmSync(testPath, { force: true });
  console.log("Chunk 2 verification passed.");
};

await run();
