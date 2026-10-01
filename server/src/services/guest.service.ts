import {
  createGuest,
  findGuestByEmail,
} from "../repositories/guest.repository.js";
import type {
  CreateGuestInput,
  Guest,
  RegisterGuestBody,
} from "../types/guest.types.js";
import { ConflictError, ValidationError } from "../errors/http.error.js";

// Learn: service = the supervisor. It never touches the register book (SQL)
// and never talks HTTP. It enforces business rules: valid input, clean
// values, no duplicate email. The controller handles HTTP; the repository
// handles SQL; this file handles "is this registration acceptable?"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const readStringField = (body: RegisterGuestBody, field: "first_name" | "last_name" | "email" | "phone"): unknown => {
  return (body as Record<string, unknown>)[field];
};

export const registerGuest = (body: RegisterGuestBody): Guest => {
  // first_name: required, non-empty string.
  const rawFirstName = readStringField(body, "first_name");
  if (typeof rawFirstName !== "string" || rawFirstName.trim() === "") {
    throw new ValidationError("first_name is required");
  }

  // last_name: required, non-empty string.
  const rawLastName = readStringField(body, "last_name");
  if (typeof rawLastName !== "string" || rawLastName.trim() === "") {
    throw new ValidationError("last_name is required");
  }

  // email: required, trimmed + lowercased so Ada@X.com and ada@x.com
  // are treated as the same guest. Basic format check only on purpose:
  // a short clear regex beats a 500-character "perfect" one nobody can read.
  const rawEmail = readStringField(body, "email");
  if (typeof rawEmail !== "string" || rawEmail.trim() === "") {
    throw new ValidationError("email is required");
  }
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError("email must be a valid email address");
  }

  // phone: optional. Missing -> null. Wrong type -> 400. Empty string -> null.
  const rawPhone = readStringField(body, "phone");
  let phone: string | null = null;
  if (rawPhone !== undefined && rawPhone !== null) {
    if (typeof rawPhone !== "string") {
      throw new ValidationError("phone must be a string");
    }
    phone = rawPhone.trim() === "" ? null : rawPhone.trim();
  }

  const input: CreateGuestInput = {
    first_name: (rawFirstName as string).trim(),
    last_name: (rawLastName as string).trim(),
    email,
    phone,
  };

  // Friendly duplicate check for a clear 409 message.
  // The UNIQUE constraint in SQLite stays the final guard (race safety):
  // if two requests slip past this check at the same instant,
  // the database still rejects the second one.
  if (findGuestByEmail(email)) {
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
