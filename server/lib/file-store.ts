import { open } from "fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";
import { generateRecoveryCodes as generateRecoveryCodesUtil } from "./webauthn.js";

// Data directory path
const DATA_DIR = join(process.cwd(), "server", "data");

// File paths
const ADMIN_KEY_FILE = join(DATA_DIR, "admin_key.json");
const SESSIONS_FILE = join(DATA_DIR, "sessions.json");
const RECOVERY_FILE = join(DATA_DIR, "admin_recovery.json");
const CHALLENGES_DIR = join(DATA_DIR, "challenges");

// Challenge expiry: 5 minutes
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

// Session expiry: 24 hours
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Ensure data directory exists
 */
export async function ensureDataDir(): Promise<void> {
  try {
    await open(DATA_DIR, "r");
  } catch {
    // Directory doesn't exist, create it
    const { mkdir } = await import("fs/promises");
    await mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * Atomic write: write to temp file, then rename
 */
async function atomicWrite(filePath: string, data: string): Promise<void> {
  await ensureDataDir();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  const fd = await open(tempPath, "w");
  try {
    await fd.writeFile(data);
    await fd.close();
    // Atomic rename
    const { rename } = await import("fs/promises");
    await rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      const { unlink } = await import("fs/promises");
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Read JSON file with locking
 */
async function readJson<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const fd = await open(filePath, "r");
    try {
      const content = await fd.readFile("utf8");
      return JSON.parse(content) as T;
    } finally {
      await fd.close();
    }
  } catch {
    return defaultValue;
  }
}

/**
 * Write JSON file atomically
 */
async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await atomicWrite(filePath, JSON.stringify(data, null, 2));
}

// ============================================
// Admin Key Storage
// ============================================

export interface AdminKey {
  credentialId: string;
  publicKey: string;
  alg: number;
  signCount: number;
  createdAt: string;
}

export async function getAdminKey(): Promise<AdminKey | null> {
  return readJson<AdminKey | null>(ADMIN_KEY_FILE, null);
}

export async function setAdminKey(key: AdminKey): Promise<void> {
  await ensureDataDir();
  await writeJson(ADMIN_KEY_FILE, key);
}

// ============================================
// Session Storage
// ============================================

export interface Session {
  token: string;
  createdAt: string;
  expiresAt: string;
}

export async function getSessions(): Promise<Session[]> {
  return readJson<Session[]>(SESSIONS_FILE, []);
}

export async function setSessions(sessions: Session[]): Promise<void> {
  await writeJson(SESSIONS_FILE, sessions);
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
// Challenge Storage
// ============================================

export interface Challenge {
  challenge: string;
  timestamp: number;
}

export async function storeChallenge(challengeId: string, data: Challenge): Promise<void> {
  await ensureDataDir();
  const filePath = join(CHALLENGES_DIR, `${challengeId}.json`);
  await writeJson(filePath, data);
}

export async function getChallenge(challengeId: string): Promise<Challenge | null> {
  const filePath = join(CHALLENGES_DIR, `${challengeId}.json`);
  const stored = await readJson<Challenge | null>(filePath, null);

  if (!stored) return null;

  // Check expiry
  const now = Date.now();
  if (now - stored.timestamp > CHALLENGE_EXPIRY_MS) {
    await deleteChallenge(challengeId);
    return null;
  }

  return stored;
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  const filePath = join(CHALLENGES_DIR, `${challengeId}.json`);
  try {
    const { unlink } = await import("fs/promises");
    await unlink(filePath);
  } catch {
    // File doesn't exist, ignore
  }
}

// ============================================
// Recovery Code Storage
// ============================================

export interface RecoveryCode {
  codeHash: string;
  used: boolean;
  usedAt: string | null;
}

export async function getRecoveryCodes(): Promise<RecoveryCode[]> {
  return readJson<RecoveryCode[]>(RECOVERY_FILE, []);
}

export async function setRecoveryCodes(codes: RecoveryCode[]): Promise<void> {
  await writeJson(RECOVERY_FILE, codes);
}

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
  const codes = generateRecoveryCodesUtil(10);
  const codeEntries: RecoveryCode[] = codes.map((code) => ({
    codeHash: crypto.createHash("sha256").update(code).digest("hex"),
    used: false,
    usedAt: null,
  }));

  await setRecoveryCodes(codeEntries);
  return codes;
}
