# Passkey Authentication Plan: Vercel & Self-Hosted Branches

## Goal

Implement production-ready passkey authentication in **two separate, independent branches** with no shared auth code.

## Branch Strategy

```
vercel branch
└── api/auth/*           # Vercel serverless functions
└── api/lib/blob-store.ts # Vercel Blob storage

self-hosted branch
└── server/
    ├── routes/auth/*    # Express route handlers
    └── lib/file-store.ts # JSON file storage
```

**No shared storage layer. No conditional logic. Each branch owns its implementation.**

## Current State

- **Passkey auth is MOCKED**: `AdminGate.ts:103` generates fake `passkey-{timestamp}` credential ID
- **Vercel-only API**: All `/api/auth/*` endpoints use `@vercel/node`
- **No self-hosted auth**: `server/` has no auth routes

## Vercel Branch Implementation

### Files to Modify

```
api/auth/challenge.ts       # Generate cryptographically random challenge
api/auth/register.ts        # Verify attestation, store credential in Vercel Blob
api/auth/login.ts           # Verify assertion, create session in Vercel Blob
api/auth/verify.ts          # Validate session token
api/auth/recover.ts         # Recovery code login
api/lib/blob-store.ts       # Store admin_key.json, sessions.json, admin_recovery.json
```

### WebAuthn Flow (Vercel)

1. **Registration**: Browser → `POST /api/auth/register` → Vercel Blob
2. **Login**: Browser → `POST /api/auth/login` → Vercel Blob
3. **Verify**: Frontend → `GET /api/auth/verify` → Vercel Blob

### Storage

- `admin_key.json` in Vercel Blob (passkey credential)
- `sessions.json` in Vercel Blob (session tokens with expiry)
- `admin_recovery.json` in Vercel Blob (hashed recovery codes)

## Self-Hosted Branch Implementation

### Files to Create

```
server/routes/auth/challenge.ts   # Express route: generate challenge
server/routes/auth/register.ts    # Express route: verify attestation
server/routes/auth/login.ts       # Express route: verify assertion
server/routes/auth/verify.ts      # Express route: validate session
server/routes/auth/recover.ts     # Recovery code login
server/lib/file-store.ts          # JSON file storage with atomic writes
server/middleware/auth.ts         # Token validation middleware
```

### Files to Modify

```
server/index.js                   # Mount auth routes
server/watcher.js                 # Optional: restart on auth file changes
```

### WebAuthn Flow (Self-Hosted)

1. **Registration**: Browser → `POST /auth/register` → File store
2. **Login**: Browser → `POST /auth/login` → File store
3. **Verify**: Frontend → `GET /auth/verify` → File store

### Storage

```
server/data/
├── admin_key.json      # Passkey credential
├── sessions.json       # Active sessions
└── admin_recovery.json # Hashed recovery codes
```

## Frontend (Shared)

### Files to Modify

```
src/lib/auth.ts              # Add register(), update login(), add recover()
src/components/AdminGate.ts  # Registration flow + recovery UI
```

## Security Considerations

### Critical Security Controls

1. **Challenge entropy**: 32 bytes, cryptographically random, single-use
2. **Attestation verification**: Verify `fmt`, `alg`, `signature` in registration
3. **Signature verification**: Verify `authenticatorData`, `clientDataJSON` hash
4. **Credential ID storage**: Store only after successful verification
5. **Session tokens**: 32 bytes random, 24-hour expiry, HTTP-only cookies preferred
6. **Rate limiting**: Prevent brute-force on self-hosted (Express-rate-limit)
7. **Recovery codes**: 10 one-time codes generated at registration, stored hashed

### Attack Mitigations

- **Replay attacks**: Challenge stored with timestamp, reject if >5 min old
- **Man-in-the-middle**: Only accept HTTPS (reject HTTP in production)
- **Credential cloning**: Verify `rpId` matches expected origin
- **Session hijacking**: Use secure, httpOnly, sameSite cookies

### Self-Hosted Specific

- **File locking**: Use `fs.lock` or atomic write pattern
- **Backup**: Admin key stored encrypted with `SECRET_KEY` env var
- **Audit log**: Log all auth events to `server/data/auth.log`

## Deployment

### Vercel

- Deploy via GitHub Actions → Vercel
- Access: `https://dxrkinfuser44.github.io/presentation/api/auth/*`
- Storage: Vercel Blob (automatic)

### Self-Hosted

- Run: `node server/index.js` (port from `PORT` env)
- Access: `http://localhost:3000/auth/*` (or your domain)
- Storage: JSON files in `server/data/`

## Tasks

### Vercel Branch

- [ ] Update `api/auth/challenge.ts` with proper challenge storage
- [ ] Update `api/auth/register.ts` with WebAuthn verification + recovery codes
- [ ] Update `api/auth/login.ts` with assertion verification
- [ ] Update `api/auth/recover.ts` with recovery code login
- [ ] Update `api/lib/blob-store.ts` with session + recovery management
- [ ] Test Vercel deployment with real passkey

### Self-Hosted Branch

- [ ] Create `server/lib/file-store.ts` with JSON storage
- [ ] Create `server/routes/auth/challenge.ts`
- [ ] Create `server/routes/auth/register.ts`
- [ ] Create `server/routes/auth/login.ts`
- [ ] Create `server/routes/auth/recover.ts`
- [ ] Create `server/routes/auth/verify.ts`
- [ ] Update `server/index.js` to mount auth routes
- [ ] Test local self-hosted deployment

### Frontend (Both Branches)

- [ ] Update `src/lib/auth.ts` with `register()`, `recover()` functions
- [ ] Update `src/components/AdminGate.ts` with registration flow + recovery UI
- [ ] Add passkey registration button/UI
- [ ] Display recovery codes for admin to save

## Exit Criteria

- [ ] Admin can register a passkey via browser (both branches)
- [ ] Admin can login with registered passkey (both branches)
- [ ] Recovery codes work for admin access
- [ ] Sessions expire after 24 hours
- [ ] Logout invalidates session server-side
- [ ] Self-hosted works without Vercel dependencies
