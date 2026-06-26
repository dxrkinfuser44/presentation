import crypto from "crypto";

// Expected RP ID (relying party ID) - should match your domain
export const EXPECTED_RP_ID = process.env.RP_ID || "localhost";

// Challenge expiry: 5 minutes
export const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Verify client data JSON
 */
export async function verifyClientData(
  clientDataJSON: string,
  expectedRpId: string = EXPECTED_RP_ID,
): Promise<{ valid: boolean; error?: string }> {
  let clientData: any;

  try {
    clientData = JSON.parse(Buffer.from(clientDataJSON, "base64").toString("utf8"));
  } catch {
    return { valid: false, error: "Invalid clientDataJSON" };
  }

  // Verify RP ID
  if (clientData.rpId !== expectedRpId) {
    return { valid: false, error: "Invalid RP ID" };
  }

  // Verify origin
  if (!clientData.origin || !clientData.origin.includes(expectedRpId)) {
    return { valid: false, error: "Invalid origin" };
  }

  return { valid: true };
}

/**
 * Convert COSE public key to DER format for verification
 */
export function bufferToDer(cosePublicKey: string): Buffer {
  const pubKeyBuffer = Buffer.from(cosePublicKey, "base64");
  return pubKeyBuffer;
}

/**
 * Verify ECDSA signature
 */
export async function verifySignature(
  publicKey: Buffer,
  data: Buffer,
  signature: Buffer,
): Promise<boolean> {
  try {
    const cryptoKey = crypto.createPublicKey({
      key: publicKey,
      format: "der",
      type: "spki",
    });

    const derSignature = ieee1363ToDer(signature);
    return crypto.verify("sha256", derSignature, cryptoKey, data);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Convert IEEE 1363 signature format to DER
 */
function ieee1363ToDer(sig: Buffer): Buffer {
  const r = sig.subarray(0, 32);
  const s = sig.subarray(32, 64);

  const rInt = derEncodeInteger(r);
  const sInt = derEncodeInteger(s);

  return derEncodeSequence(Buffer.concat([rInt, sInt]));
}

function derEncodeInteger(data: Buffer): Buffer {
  let i = 0;
  while (i < data.length - 1 && data[i] === 0) i++;
  const trimmed = data.slice(i);

  if (trimmed[0] & 0x80) {
    return Buffer.concat([Buffer.from([0x02, trimmed.length + 1, 0]), trimmed]);
  }
  return Buffer.concat([Buffer.from([0x02, trimmed.length]), trimmed]);
}

function derEncodeSequence(data: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x30, data.length]), data]);
}

/**
 * Verify authenticator data
 */
export function verifyAuthenticatorData(
  authDataBuffer: Buffer,
  minlength: number = 37,
): { valid: boolean; flags: number; signCount: number; error?: string } {
  if (authDataBuffer.length < minlength) {
    return { valid: false, flags: 0, signCount: 0, error: "Invalid authenticator data" };
  }

  const flags = authDataBuffer[32];
  const signCount = authDataBuffer.readUInt32BE(33);

  // Verify user present (UP) flag
  if (!(flags & 0x01)) {
    return { valid: false, flags, signCount, error: "User present flag not set" };
  }

  return { valid: true, flags, signCount };
}

/**
 * Generate a cryptographically random challenge
 */
export function generateChallenge(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate a random challenge ID
 */
export function generateChallengeId(length: number = 16): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate recovery codes
 */
export function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto
      .randomBytes(12)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 16);
    codes.push(code);
  }

  return codes;
}
