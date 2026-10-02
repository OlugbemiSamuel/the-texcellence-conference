import { Router } from "express";
import { submitRegistrationHandler } from "../controllers/guest.controller.js";

// Learn: public signpost, no guard. app.ts mounts this router at
// "/api/registration", so POST / -> POST /api/registration.
// Deliberately NO requireAuth: guests register themselves.

export const registrationRouter = Router();

registrationRouter.post("/", submitRegistrationHandler);
