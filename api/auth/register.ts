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

    // Verify RP ID
    if (clientData.rpId !== EXPECTED_RP_ID) {
      return res.status(400).json({ error: "Invalid RP ID" });
    }

    // Verify attestation type (we accept both 'Basic' and 'Self' attestation)
    if (!clientData.attestation || !["Basic", "Self"].includes(clientData.attestation)) {
      return res.status(400).json({ error: "Invalid attestation type" });
    }

    // Verify token binding (if present)
    if (clientData.tokenBinding) {
      // In production, verify token binding
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
  credentialId: string,
  publicKey: string,
  clientDataJSON: string,
  _attestationBuffer: string,
): Promise<boolean> {
  try {
    // Parse client data
    const clientData = JSON.parse(Buffer.from(clientDataJSON, "base64").toString("utf8")) as {
      rpId: string;
      attestation?: string;
      tokenBinding?: any;
      [key: string]: any;
    };

    // Verify RP ID
    if (clientData.rpId !== EXPECTED_RP_ID) {
      return false;
    }

    // In a production implementation, you would:
    // 1. Parse the attestation buffer (COSE format)
    // 2. Extract the attested credential data
    // 3. Verify the signature using the attestation certificate
    // 4. Verify the credential ID and public key match

    // For now, we accept the registration if the challenge was verified
    return true;
  } catch {
    return false;
  }
}
