import { Router } from "express";
import {
  accreditGuestHandler,
  generateTicketHandler,
  getGuestByIdHandler,
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

guestRouter.post("/", registerGuestHandler);
guestRouter.get("/", listGuestsHandler);
// /search MUST sit above /:id: Express matches top-down and "search"
// would otherwise be mistaken for a guest id.
guestRouter.get("/search", requireAuth, searchGuestsHandler);
guestRouter.get("/:id", getGuestByIdHandler);
guestRouter.patch("/:id", updateGuestByIdHandler);
// Accreditation + tickets + RSVP are staff-only: requireAuth stands guard.
guestRouter.post("/:id/accredit", requireAuth, accreditGuestHandler);
guestRouter.post("/:id/ticket", requireAuth, generateTicketHandler);
guestRouter.post("/:id/rsvp", requireAuth, sendRsvpHandler);
