import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { HttpError } from "./errors/http.error.js";
import { guestRouter } from "./routes/guest.routes.js";

const app = express();

// Allow the React dev server to call this API during development.
// Learn: CORS = browser rule that says "which websites may call me?"
app.use(cors());
app.use(express.json());

// Health check - proves frontend/backend communication works.
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "texcellence-server" });
});

// Guest registration (Chunk 3). Router handles POST /,
// mounted here so the full path is POST /api/guests.
app.use("/api/guests", guestRouter);

// Simple root message.
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Texcellence Conference API - Chunk 2 foundation" });
});

// Central error handler. Must have 4 parameters or Express ignores it.
// Known HttpError (400/409) -> clean JSON. Anything else -> generic 500,
// never stack traces or raw SQLite text.
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ error: err.title, message: err.message });
      return;
    }
    // express.json() throws a SyntaxError with status 400 on malformed JSON.
    const status = (err as unknown as { status?: unknown }).status;
    if (err instanceof SyntaxError && status === 400) {
      res.status(400).json({ error: "Invalid JSON", message: "Request body is not valid JSON." });
      return;
    }
    console.error(err);
    res
      .status(500)
      .json({ error: "Internal server error", message: "Something went wrong." });
  }
);

export default app;
