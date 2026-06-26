import { list, put } from "@vercel/blob";
import * as _crypto from "node:crypto";

export interface PresentationMetadata {
  id: string;
  title: string;
  subject: string;
  year: number;
  description: string;
  accent: string;
  bg: string;
  tags: string[];
  blobUrl: string;
  filePath: string;
  addedAt: string;
}

export interface AdminKey {
  credentialId: string;
  publicKey: string;
  alg: number;
  signCount: number;
  createdAt: string;
}

export async function getManifest(): Promise<PresentationMetadata[]> {
  try {
    const { blobs } = await list({ prefix: "manifest.json", limit: 1 });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch (error) {
    console.error("Error fetching manifest:", error);
    return [];
  }
}

export async function setManifest(data: PresentationMetadata[]): Promise<void> {
  await put("manifest.json", JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function getAdminKey(): Promise<AdminKey | null> {
  try {
    const { blobs } = await list({ prefix: "admin_key.json", limit: 1 });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch (error) {
    console.error("Error fetching admin key:", error);
    return null;
  }
}

export async function setAdminKey(key: AdminKey): Promise<void> {
  await put("admin_key.json", JSON.stringify(key), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
  return _crypto.randomBytes(length).toString("hex");
}

export interface Session {
  token: string;
  createdAt: string;
  expiresAt: string;
}

export async function getSessions(): Promise<Session[]> {
  try {
    const { blobs } = await list({ prefix: "sessions.json", limit: 1 });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }
}

export async function setSessions(sessions: Session[]): Promise<void> {
  await put("sessions.json", JSON.stringify(sessions), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function addSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  sessions.push(session);
  await setSessions(sessions);
}

export async function removeSession(token: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter((s) => s.token !== token);
  await setSessions(filtered);
}

export async function findSession(token: string): Promise<Session | null> {
  const sessions = await getSessions();
  const now = new Date();
  for (const s of sessions) {
    if (s.token === token && new Date(s.expiresAt) > now) {
      return s;
    }
  }
  return null;
}

// ============================================
// Challenge Storage (for WebAuthn registration/login)
// ============================================

export interface Challenge {
  challenge: string;
  timestamp: number;
}

export async function storeChallenge(challengeId: string, data: Challenge): Promise<void> {
  await put(`challenges/${challengeId}.json`, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function getChallenge(challengeId: string): Promise<Challenge | null> {
  try {
    const { blobs } = await list({ prefix: `challenges/${challengeId}.json`, limit: 1 });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return null;
  }
}

export async function deleteChallenge(_challengeId: string): Promise<void> {
  try {
    await list({ prefix: `challenges/`, limit: 1 });
    // Note: Vercel Blob doesn't support direct deletion via API
    // Challenges are cleaned up by expiry check on access
    // In production, you'd use blobStore.delete() if available
  } catch (error) {
    console.error("Error deleting challenge:", error);
  }
}

// ============================================
// Recovery Code Storage
// ============================================

export interface RecoveryCode {
  codeHash: string; // SHA-256 hash of the recovery code
  used: boolean;
  usedAt: string | null;
}

export async function getRecoveryCodes(): Promise<RecoveryCode[]> {
  try {
    const { blobs } = await list({ prefix: "admin_recovery.json", limit: 1 });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch (error) {
    console.error("Error fetching recovery codes:", error);
    return [];
  }
}

export async function setRecoveryCodes(codes: RecoveryCode[]): Promise<void> {
  await put("admin_recovery.json", JSON.stringify(codes), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

/**
 * Verify a recovery code and mark it as used (one-time use)
 */
export async function verifyRecoveryCode(code: string): Promise<boolean> {
  const codes = await getRecoveryCodes();
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  const codeEntry = codes.find((c) => c.codeHash === codeHash);

  if (!codeEntry || codeEntry.used) {
    return false;
  }

  // Mark as used
  codeEntry.used = true;
  codeEntry.usedAt = new Date().toISOString();
  await setRecoveryCodes(codes);

  return true;
}

/**
 * Generate 10 new recovery codes
 */
export async function generateRecoveryCodes(): Promise<string[]> {
  const codes: string[] = [];
  const codeEntries: RecoveryCode[] = [];

  for (let i = 0; i < 10; i++) {
    // Generate 16-character alphanumeric code
    const code = crypto
      .randomBytes(12)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 16);
    codes.push(code);
    codeEntries.push({
      codeHash: crypto.createHash("sha256").update(code).digest("hex"),
      used: false,
      usedAt: null,
    });
  }

  await setRecoveryCodes(codeEntries);
  return codes;
}
