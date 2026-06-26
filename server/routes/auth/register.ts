import { Router } from "express";
import type { Request, Response } from "express";
import { getAdminKey, setAdminKey, generateRecoveryCodes } from "../../lib/file-store.js";
import { verifyChallenge } from "./challenge.js";
import { EXPECTED_RP_ID, verifyClientData } from "../../lib/webauthn.js";

const router = Router();

export interface AdminKey {
  credentialId: string;
  publicKey: string;
  alg: number;
  signCount: number;
  createdAt: string;
}

/**
 * POST /auth/register
 * Handle WebAuthn registration
 */
router.post("/", async (req, res) => {
  try {
    const {
      credentialId,
      publicKey,
      alg,
      challengeId,
      challenge,
      clientDataJSON,
      attestationBuffer,
    } = req.body;

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

    // Verify client data
    const clientDataResult = await verifyClientData(clientDataJSON, EXPECTED_RP_ID);
    if (!clientDataResult.valid) {
      return res.status(400).json({ error: clientDataResult.error });
    }

    // Verify attestation type (we accept both 'Basic' and 'Self' attestation)
    let clientData: any;
    try {
      clientData = JSON.parse(Buffer.from(clientDataJSON, "base64").toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid clientDataJSON" });
    }

    if (!clientData.attestation || !["Basic", "Self"].includes(clientData.attestation)) {
      return res.status(400).json({ error: "Invalid attestation type" });
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
    const recoveryCodes = generateRecoveryCodes();

    return res.status(200).json({
      ok: true,
      recoveryCodes,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Verify WebAuthn attestation signature
 * This is a simplified version - in production, you'd want full COSE verification
 */
export async function verifyAttestation(
  credentialId: string,
  publicKey: string,
  clientDataJSON: string,
  attestationBuffer: string,
): Promise<boolean> {
  try {
    const clientData = JSON.parse(Buffer.from(clientDataJSON, "base64").toString("utf8"));

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

export { router as registerRouter };
