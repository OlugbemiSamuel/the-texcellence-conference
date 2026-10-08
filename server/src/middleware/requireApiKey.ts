import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../errors/http.error.js";

// Learn: machine-to-machine auth. Their server cannot log in like a human
// (no browser, no login page), so it presents a long random API key in the
// x-api-key header instead. Keys live in EXTERNAL_API_KEYS (comma-separated)
// and never in code. Wrong/missing key -> 401, same as a bad JWT.
const loadKeys = (): string[] => {
  const raw = process.env.EXTERNAL_API_KEYS || "";
  return raw
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
};

export const requireApiKey = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const presented = req.header("x-api-key")?.trim() ?? "";
    const keys = loadKeys();
    if (!presented || !keys.includes(presented)) {
      throw new UnauthorizedError("Invalid API key.");
    }
    next();
  } catch (err) {
    next(err);
  }
};
