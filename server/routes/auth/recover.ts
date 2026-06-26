import { Router } from "express";
import type { Request, Response } from "express";
import { verifyRecoveryCode, addSession } from "../../lib/file-store.js";
import { generateToken } from "../../lib/webauthn.js";

const router = Router();

/**
 * POST /auth/recover
 * Login with recovery code
 */
router.post("/", async (_req: Request, res: Response) => {
  try {
    const { code } = _req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Missing or invalid recovery code" });
    }

    // Verify recovery code (one-time use)
    const isValid = await verifyRecoveryCode(code);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid or expired recovery code" });
    }

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await addSession({
      token,
      createdAt: new Date().toISOString(),
      expiresAt,
    });

    return res.status(200).json({ token, ok: true });
  } catch (error) {
    console.error("Recovery login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as recoverRouter };
