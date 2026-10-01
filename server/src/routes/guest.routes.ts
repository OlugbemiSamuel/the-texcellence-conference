import { Router } from "express";
import { registerGuestHandler } from "../controllers/guest.controller.js";

// Learn: route = the signpost. It maps "POST /" on THIS router to the
// controller. app.ts mounts this router at "/api/guests",
// so the full path becomes POST /api/guests.

export const guestRouter = Router();

guestRouter.post("/", registerGuestHandler);
