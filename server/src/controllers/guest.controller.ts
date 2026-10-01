import type { NextFunction, Request, Response } from "express";
import type { RegisterGuestBody } from "../types/guest.types.js";
import { registerGuest } from "../services/guest.service.js";

// Learn: controller = the receptionist. It speaks HTTP only:
// read req.body, ask the service, send the response.
// No SQL here, no validation rules here. Unexpected errors go to
// next(err) so the central error middleware in app.ts answers them.

export const registerGuestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const guest = registerGuest(req.body as RegisterGuestBody);
    res.status(201).json(guest);
  } catch (err) {
    next(err);
  }
};
