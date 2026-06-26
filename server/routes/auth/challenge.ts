import { Router } from "express";
import type { Request, Response } from "express";
import { storeChallenge, getChallenge, deleteChallenge } from "../../lib/file-store.js";
import { generateChallenge, generateChallengeId, CHALLENGE_EXPIRY_MS } from "../../lib/webauthn.js";

const router = Router();

/**
 * GET /auth/challenge
 * Generate a cryptographically random challenge for WebAuthn registration/login
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    // Generate 32-byte cryptographically random challenge
    const challenge = generateChallenge(32);
    const timestamp = Date.now();
    const challengeId = generateChallengeId(16);

    // Store challenge with timestamp
    await storeChallenge(challengeId, { challenge, timestamp });

    return res.status(200).json({ challengeId, challenge });
  } catch (error) {
    console.error("Failed to generate challenge:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

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

  // Check if challenge has expired
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

export { router as challengeRouter };
