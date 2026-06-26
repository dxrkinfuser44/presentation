import { Router } from "express";
import type { Request, Response } from "express";
import { removeSession } from "../../lib/file-store.js";

const router = Router();

/**
 * POST /auth/logout
 * Terminate the current session
 */
router.post("/", async (_req: Request, res: Response) => {
  try {
    const authHeader = _req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.slice(7);
    await removeSession(token);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as logoutRouter };
