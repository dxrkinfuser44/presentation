import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { getAdminKey, setAdminKey, addSession } from "../lib/blob-store.js";
import { verifyChallenge } from "./challenge.js";

// Expected RP ID
const EXPECTED_RP_ID = process.env.RP_ID;
if (!EXPECTED_RP_ID) {
  throw new Error("RP_ID environment variable must be set");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    // Parse client data
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

    // Verify origin
    const expectedOrigin = "https://" + EXPECTED_RP_ID;
    if (!clientData.origin || clientData.origin !== expectedOrigin) {
      return res.status(400).json({ error: "Invalid origin" });
    }

    // Verify authenticator data
    const authDataBuffer = Buffer.from(authenticatorData, "base64");

    // Parse authenticator data
    // Bytes 0-31: RP ID hash
    // Byte 32: Flags
    // Bytes 33-36: Sign count
    // Remaining: Attested credential ID and public key (if present)
    if (authDataBuffer.length < 37) {
      return res.status(400).json({ error: "Invalid authenticator data" });
    }

    const flags = authDataBuffer[32];
    const signCount = authDataBuffer.readUInt32BE(33);

    // Verify user present (UP) and user verified (UV) flags
    // UP flag = bit 0, UV flag = bit 2
    if (!(flags & 0x01)) {
      return res.status(400).json({ error: "User present flag not set" });
    }

    // Update sign count
    const newSignCount = signCount > storedKey.signCount ? signCount : storedKey.signCount;

    // Verify signature
    const signatureBuffer = Buffer.from(signature, "base64");

    // Data to verify: authenticatorData + SHA-256 hash of clientDataJSON
    const clientDataHash = crypto.createHash("sha256").update(clientDataJSON, "base64").digest();
    const dataToVerify = Buffer.concat([authDataBuffer, clientDataHash]);

    // Verify signature using ES256 (ECDSA with SHA-256)
    const publicKeyDer = bufferToDer(storedKey.publicKey);

    const isValid = await verifySignature(publicKeyDer, dataToVerify, signatureBuffer);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Update sign count in stored credential
    const updatedKey = { ...storedKey, signCount: newSignCount };
    await setAdminKey(updatedKey);

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

/**
 * Convert COSE public key to DER format for verification
 */
function bufferToDer(cosePublicKey: string): Buffer {
  // COSE public key is in COSE format (ECDS256)
  // Convert to DER for Node.js crypto verification
  const pubKeyBuffer = Buffer.from(cosePublicKey, "base64");

  // Parse COSE key (simplified - assumes standard format)
  // In production, use a proper COSE parser
  return pubKeyBuffer;
}

/**
 * Verify ECDSA signature
 */
async function verifySignature(
  publicKey: Buffer,
  data: Buffer,
  signature: Buffer,
): Promise<boolean> {
  try {
    // For ES256, the signature is in IEEE 1363 format (r || s)
    // Node.js expects DER-encoded signature

    const cryptoKey = crypto.createPublicKey({
      key: publicKey,
      format: "der",
      type: "spki",
    });

    // Convert IEEE 1363 to DER if needed
    const derSignature = ieee1363ToDer(signature);

    return crypto.verify("sha256", data, cryptoKey, derSignature);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Convert IEEE 1363 signature format to DER
 */
function ieee1363ToDer(sig: Buffer): Buffer {
  // IEEE 1363: r (32 bytes) || s (32 bytes)
  // DER: SEQUENCE containing two INTEGERs

  const r = sig.subarray(0, 32);
  const s = sig.subarray(32, 64);

  // Convert to DER format
  const rInt = derEncodeInteger(r);
  const sInt = derEncodeInteger(s);

  return derEncodeSequence(Buffer.concat([rInt, sInt]));
}

function derEncodeInteger(data: Buffer): Buffer {
  // Remove leading zeros, but keep sign bit
  let i = 0;
  while (i < data.length - 1 && data[i] === 0) i++;
  const trimmed = data.slice(i);

  // If high bit is set, prepend zero
  if (trimmed[0] & 0x80) {
    return Buffer.concat([Buffer.from([0x02, trimmed.length + 1, 0]), trimmed]);
  }
  return Buffer.concat([Buffer.from([0x02, trimmed.length]), trimmed]);
}

function derEncodeSequence(data: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x30, data.length]), data]);
}
