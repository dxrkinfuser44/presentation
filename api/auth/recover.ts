import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { verifyRecoveryCode, addSession } from "../lib/blob-store.js";

// In-memory rate limiter (instance-scoped, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }

  entry.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientIp =
    (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "unknown";

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: "Too many recovery attempts. Try again later." });
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
    const token = crypto.randomBytes(32).toString("hex");
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
}
