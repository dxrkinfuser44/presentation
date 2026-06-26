import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { storeChallenge, getChallenge, deleteChallenge } from "../lib/blob-store.js";

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Generate 32-byte cryptographically random challenge
    const challenge = crypto.randomBytes(32).toString("hex");
    const timestamp = Date.now();
    const challengeId = crypto.randomBytes(16).toString("hex");

    // Store challenge with timestamp
    await storeChallenge(challengeId, { challenge, timestamp });

    return response.status(200).json({ challengeId, challenge });
  } catch (error) {
    console.error("Failed to generate challenge:", error);
    return response.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * Verify and consume a challenge (single-use)
 * Returns the challenge if valid, null if expired or already used
 */
export async function verifyChallenge(challengeId: string, challenge: string): Promise<boolean> {
  const stored = await getChallenge(challengeId);

  if (!stored) {
    return false;
  }

  const now = Date.now();

  // Check if challenge has expired (5 minutes)
  if (now - stored.timestamp > CHALLENGE_EXPIRY_MS) {
    await deleteChallenge(challengeId);
    return false;
  }

  // Verify challenge matches
  if (stored.challenge !== challenge) {
    return false;
  }

  // Delete challenge (single-use)
  await deleteChallenge(challengeId);

  return true;
}
