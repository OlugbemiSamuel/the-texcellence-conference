import { Router } from "express";
import {
  accreditGuestHandler,
  generateTicketHandler,
  getGuestByIdHandler,
  getGuestByQrTokenHandler,
  importGuestsHandler,
  listGuestsHandler,
  listRecentAccreditationsHandler,
  registerGuestHandler,
  searchGuestsHandler,
  sendRsvpHandler,
  sendTicketBatchHandler,
  sendTicketEmailHandler,
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
// Recent-accreditations MUST sit above /:id for the same reason:
// Express matches top-down and "recent-accreditations" would otherwise
// be mistaken for a guest id.
guestRouter.get("/recent-accreditations", requireAuth, listRecentAccreditationsHandler);
guestRouter.get("/:id", getGuestByIdHandler);
guestRouter.patch("/:id", updateGuestByIdHandler);
// Accreditation + tickets + RSVP + CSV import are staff-only.
guestRouter.post("/:id/accredit", requireAuth, accreditGuestHandler);
guestRouter.post("/:id/ticket", requireAuth, generateTicketHandler);
guestRouter.post("/:id/rsvp", requireAuth, sendRsvpHandler);
// The batch path MUST sit above /:id/ticket-email: Express matches
// top-down and "batch" would otherwise be mistaken for a guest id.
guestRouter.post("/ticket-email/batch", requireAuth, sendTicketBatchHandler);
guestRouter.post("/:id/ticket-email", requireAuth, sendTicketEmailHandler);
guestRouter.post("/import", requireAuth, importGuestsHandler);
