import { Router } from "express";
import { ingestExternalGuestHandler } from "../controllers/guest.controller.js";
import { requireApiKey } from "../middleware/requireApiKey.js";

// Learn: the machine door. Same controller/service/repository layers as
// every other route - only the guard differs (API key, not JWT), because
// their server has no browser to log in with. Mounted at /api/external.

export const externalRouter = Router();

externalRouter.post("/guests", requireApiKey, ingestExternalGuestHandler);
