import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../errors/http.error.js";
import { verifyToken } from "../services/auth.service.js";

// Learn: middleware = the security guard on the corridor. It runs BEFORE
// the controller, checks the visitor's stamp (Bearer token), and either
// lets them through with req.admin attached or turns them away with 401.
// Routes opt in by listing this function before their handler.

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const header = req.headers.authorization;
    // Exact shape required: "Bearer <token>". Anything else is turned away.
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authentication required.");
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedError("Authentication required.");
    }
    req.admin = verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
};
