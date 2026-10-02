import type { NextFunction, Request, Response } from "express";
import type {
  PublicRegistrationBody,
  RegisterGuestBody,
  UpdateGuestBody,
} from "../types/guest.types.js";
import {
  accreditGuest,
  generateGuestTicket,
  getGuestById,
  getGuestByQrToken,
  getGuests,
  registerGuest,
  searchGuests,
  sendGuestRsvp,
  submitPublicRegistration,
  updateGuestById,
} from "../services/guest.service.js";

export const registerGuestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const guest = registerGuest(req.body as RegisterGuestBody);
    res.status(201).json(guest);
  } catch (err) {
    next(err);
  }
};

export const listGuestsHandler = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    res.json(getGuests());
  } catch (err) {
    next(err);
  }
};

export const searchGuestsHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    res.json(searchGuests(req.query.q));
  } catch (err) {
    next(err);
  }
};

export const getGuestByQrTokenHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    res.json(getGuestByQrToken(req.params.token));
  } catch (err) {
    next(err);
  }
};

export const getGuestByIdHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    res.json(getGuestById(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const updateGuestByIdHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    res.json(updateGuestById(req.params.id, req.body as UpdateGuestBody));
  } catch (err) {
    next(err);
  }
};

export const accreditGuestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    res.json(accreditGuest(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const generateTicketHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    res.json(generateGuestTicket(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const sendRsvpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json(await sendGuestRsvp(req.params.id));
  } catch (err) {
    next(err);
  }
};

// Public registration: 201 for a brand-new guest, 200 when an existing
// email re-registers (record updated, no duplicate created).
export const submitRegistrationHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { guest, created } = submitPublicRegistration(
      req.body as PublicRegistrationBody
    );
    res.status(created ? 201 : 200).json(guest);
  } catch (err) {
    next(err);
  }
};
