import { Router } from "express";
import type { Request, Response } from "express";
import crypto from "node:crypto";
import { getAdminKey, setAdminKey, addSession } from "../../lib/file-store.js";
import { verifyChallenge } from "./challenge.js";
import {
  EXPECTED_RP_ID,
  verifyClientData,
  verifyAuthenticatorData,
  bufferToDer,
  verifySignature,
  generateToken,
} from "../../lib/webauthn.js";

const router = Router();

/**
 * POST /auth/login
 * Handle WebAuthn authentication
 */
router.post("/", async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { credentialId, challengeId, challenge, clientDataJSON, authenticatorData, signature } =
      req.body;

    if (
      !credentialId ||
      !challengeId ||
      !challenge ||
      !clientDataJSON ||
      !authenticatorData ||
      !signature
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify challenge (single-use)
    const challengeValid = await verifyChallenge(challengeId, challenge);
    if (!challengeValid) {
      return res.status(400).json({ error: "Invalid or expired challenge" });
    }

    // Get stored credential
    const storedKey = await getAdminKey();
    if (!storedKey || storedKey.credentialId !== credentialId) {
      return res.status(401).json({ error: "Invalid credential" });
    }

    // Verify client data
    const clientDataResult = await verifyClientData(clientDataJSON, EXPECTED_RP_ID);
    if (!clientDataResult.valid) {
      return res.status(400).json({ error: clientDataResult.error });
    }

    // Verify authenticator data
    const authDataBuffer = Buffer.from(authenticatorData, "base64");
    const authResult = verifyAuthenticatorData(authDataBuffer);

    if (!authResult.valid) {
      return res.status(400).json({ error: authResult.error });
    }

    // Update sign count
    const newSignCount =
      authResult.signCount > storedKey.signCount ? authResult.signCount : storedKey.signCount;

    // Verify signature
    const signatureBuffer = Buffer.from(signature, "base64");
    const clientDataHash = crypto.createHash("sha256").update(clientDataJSON, "base64").digest();
    const dataToVerify = Buffer.concat([authDataBuffer, clientDataHash]);

    const publicKeyDer = bufferToDer(storedKey.publicKey);
    const isValid = await verifySignature(publicKeyDer, dataToVerify, signatureBuffer);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Update sign count in stored credential
    const updatedKey = { ...storedKey, signCount: newSignCount };
    await setAdminKey(updatedKey);

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
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as loginRouter };
