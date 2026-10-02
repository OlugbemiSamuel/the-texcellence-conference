import nodemailer, { type Transporter } from "nodemailer";
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

// Pure content builder: no network, easy to test. Trailing slashes on
// PUBLIC_APP_URL are trimmed so we never emit "…//#/register".
export const registrationUrl = (): string => {
  const base = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/+$/, "");
  return `${base}/#/register`;
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
