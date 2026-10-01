import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../errors/http.error.js";
import type { LoginBody } from "../types/auth.types.js";
import { login } from "../services/auth.service.js";

// Learn: same receptionist pattern as the guest controller.
// loginHandler answers 200 + { token }. meHandler answers 200 with ONLY
// the safe admin info the middleware attached - never password or secret.

export const loginHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    res.json(login(req.body as LoginBody));
  } catch (err) {
    next(err);
  }
};

export const meHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // requireAuth runs before this handler and guarantees req.admin.
    // If it is somehow missing, fail closed with 401 - never a fake 200.
    if (!req.admin) {
      throw new UnauthorizedError("Authentication required.");
    }
    res.json({ email: req.admin.email, role: req.admin.role });
  } catch (err) {
    next(err);
  }
};
