import nodemailer, { type Transporter } from "nodemailer";
import QRCode from "qrcode";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Guest } from "../types/guest.types.js";
import { EmailError } from "../errors/http.error.js";

// Learn: this is the ONLY file that knows SMTP exists. The guest service
// decides WHO gets mail; this file decides HOW it is sent. Controllers
// never see hostnames, ports, or passwords.

// Event facts live here with the emails that state them.
const CONFERENCE = {
  name: "The Texcellence Conference",
  theme: "Accelerating Africa's Digital Future",
  date: "Tuesday, 13 October 2026",
  venue: "Landmark Event Centre",
  navy: "#26225e",
  gold: "#c9962e",
} as const;

// Flyer filename as stored under server/public (shipped in the deploy).
const FLYER_FILE = "flyer.jpg";

// The banner rides INSIDE the email as an inline attachment, so it shows
// even when the reader's mail client blocks remote images.
const readFlyerBuffer = async (): Promise<Buffer | null> => {
  try {
    return await readFile(path.join(process.cwd(), "public", FLYER_FILE));
  } catch {
    return null;
  }
};
// flyer banner, gold divider, content, navy footer. Both RSVP and ticket
// emails render inside this so every guest mail looks like Texcellence.
// Shared branded shell (table layout + inline styles for mail clients):
// flyer banner first, gold divider, navy section bar, warm content,
// navy footer. Both RSVP and ticket emails render inside this.
const emailShell = (title: string, bodyHtml: string): string => {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f2f2; padding:24px 0;">` +
    `<tr><td align="center">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#ffffff; margin:0 auto;">` +
    `<tr><td style="padding:0; background-color:${CONFERENCE.navy};">` +
    `<img src="cid:texcellence-flyer" alt="${CONFERENCE.name} - ${CONFERENCE.theme}" width="600" style="display:block; width:100%; max-width:100%; height:auto; border:0; color:#ffffff; font-size:16px; font-weight:bold; text-align:center;" />` +
    `</td></tr>` +
    `<tr><td style="height:6px; background-color:${CONFERENCE.gold}; font-size:0; line-height:0;">&nbsp;</td></tr>` +
    `<tr><td style="padding:0 32px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td align="center" style="background-color:${CONFERENCE.navy}; padding:12px 16px;">` +
    `<p style="margin:0; color:#ffffff; font-size:14px; font-weight:bold; text-align:center; letter-spacing:.4px;">${title}</p>` +
    `</td></tr></table></td></tr>` +
    `<tr><td style="padding:8px 32px 12px 32px; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.6; color:#222222;">${bodyHtml}</td></tr>` +
    `<tr><td style="background-color:${CONFERENCE.navy}; padding:18px 32px;">` +
    `<p style="margin:0; text-align:center; color:#ffffff; font-size:13px; font-weight:bold;">${CONFERENCE.name.toUpperCase()}</p>` +
    `<p style="margin:6px 0 0 0; text-align:center; color:#dddddd; font-size:11px;">${CONFERENCE.date} &nbsp;•&nbsp; ${CONFERENCE.venue}</p>` +
    `</td></tr>` +
    `</table></td></tr></table>`
  );
};

export interface RsvpEmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface TicketEmailContent {
  subject: string;
  text: string;
  html: string;
}

export const buildTicketEmail = (guest: Guest): TicketEmailContent => {
  const ticket = guest.ticket_number ?? "";
  const subject = `Your ${CONFERENCE.name} ticket: ${ticket}`;
  const text =
    `Hello ${guest.first_name} ${guest.last_name},\n\n` +
    `Your ticket for ${CONFERENCE.name} is ready.\n` +
    `Ticket: ${ticket}\n` +
    `Date: ${CONFERENCE.date}\n` +
    `Venue: ${CONFERENCE.venue}\n\n` +
    `Show the attached QR code at the entrance. We look forward to seeing you.`;
  const html = emailShell(
    `YOUR TICKET IS READY`,
    `<p>Dear ${guest.first_name} ${guest.last_name},</p>` +
    `<p>Great news — your registration for <strong>${CONFERENCE.name}</strong> is confirmed, and your personal entry ticket is below. We can't wait to welcome you!</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f3fb; border:1px solid #e2ddf0;">` +
    `<tr><td align="center" style="padding:16px 12px;">` +
    `<p style="margin:0 0 4px 0; font-size:11px; color:#555555;">TICKET</p>` +
    `<p style="margin:0 0 10px 0; font-size:18px; font-weight:bold; color:${CONFERENCE.navy};">${ticket}</p>` +
    `<img src="cid:ticket-qr" alt="Ticket QR code" width="180" height="180" style="display:block; border:0; margin:0 auto; background:#ffffff; padding:8px;" />` +
    `<p style="margin:10px 0 0 0; font-size:11px; color:#555555;">${CONFERENCE.date} &nbsp;•&nbsp; ${CONFERENCE.venue}</p>` +
    `</td></tr></table>` +
    `<p>Please show this QR code at the entrance on event day. Keep it handy — it's your key in.</p>` +
    `<p>See you there!</p>`
  );
  return { subject, text, html };
};

// Pure content builders: no network, easy to test. Trailing slashes on
// PUBLIC_APP_URL are trimmed so we never emit double slashes. Plain
// paths (no #) match the app's router - hash links would land on Home.
export const registrationUrl = (): string => {
  const base = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/+$/, "");
  return `${base}/register`;
};

// Deep link encoded in ticket QRs: <origin>/accredit?token=<qr>.
// Same value the TicketModal renders, so phone cameras open the desk.
export const accreditUrl = (qrToken: string): string => {
  const base = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/+$/, "");
  return `${base}/accredit?token=${encodeURIComponent(qrToken)}`;
};

export const buildRsvpEmail = (guest: Guest): RsvpEmailContent => {
  const link = registrationUrl();
  const subject = `You're invited: ${CONFERENCE.name}`;
  const text =
    `Hello ${guest.first_name} ${guest.last_name},\n\n` +
    `You are invited to ${CONFERENCE.name} - ${CONFERENCE.theme}.\n` +
    `Date: ${CONFERENCE.date}\n` +
    `Venue: ${CONFERENCE.venue}\n\n` +
    `Please complete your registration here:\n${link}\n\n` +
    `We look forward to seeing you.`;
  const html = emailShell(
    `YOU'RE INVITED`,
    `<p>Dear ${guest.first_name} ${guest.last_name},</p>` +
    `<p>You're warmly invited to <strong>${CONFERENCE.name}</strong> - ${CONFERENCE.theme}.</p>` +
    `<p>Join us on <strong>${CONFERENCE.date}</strong> at <strong>${CONFERENCE.venue}</strong> for a day of ideas, connections, and inspiration.</p>` +
    `<p><a href="${link}" style="display:inline-block; background-color:${CONFERENCE.gold}; color:#ffffff; text-decoration:none; font-weight:bold; padding:12px 24px; border-radius:6px;">Complete your registration</a></p>` +
    `<p>It takes less than a minute, and your entry QR code will arrive by email right after. We look forward to welcoming you!</p>`
  );
  return { subject, text, html };
};

const createTransporter = (): Transporter => {
  const host = process.env.SMTP_HOST;
  if (!host) {
    throw new EmailError("Email sending is not configured.");
  }
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });
};

// Transporter is injectable so tests pass a fake instead of real SMTP.
// Only SMTP_HOST absence is checked here; auth failures surface from
// sendMail below and are converted to the same safe EmailError.
export const sendRsvpEmail = async (
  guest: Guest,
  transporter?: Transporter
): Promise<void> => {
  if (!guest.email || guest.email.trim() === "") {
    throw new EmailError("Guest has no usable email address.");
  }
  const mailer = transporter ?? createTransporter();
  const content = buildRsvpEmail(guest);
  const flyer = await readFlyerBuffer();
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || "noreply@texcellence.example",
      to: guest.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      attachments: flyer
        ? [{ filename: "texcellence-flyer.jpg", content: flyer, cid: "texcellence-flyer" }]
        : [],
    });
  } catch (err) {
    // Diagnostic goes to server logs only (host, never credentials).
    console.error(`RSVP email failed for guest ${guest.id}:`, (err as Error).message);
    throw new EmailError();
  }
};

// Ticket email with the QR code attached AND inline. Requires credentials
// to exist; the service ensures them before calling (idempotent).
export const sendTicketEmail = async (
  guest: Guest,
  transporter?: Transporter
): Promise<void> => {
  if (!guest.email || guest.email.trim() === "") {
    throw new EmailError("Guest has no usable email address.");
  }
  if (!guest.qr_token || !guest.ticket_number) {
    throw new EmailError("Guest has no ticket yet.");
  }
  const mailer = transporter ?? createTransporter();
  const content = buildTicketEmail(guest);
  const qrPng = await QRCode.toBuffer(accreditUrl(guest.qr_token), { width: 400 });
  const flyer = await readFlyerBuffer();
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || "noreply@texcellence.example",
      to: guest.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      attachments: [
        { filename: "ticket-qr.png", content: qrPng, cid: "ticket-qr" },
        ...(flyer ? [{ filename: "texcellence-flyer.jpg", content: flyer, cid: "texcellence-flyer" }] : []),
      ],
    });
  } catch (err) {
    console.error(`Ticket email failed for guest ${guest.id}:`, (err as Error).message);
    throw new EmailError();
  }
};
