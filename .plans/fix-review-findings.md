# Plan: Fix Review Findings

## Critical Fixes (6)

### 1. `api/auth/login.ts:42,50` — Undefined variable RP ID check

**Problem:** `_clientData` on line 42, but `clientData` referenced on line 50.
**Fix:** Rename `_clientData` to `clientData`.

### 2. `api/auth/login.ts:154` — Signature verification arguments swapped

**Problem:** `crypto.verify("sha256", derSignature, cryptoKey, dataToVerify)` — wrong order.
**Fix:** Change to `crypto.verify("sha256", dataToVerify, cryptoKey, derSignature)`.

### 3. `api/auth/login.ts:55` — Weak origin check

**Problem:** `clientData.origin.includes(EXPECTED_RP_ID)` allows spoofed origins.
**Fix:** Use strict equality: `clientData.origin === "https://" + EXPECTED_RP_ID`.

### 4. `api/lib/blob-store.ts:70` — Undefined `__crypto`

**Problem:** `__crypto.randomBytes()` but import is `_crypto`.
**Fix:** Change to `_crypto.randomBytes(length)`.

### 5. `api/lib/blob-store.ts:60,92,191` — Public blob access for secrets

**Problem:** `access: "public"` on admin_key.json, sessions.json, admin_recovery.json.
**Fix:** Change to `access: "private"` for all three.

### 6. `api/lib/blob-store.ts:39` — Missing dependencies

**Problem:** `@vercel/node` and `@vercel/blob` not in package.json.
**Fix:** Add to devDependencies.

## Warning Fixes (3)

### 7. `api/lib/blob-store.ts:111-125` — Session cleanup on every read

**Problem:** Full read + conditional write on every token verification.
**Fix:** Add a separate `cleanupExpiredSessions()` function and call it periodically (or only on session read if count > threshold). For now, move cleanup to a lazy pattern: only rewrite if expired count > 0 and limit to once per 5 minutes using a timestamp check.

### 8. `api/auth/recover.ts` — No rate limiting

**Problem:** Unlimited brute-force attempts on recovery codes.
**Fix:** Add in-memory rate limiting (Map of IP → {count, resetTime}). Max 5 attempts per 15 minutes per IP.

### 9. `api/auth/login.ts:7` — Hardcoded fallback RP ID

**Problem:** Silent wrong-origin if RP_ID env unset.
**Fix:** Throw error if RP_ID is undefined.

## Suggestion Fix (1)

### 10. `tsconfig.json` — api/ not type-checked

**Problem:** api/ directory excluded from TypeScript.
**Fix:** Add `"api"` to include array.
