import type { NextFunction, Request, Response } from "express";
import type {
  RegisterGuestBody,
  UpdateGuestBody,
} from "../types/guest.types.js";
import {
  getGuestById,
  getGuests,
  registerGuest,
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
  next: NextFunction,
): void => {
  try {
    res.json(updateGuestById(req.params.id, req.body as UpdateGuestBody));
  } catch (err) {
    next(err);
  }
};
