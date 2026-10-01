import { timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import type {
  AuthAdmin,
  LoginBody,
  LoginResponse,
} from "../types/auth.types.js";
import { UnauthorizedError, ValidationError } from "../errors/http.error.js";

// Learn: this service is the bouncer. It checks the ID at the door
// (validates + compares credentials) and stamps hands (signs a JWT).
// It never touches HTTP and never touches SQL - credentials live in
// environment variables, not in a database table (Chunk 5 scope).

const TOKEN_EXPIRY = "12h";

const readEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    // A missing secret is OUR deployment bug, not the client's fault.
    // Throw a plain Error so app.ts answers generic 500 without
    // revealing which variable is missing.
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

// Compares passwords without leaking timing hints. A normal === check
// quits at the first wrong character, so an attacker timing responses
// could guess the password letter by letter. timingSafeEqual always
// takes the same time. (Length check first: it refuses unequal lengths.)
const isPasswordValid = (provided: string, expected: string): boolean => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

export const login = (body: LoginBody): LoginResponse => {
  const record = body as Record<string, unknown>;

  const rawEmail = record["email"];
  if (typeof rawEmail !== "string" || rawEmail.trim() === "") {
    throw new ValidationError("email is required");
  }
  const rawPassword = record["password"];
  if (typeof rawPassword !== "string" || rawPassword === "") {
    throw new ValidationError("password is required");
  }

  const email = rawEmail.trim().toLowerCase();
  const adminEmail = readEnv("ADMIN_EMAIL").trim().toLowerCase();
  const adminPassword = readEnv("ADMIN_PASSWORD");
  const emailMatches = email === adminEmail;

  // One generic 401 whether the email or the password was wrong.
  // Saying "wrong password" would confirm the email exists (user lookup).
  if (!emailMatches || !isPasswordValid(rawPassword, adminPassword)) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  // Payload stays minimal: who (email) + what (role). No password, ever.
  const admin: AuthAdmin = { email: adminEmail, role: "admin" };
  const token = jwt.sign(
    { sub: admin.email, role: admin.role },
    readEnv("JWT_SECRET"),
    { expiresIn: TOKEN_EXPIRY }
  );
  return { token };
};

// Shared by the middleware: one place that knows how tokens are verified.
export const verifyToken = (token: string): AuthAdmin => {
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, readEnv("JWT_SECRET"));
  } catch {
    throw new UnauthorizedError("Invalid or expired token.");
  }
  if (typeof decoded === "string" || decoded.sub === undefined) {
    throw new UnauthorizedError("Invalid or expired token.");
  }
  return { email: decoded.sub, role: "admin" };
};
