import {
  accreditGuestById,
  createGuest,
  findGuestByEmail,
  findGuestById,
  findGuestByPassId,
  findGuestByQrToken,
  generateTicketCredentials,
  listGuests,
  markRsvpSent,
  searchGuests as findGuestsByQuery,
  updateGuestById as persistGuestUpdate,
} from "../repositories/guest.repository.js";
import type {
  AttendanceStatus,
  CreateGuestInput,
  Guest,
  PublicRegistrationBody,
  RegisterGuestBody,
  UpdateGuestBody,
  UpdateGuestInput,
} from "../types/guest.types.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../errors/http.error.js";
import { sendRsvpEmail, sendTicketEmail } from "./email.service.js";
import type { Transporter } from "nodemailer";

// Learn: service = the supervisor. It never touches the register book (SQL)
// and never talks HTTP. It enforces business rules: valid input, clean
// values, no duplicate email. The controller handles HTTP; the repository
// handles SQL; this file handles "is this request acceptable?"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ATTENDANCE_VALUES: AttendanceStatus[] = ["pending", "yes", "no"];

// System-managed fields clients must never write. If any appear in a
// PATCH body we reject with 400 rather than silently ignoring them,
// so the caller learns the rule instead of thinking the write worked.
const PROTECTED_FIELDS = [
  "id",
  "ticket_number",
  "qr_token",
  "is_sent",
  "created_at",
  "updated_at",
] as const;

const readField = (body: Record<string, unknown>, field: string): unknown => {
  return body[field];
};

// Shared validators. registerGuest, updateGuestById and the CSV import
// all use these, so the rules live in ONE place and cannot drift apart.

export const normalizeFirstName = (raw: unknown): string => {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new ValidationError("first_name is required");
  }
  return raw.trim();
};

export const normalizeLastName = (raw: unknown): string => {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new ValidationError("last_name is required");
  }
  return raw.trim();
};

export const normalizeEmail = (raw: unknown): string => {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new ValidationError("email is required");
  }
  const email = raw.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError("email must be a valid email address");
  }
  return email;
};

export const normalizePhone = (raw: unknown): string | null => {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    throw new ValidationError("phone must be a string");
  }
  return raw.trim() === "" ? null : raw.trim();
};

export const normalizeAttendance = (raw: unknown): AttendanceStatus => {
  if (typeof raw !== "string" || !ATTENDANCE_VALUES.includes(raw as AttendanceStatus)) {
    throw new ValidationError("attendance_status must be one of: pending, yes, no");
  }
  return raw as AttendanceStatus;
};

// URL ids arrive as strings ("3"). Accept numeric strings and numbers,
// reject everything else (abc, 3.5, -1, empty) with a 400.
const parseGuestId = (rawId: unknown): number => {
  const id = typeof rawId === "string" && rawId.trim() !== "" ? Number(rawId) : rawId;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    throw new ValidationError("guest id must be a positive integer");
  }
  return id;
};

export const registerGuest = (body: RegisterGuestBody): Guest => {
  const record = body as Record<string, unknown>;
  const input: CreateGuestInput = {
    first_name: normalizeFirstName(readField(record, "first_name")),
    last_name: normalizeLastName(readField(record, "last_name")),
    email: normalizeEmail(readField(record, "email")),
    phone: normalizePhone(readField(record, "phone")),
  };

  // Friendly duplicate check for a clear 409 message.
  // The UNIQUE constraint in SQLite stays the final guard (race safety):
  // if two requests slip past this check at the same instant,
  // the database still rejects the second one.
  if (findGuestByEmail(input.email)) {
    throw new ConflictError();
  }

  try {
    return createGuest(input);
  } catch (err) {
    // Never leak raw SQLite text ("UNIQUE constraint failed...") to clients.
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      throw new ConflictError();
    }
    throw err;
  }
};

export const getGuests = (): Guest[] => {
  return listGuests();
};

// QR tokens are 64 hex chars (32 random bytes). Anything else is rejected
// BEFORE touching the database. Unknown-but-valid tokens are 404, the
// same "not found" the rest of the API uses. Lookup never accredits.
const QR_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export const getGuestByQrToken = (rawToken: unknown): Guest => {
  if (typeof rawToken !== "string" || rawToken.trim() === "") {
    throw new ValidationError("QR token is required");
  }
  const token = rawToken.trim().toLowerCase();
  if (!QR_TOKEN_PATTERN.test(token)) {
    throw new ValidationError("QR token is invalid");
  }
  const guest = findGuestByQrToken(token);
  if (!guest) {
    throw new NotFoundError("Guest not found for this QR code.");
  }
  return guest;
};

// Accreditation-desk search: short/blank input returns [] (a calm empty
// result, not an error). Email is lowercased before matching, consistent
// with how registration normalizes stored emails.
export const searchGuests = (rawQuery: unknown): Guest[] => {
  if (typeof rawQuery !== "string") return [];
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];
  return findGuestsByQuery(query);
};

// Public registration (no login needed): create-or-update by email.
// New email -> 201 with a fresh guest. Known email -> 200 updating ONLY
// the 5 registration fields, so ticket_number, qr_token and accredited_at
// survive untouched (persistGuestUpdate cannot write those columns).
export const submitPublicRegistration = async (
  body: PublicRegistrationBody
): Promise<{ guest: Guest; created: boolean }> => {
  const record = body as Record<string, unknown>;
  const first_name = normalizeFirstName(readField(record, "first_name"));
  const last_name = normalizeLastName(readField(record, "last_name"));
  const email = normalizeEmail(readField(record, "email"));
  const phone = normalizePhone(readField(record, "phone"));
  const rawAttendance = readField(record, "attendance_status");
  // Public registration is a FINAL answer: only "yes" or "no".
  // "pending" means "not yet responded" (e.g. admin-created guests) and
  // must never be submitted here; missing/invalid values are rejected.
  // The frontend choice screen is convenience only - THIS is the boundary.
  if (rawAttendance === undefined || rawAttendance === null) {
    throw new ValidationError("attendance_status is required");
  }
  const attendance_status = normalizeAttendance(rawAttendance);
  if (attendance_status === "pending") {
    throw new ValidationError('attendance_status must be "yes" or "no"');
  }

  const existing = findGuestByEmail(email);
  // After persistence, the guest gets their ticket + QR by email so the
  // "check your email" message is true. Sending is best-effort: mail
  // failure is logged but never fails the registration itself.
  const mailTicket = async (guest: Guest): Promise<Guest> => {
    const ticketed = generateTicketCredentials(guest.id) ?? guest;
    try {
      await sendTicketEmail(ticketed);
    } catch (err) {
      console.error(`Registration email failed for guest ${guest.id}:`, (err as Error).message);
    }
    return ticketed;
  };
  if (existing) {
    const updated = persistGuestUpdate(existing.id, {
      first_name,
      last_name,
      email,
      phone,
      attendance_status,
    });
    // We just found it, so it must still be there; guard is for TypeScript.
    if (!updated) throw new NotFoundError();
    return { guest: await mailTicket(updated), created: false };
  }

  try {
    const created = createGuest({ first_name, last_name, email, phone, attendance_status });
    return { guest: await mailTicket(created), created: true };
  } catch (err) {
    if (!(err instanceof Error && err.message.includes("UNIQUE"))) throw err;
    // Race: someone registered this email a split second ago.
    // Fall through to the update path instead of erroring.
    const raced = findGuestByEmail(email);
    if (!raced) throw err;
    const updated = persistGuestUpdate(raced.id, {
      first_name,
      last_name,
      email,
      phone,
      attendance_status,
    });
    if (!updated) throw new NotFoundError();
    return { guest: await mailTicket(updated), created: false };
  }
};

export const getGuestById = (rawId: unknown): Guest => {
  const id = parseGuestId(rawId);
  const guest = findGuestById(id);
  if (!guest) {
    throw new NotFoundError();
  }
  return guest;
};

export const accreditGuest = (rawId: unknown): Guest => {
  const id = parseGuestId(rawId);
  const result = accreditGuestById(id);
  // The atomic UPDATE already decided the outcome; here we translate it
  // into HTTP meaning. Already-accredited keeps its ORIGINAL timestamp:
  // the repository never rewrites it, so the first stamp stands forever.
  if (result.status === "not_found") {
    throw new NotFoundError();
  }
  if (result.status === "already_accredited") {
    throw new ConflictError("This guest has already been accredited.");
  }
  return result.guest;
};

export const generateGuestTicket = (rawId: unknown): Guest => {
  const id = parseGuestId(rawId);
  const guest = generateTicketCredentials(id);
  if (!guest) {
    throw new NotFoundError();
  }
  return guest;
};

// Explicit admin action only: nothing sends mail automatically.
// is_sent flips to 1 strictly AFTER SMTP accepts the message;
// any failure leaves it untouched, so 1 always means "delivered".
// The optional transporter is a test seam: production passes none
// (real SMTP from env), tests inject a fake. Never user input.
export const sendGuestRsvp = async (
  rawId: unknown,
  transporter?: Transporter
): Promise<Guest> => {
  const id = parseGuestId(rawId);
  const guest = findGuestById(id);
  if (!guest) {
    throw new NotFoundError();
  }
  if (!guest.email || guest.email.trim() === "") {
    throw new ValidationError("Guest has no usable email address.");
  }
  await sendRsvpEmail(guest, transporter);
  const updated = markRsvpSent(id);
  if (!updated) {
    throw new NotFoundError();
  }
  return updated;
};

// Ticket email: ensures credentials exist first (idempotent), then mails
// the QR. Does NOT touch is_sent (that's RSVP-only).
export const sendGuestTicketEmail = async (
  rawId: unknown,
  transporter?: Transporter
): Promise<Guest> => {
  const id = parseGuestId(rawId);
  let guest = findGuestById(id);
  if (!guest) {
    throw new NotFoundError();
  }
  if (!guest.ticket_number || !guest.qr_token) {
    guest = generateTicketCredentials(id);
    if (!guest) {
      throw new NotFoundError();
    }
  }
  await sendTicketEmail(guest, transporter);
  return guest;
};

// External registry ingest (Texcellence team pushes their registrations).
// Upsert by email, same identity rule as public registration: new email
// creates (attendance "yes" - a completed registration on their side means
// attending), known email updates profile fields only. Ticket, QR,
// accreditation and is_sent are NEVER written here, so re-pushes cannot
// destroy accreditation state. external_pass_id collisions belonging to a
// DIFFERENT email are rejected loudly instead of silently merged.
export const ingestExternalGuest = (body: Record<string, unknown>): { guest: Guest; created: boolean } => {
  const first_name = normalizeFirstName(body["first_name"]);
  const last_name = normalizeLastName(body["last_name"]);
  const email = normalizeEmail(body["email"]);
  const phone = normalizePhone(body["phone"] ?? null);
  const job_title =
    body["job_title"] === undefined || body["job_title"] === null || body["job_title"] === ""
      ? null
      : String(body["job_title"]).trim();
  const company =
    body["company"] === undefined || body["company"] === null || body["company"] === ""
      ? null
      : String(body["company"]).trim();
  const rawPassId = body["external_pass_id"];
  const external_pass_id =
    rawPassId === undefined || rawPassId === null || String(rawPassId).trim() === ""
      ? null
      : String(rawPassId).trim();

  if (external_pass_id) {
    const passOwner = findGuestByPassId(external_pass_id);
    if (passOwner && passOwner.email !== email) {
      throw new ConflictError("This pass ID already belongs to another guest.");
    }
  }

  const existing = findGuestByEmail(email);
  if (existing) {
    const updated = persistGuestUpdate(existing.id, {
      first_name,
      last_name,
      email,
      phone,
      attendance_status: "yes",
      job_title,
      company,
      external_pass_id,
    });
    if (!updated) throw new NotFoundError();
    return { guest: updated, created: false };
  }

  try {
    return {
      guest: createGuest({
        first_name,
        last_name,
        email,
        phone,
        attendance_status: "yes",
        job_title,
        company,
        external_pass_id,
      }),
      created: true,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      // Race: same email (or pass ID) landed a split second ago.
      const raced = findGuestByEmail(email);
      if (raced) {
        const updated = persistGuestUpdate(raced.id, {
          first_name,
          last_name,
          email,
          phone,
          attendance_status: "yes",
          job_title,
          company,
          external_pass_id,
        });
        if (updated) return { guest: updated, created: false };
      }
      throw new ConflictError("Duplicate guest record.");
    }
    throw err;
  }
};

export const updateGuestById = (rawId: unknown, body: UpdateGuestBody): Guest => {
  const id = parseGuestId(rawId);
  const record = body as Record<string, unknown>;

  // Reject system fields loudly instead of ignoring them.
  for (const field of PROTECTED_FIELDS) {
    if (record[field] !== undefined) {
      throw new ValidationError(`${field} cannot be updated`);
    }
  }

  const existing = findGuestById(id);
  if (!existing) {
    throw new NotFoundError();
  }

  // PATCH = partial: only validate + include fields the client sent.
  // Sending nothing updatable is a 400, not a silent no-op.
  const patch: UpdateGuestInput = {};
  if (record["first_name"] !== undefined) {
    patch.first_name = normalizeFirstName(record["first_name"]);
  }
  if (record["last_name"] !== undefined) {
    patch.last_name = normalizeLastName(record["last_name"]);
  }
  if (record["email"] !== undefined) {
    const email = normalizeEmail(record["email"]);
    const owner = findGuestByEmail(email);
    if (owner && owner.id !== id) {
      throw new ConflictError();
    }
    patch.email = email;
  }
  if (record["phone"] !== undefined) {
    patch.phone = normalizePhone(record["phone"]);
  }
  if (record["attendance_status"] !== undefined) {
    patch.attendance_status = normalizeAttendance(record["attendance_status"]);
  }
  if (Object.keys(patch).length === 0) {
    throw new ValidationError("no updatable fields provided");
  }

  try {
    const updated = persistGuestUpdate(id, patch);
    if (!updated) {
      throw new NotFoundError();
    }
    return updated;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      throw new ConflictError();
    }
    throw err;
  }
};
