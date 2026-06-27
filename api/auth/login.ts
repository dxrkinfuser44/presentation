import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getAdminKey, setAdminKey, addSession, getChallenge } from "../lib/blob-store.js";

const RP_ID = process.env.RP_ID;
if (!RP_ID) {
  throw new Error("RP_ID environment variable must be set");
}

const EXPECTED_ORIGIN = process.env.EXPECTED_ORIGIN || "https://" + RP_ID;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { challengeId, ...response } = req.body as AuthenticationResponseJSON & {
      challengeId: string;
    };

    if (!challengeId) {
      return res.status(400).json({ error: "Missing challengeId" });
    }

    // Retrieve stored challenge from blob storage
    const storedChallenge = await getChallenge(challengeId);
    if (!storedChallenge) {
      return res.status(400).json({ error: "Invalid or expired challenge" });
    }

    // Retrieve stored admin credential
    const adminKey = await getAdminKey();
    if (!adminKey) {
      return res.status(401).json({ error: "No passkey registered" });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID!,
      credential: {
        id: adminKey.credentialId,
        publicKey: Uint8Array.from(Buffer.from(adminKey.publicKey, "base64")),
        counter: adminKey.signCount,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return res.status(401).json({ error: "Authentication verification failed" });
    }

    // Update sign count in stored credential
    await setAdminKey({
      ...adminKey,
      signCount: verification.authenticationInfo.newCounter,
    });

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
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
