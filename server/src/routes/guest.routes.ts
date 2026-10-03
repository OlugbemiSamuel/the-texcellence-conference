import { Router } from "express";
import {
  accreditGuestHandler,
  generateTicketHandler,
  getGuestByIdHandler,
  getGuestByQrTokenHandler,
  importGuestsHandler,
  listGuestsHandler,
  registerGuestHandler,
  searchGuestsHandler,
  sendRsvpHandler,
  updateGuestByIdHandler,
} from "../controllers/guest.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

// Learn: route = the signpost. It maps paths on THIS router to controllers.
// app.ts mounts this router at "/api/guests", so:
// POST / -> POST /api/guests, GET /:id -> GET /api/guests/:id, etc.

export const guestRouter = Router();

guestRouter.post("/", requireAuth, registerGuestHandler);
guestRouter.get("/", listGuestsHandler);
// /search MUST sit above /:id: Express matches top-down and "search"
// would otherwise be mistaken for a guest id.
guestRouter.get("/search", requireAuth, searchGuestsHandler);
// Two-segment path, so /:id (one segment) can never swallow it,
// but it stays grouped with the other staff-only lookups regardless.
guestRouter.get("/qr/:token", requireAuth, getGuestByQrTokenHandler);
guestRouter.get("/:id", getGuestByIdHandler);
guestRouter.patch("/:id", updateGuestByIdHandler);
// Accreditation + tickets + RSVP + CSV import are staff-only.
guestRouter.post("/:id/accredit", requireAuth, accreditGuestHandler);
guestRouter.post("/:id/ticket", requireAuth, generateTicketHandler);
guestRouter.post("/:id/rsvp", requireAuth, sendRsvpHandler);
guestRouter.post("/import", requireAuth, importGuestsHandler);
