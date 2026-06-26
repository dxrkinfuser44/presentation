import { Router } from "express";
import type { Request, Response } from "express";
import { findSession } from "../../lib/file-store.js";

const router = Router();

/**
 * GET /auth/verify
 * Validate session token
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.slice(7);
    const session = await findSession(token);

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    return res.status(200).json({ ok: true, admin: true });
  } catch (error) {
    console.error("Verify error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as verifyRouter };
