import fs from "node:fs";
import type { Transporter } from "nodemailer";
import { closeDb, initDb } from "../db/connection.js";
import { findGuestById } from "../repositories/guest.repository.js";
import { createGuest } from "../repositories/guest.repository.js";
import {
  buildRsvpEmail,
  registrationUrl,
  sendRsvpEmail,
} from "../services/email.service.js";
import { sendGuestRsvp } from "../services/guest.service.js";
import { EmailError } from "../errors/http.error.js";

// Chunk 8 proof without real SMTP: fake transporters stand in for the
// mail server, so no mailbox is needed. Run with: npm run email:verify
// Uses a throwaway temp file, never the real data file.

// A fake only needs sendMail to be useful; the cast below is contained
// to this test file (production code stays fully typed).
const asTransporter = (fake: {
  sendMail: (mail: { to: string; subject: string }) => Promise<{ messageId: string }>;
}): Transporter => fake as unknown as Transporter;

const sent: { to: string; subject: string }[] = [];
const workingTransporter = asTransporter({
  sendMail: async (mail) => {
    sent.push({ to: mail.to, subject: mail.subject });
    return { messageId: "fake-1" };
  },
});

const failingTransporter = asTransporter({
  sendMail: async () => {
    throw new Error("SMTP connection refused (simulated)");
  },
});

const check = (name: string, ok: boolean): void => {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  if (!ok) process.exitCode = 1;
};

const run = async (): Promise<void> => {
  const testPath = "./data/.verify-chunk8-email.sqlite";
  process.env.DATABASE_PATH = testPath;
  process.env.PUBLIC_APP_URL = "http://localhost:5173/";
  try {
    fs.rmSync(testPath, { force: true });
  } catch {
    // ignore - first run has no file
  }
  initDb();

  const guest = createGuest({
    first_name: "Ada",
    last_name: "Obi",
    email: "ada.obi@example.com",
  });

  // Content: name, conference, theme, date, venue, link (slash-trimmed).
  const content = buildRsvpEmail(guest);
  check("subject names conference", content.subject.includes("Texcellence"));
  check("body greets guest", content.text.includes("Ada Obi"));
  check("body has theme", content.text.includes("Accelerating Africa's Digital Future"));
  check("body has date", content.text.includes("13 October 2026"));
  check("body has venue", content.text.includes("Landmark Event Centre"));
  check("link has no double slash", registrationUrl() === "http://localhost:5173/register");
  check("body has link", content.text.includes("http://localhost:5173/register"));

  // Success through the real service: mail accepted -> is_sent becomes 1.
  const mailed = await sendGuestRsvp(guest.id, workingTransporter);
  check("fake SMTP accepted mail", sent.length === 1 && sent[0].to === "ada.obi@example.com");
  check("is_sent becomes 1 on success", mailed.is_sent === 1);

  // Failure through the real service: safe error, is_sent untouched.
  const guest2 = createGuest({
    first_name: "Tunde",
    last_name: "Ade",
    email: "tunde@example.com",
  });
  try {
    await sendGuestRsvp(guest2.id, failingTransporter);
    check("failing SMTP throws", false);
  } catch (err) {
    check("failing SMTP throws EmailError", err instanceof EmailError);
    const leaked =
      JSON.stringify(err).includes("refused") || JSON.stringify(err).includes("test-secret");
    check("error hides SMTP internals", !leaked);
  }
  const untouched = findGuestById(guest2.id);
  check("is_sent stays 0 on failure", untouched?.is_sent === 0);

  // Direct sendMail failure also stays safe (service layer below it).
  try {
    await sendRsvpEmail(guest2, failingTransporter);
    check("direct send failure throws", false);
  } catch (err) {
    check("direct send failure is EmailError", err instanceof EmailError);
  }

  closeDb();
  fs.rmSync(testPath, { force: true });
  console.log("Chunk 8 email verification done.");
};

await run();
