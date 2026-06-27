import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminKey, setAdminKey, generateRecoveryCodes } from "../lib/blob-store.js";
import { verifyChallenge } from "./challenge.js";

// Expected RP ID (relying party ID) - should match your domain
const EXPECTED_RP_ID = process.env.RP_ID;
if (!EXPECTED_RP_ID) {
  throw new Error("RP_ID environment variable must be set");
}

export interface AdminKey {
  credentialId: string;
  publicKey: string;
  alg: number;
  signCount: number;
  createdAt: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      credentialId,
      publicKey,
      alg,
      challengeId,
      challenge,
      clientDataJSON,
      attestationBuffer,
      registrationToken,
    } = req.body;

    // Verify registration token
    const expectedToken = process.env.REGISTRATION_SECRET;
    if (!expectedToken) {
      return res.status(500).json({ error: "Registration is not configured" });
    }
    if (!registrationToken || registrationToken !== expectedToken) {
      return res.status(403).json({ error: "Invalid registration link" });
    }

    // Validate required fields
    if (!credentialId || !publicKey || typeof alg !== "number") {
      return res
        .status(400)
        .json({ error: "Missing or invalid fields: credentialId, publicKey, alg" });
    }

    if (!challengeId || !challenge || !clientDataJSON || !attestationBuffer) {
      return res.status(400).json({ error: "Missing WebAuthn registration fields" });
    }

    // Verify challenge (single-use)
    const challengeValid = await verifyChallenge(challengeId, challenge);
    if (!challengeValid) {
      return res.status(400).json({ error: "Invalid or expired challenge" });
    }

    // Parse clientDataJSON
    let clientData: any;
    try {
      clientData = JSON.parse(Buffer.from(clientDataJSON, "base64").toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid clientDataJSON" });
    }

    // Verify origin
    const expectedOrigin = "https://" + EXPECTED_RP_ID;
    if (clientData.origin !== expectedOrigin) {
      return res.status(400).json({ error: "Invalid origin" });
    }

    // Verify this is a creation event
    if (clientData.type !== "webauthn.create") {
      return res.status(400).json({ error: "Invalid challenge type" });
    }

    // Check if credential already exists
    const existingKey = await getAdminKey();
    if (existingKey) {
      return res.status(409).json({ error: "Passkey already registered" });
    }

    // Store the credential
    const newKey: AdminKey = {
      credentialId,
      publicKey,
      alg,
      signCount: 0,
      createdAt: new Date().toISOString(),
    };

    await setAdminKey(newKey);

    // Generate and return recovery codes
    const recoveryCodes = await generateRecoveryCodes();

    return res.status(200).json({
      ok: true,
      recoveryCodes,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Verify WebAuthn attestation signature
 * This is a simplified version - in production, you'd want full COSE verification
 */
export async function verifyAttestation(
  _credentialId: string,
  _publicKey: string,
  clientDataJSON: string,
  _attestationBuffer: string,
): Promise<boolean> {
  try {
    const clientData = JSON.parse(Buffer.from(clientDataJSON, "base64").toString("utf8"));
    return (
      clientData.type === "webauthn.create" && clientData.origin === "https://" + EXPECTED_RP_ID
    );
  } catch {
    return false;
  }
}
