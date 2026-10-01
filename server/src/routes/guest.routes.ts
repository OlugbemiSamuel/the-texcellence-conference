import { Router } from "express";
import {
  getGuestByIdHandler,
  listGuestsHandler,
  registerGuestHandler,
  updateGuestByIdHandler,
} from "../controllers/guest.controller.js";

// Learn: route = the signpost. It maps paths on THIS router to controllers.
// app.ts mounts this router at "/api/guests", so:
// POST / -> POST /api/guests, GET /:id -> GET /api/guests/:id, etc.

export const guestRouter = Router();

guestRouter.post("/", registerGuestHandler);
guestRouter.get("/", listGuestsHandler);
guestRouter.get("/:id", getGuestByIdHandler);
guestRouter.patch("/:id", updateGuestByIdHandler);
