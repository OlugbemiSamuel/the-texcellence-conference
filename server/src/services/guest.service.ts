import {
  accreditGuestById,
  createGuest,
  findGuestByEmail,
  findGuestById,
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
import { sendRsvpEmail } from "./email.service.js";
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

// Shared validators. registerGuest and updateGuestById both use these,
// so the rules live in ONE place and cannot drift apart.

const normalizeFirstName = (raw: unknown): string => {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new ValidationError("first_name is required");
  }
  return raw.trim();
};

const normalizeLastName = (raw: unknown): string => {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new ValidationError("last_name is required");
  }
  return raw.trim();
};

const normalizeEmail = (raw: unknown): string => {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new ValidationError("email is required");
  }
  const email = raw.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError("email must be a valid email address");
  }
  return email;
};

const normalizePhone = (raw: unknown): string | null => {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    throw new ValidationError("phone must be a string");
  }
  return raw.trim() === "" ? null : raw.trim();
};

const normalizeAttendance = (raw: unknown): AttendanceStatus => {
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
export const submitPublicRegistration = (
  body: PublicRegistrationBody
): { guest: Guest; created: boolean } => {
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
    return { guest: updated, created: false };
  }

  try {
    return {
      guest: createGuest({ first_name, last_name, email, phone, attendance_status }),
      created: true,
    };
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
    return { guest: updated, created: false };
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
