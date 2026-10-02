// Simple HTTP errors so the service can throw MEANING
// and the Express error middleware can turn it into a clean JSON response.
// Learn: throwing replaces "return null and hope the caller checks".
// The error carries its own HTTP status, so app.ts needs no if/else chain.

export class HttpError extends Error {
  readonly statusCode: number;
  readonly title: string;

  constructor(statusCode: number, title: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.title = title;
  }
}

// 400 - the request body failed validation.
export class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, "Validation failed", message);
  }
}

// 401 - authentication failed or is missing.
export class UnauthorizedError extends HttpError {
  constructor(message = "Invalid credentials.") {
    super(401, "Unauthorized", message);
  }
}

// 404 - the requested resource does not exist.
export class NotFoundError extends HttpError {
  constructor(message = "Guest not found.") {
    super(404, "Not found", message);
  }
}
// 409 - a guest with this email already exists.
export class ConflictError extends HttpError {
  constructor(message = "A guest with this email already exists.") {
    super(409, "Guest already exists", message);
  }
}

// 502 - sending the email failed (SMTP is a downstream dependency).
// Message stays generic: never credentials, host details, or stack traces.
export class EmailError extends HttpError {
  constructor(message = "Could not send the RSVP email. Please try again later.") {
    super(502, "Email delivery failed", message);
  }
}
