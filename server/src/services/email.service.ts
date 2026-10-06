import nodemailer, { type Transporter } from "nodemailer";
import QRCode from "qrcode";
import type { Guest } from "../types/guest.types.js";
import { EmailError } from "../errors/http.error.js";

// Learn: this is the ONLY file that knows SMTP exists. The guest service
// decides WHO gets mail; this file decides HOW it is sent. Controllers
// never see hostnames, ports, or passwords.

// Event facts live here with the email that states them.
const CONFERENCE = {
  name: "The Texcellence Conference",
  theme: "Accelerating Africa's Digital Future",
  date: "13 October 2026",
  venue: "Landmark Event Centre",
} as const;

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
  const html =
    `<p>Hello ${guest.first_name} ${guest.last_name},</p>` +
    `<p>Your ticket for <strong>${CONFERENCE.name}</strong> is ready.</p>` +
    `<p>Ticket: <strong>${ticket}</strong><br />Date: ${CONFERENCE.date}<br />Venue: ${CONFERENCE.venue}</p>` +
    `<p><img src="cid:ticket-qr" alt="Ticket QR code" width="200" height="200" /></p>` +
    `<p>Show the attached QR code at the entrance. We look forward to seeing you.</p>`;
  return { subject, text, html };
};

// Pure content builders: no network, easy to test. Trailing slashes on
// PUBLIC_APP_URL are trimmed so we never emit "…//#/register".
export const registrationUrl = (): string => {
  const base = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/+$/, "");
  return `${base}/#/register`;
};

// Deep link encoded in ticket QRs: <origin>/#/accredit?token=<qr>.
// Same value the TicketModal renders, so phone cameras open the desk.
export const accreditUrl = (qrToken: string): string => {
  const base = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/+$/, "");
  return `${base}/#/accredit?token=${encodeURIComponent(qrToken)}`;
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
  const html =
    `<p>Hello ${guest.first_name} ${guest.last_name},</p>` +
    `<p>You are invited to <strong>${CONFERENCE.name}</strong> - ${CONFERENCE.theme}.</p>` +
    `<p>Date: ${CONFERENCE.date}<br />Venue: ${CONFERENCE.venue}</p>` +
    `<p><a href="${link}">Complete your registration here</a>.</p>` +
    `<p>We look forward to seeing you.</p>`;
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
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || "noreply@texcellence.example",
      to: guest.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
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
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || "noreply@texcellence.example",
      to: guest.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      attachments: [{ filename: "ticket-qr.png", content: qrPng, cid: "ticket-qr" }],
    });
  } catch (err) {
    console.error(`Ticket email failed for guest ${guest.id}:`, (err as Error).message);
    throw new EmailError();
  }
};
