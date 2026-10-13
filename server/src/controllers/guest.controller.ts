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
  getPublicTicket,
  getRecentAccreditations,
  ingestExternalGuest,
  registerGuest,
  searchGuests,
  sendGuestRsvp,
  sendGuestTicketEmail,
  sendTicketBatch,
  submitPublicRegistration,
  updateGuestById,
} from "../services/guest.service.js";
import { importGuestsFromCsv } from "../services/csv-import.service.js";
import { buildGuestQrWorkbook } from "../services/print.service.js";

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

export const listRecentAccreditationsHandler = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    res.json(getRecentAccreditations());
  } catch (err) {
    next(err);
  }
};

// Public (no auth): printed-QR verification. Query ?token=... returns
// name + company only, safe for any camera.
export const publicTicketHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    res.json(getPublicTicket(req.query.token));
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

export const sendTicketEmailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json(await sendGuestTicketEmail(req.params.id));
  } catch (err) {
    next(err);
  }
};

// Batch ticket email: next N never-emailed guests, oldest first.
// Body { limit } optional (default 5, max 20).
export const sendTicketBatchHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = (req.body as { limit?: unknown } | undefined)?.limit;
    res.json(await sendTicketBatch(limit));
  } catch (err) {
    next(err);
  }
};

// Office print file (admin only): xlsx of Full Name + QR image, A-Z.
// Streams the file; the office prints it as-is for the door.
export const printXlsxHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = await buildGuestQrWorkbook();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=texcellence-guest-qr-list.xlsx"
    );
    res.send(file);
  } catch (err) {
    next(err);
  }
};

export const importGuestsHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // JSON body { csv: "..." }: no multipart parser dependency needed.
    const csv = (req.body as { csv?: unknown } | undefined)?.csv;
    res.json(importGuestsFromCsv(csv));
  } catch (err) {
    next(err);
  }
};

// External registry ingest (Texcellence team's server): 201 created,
// 200 existing email updated. API-key authenticated, never JWT.
export const ingestExternalGuestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { guest, created } = ingestExternalGuest(
      (req.body ?? {}) as Record<string, unknown>
    );
    res.status(created ? 201 : 200).json(guest);
  } catch (err) {
    next(err);
  }
};

// Public registration: 201 for a brand-new guest, 200 when an existing
// email re-registers (record updated, no duplicate created).
export const submitRegistrationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { guest, created } = await submitPublicRegistration(
      req.body as PublicRegistrationBody
    );
    res.status(created ? 201 : 200).json(guest);
  } catch (err) {
    next(err);
  }
};
