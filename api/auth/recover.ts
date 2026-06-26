import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { verifyRecoveryCode, addSession } from "../lib/blob-store.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Missing or invalid recovery code" });
    }

    // Verify recovery code (one-time use)
    const isValid = await verifyRecoveryCode(code);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid or expired recovery code" });
    }

    // Create session
    const _token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await addSession({
      token: _token,
      createdAt: new Date().toISOString(),
      expiresAt,
    });

    return res.status(200).json({ token, ok: true });
  } catch (error) {
    console.error("Recovery login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
