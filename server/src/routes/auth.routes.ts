import { Router } from "express";
import {
  loginHandler,
  meHandler,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

// Learn: mounted at "/api/auth" in app.ts, so:
// POST /login -> POST /api/auth/login (public front door)
// GET /me     -> GET /api/auth/me with requireAuth standing guard first.

export const authRouter = Router();

authRouter.post("/login", loginHandler);
authRouter.get("/me", requireAuth, meHandler);
