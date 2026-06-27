export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const RP_ID = process.env.RP_ID;
  if (!RP_ID) {
    return res
      .status(500)
      .json({ error: "RP_ID environment variable is not configured on the server" });
  }
  const EXPECTED_ORIGIN = process.env.EXPECTED_ORIGIN || "https://" + RP_ID;

  try {
    const { challengeId, ...response } = req.body as Record<string, any>;

    if (!challengeId) {
      return res.status(400).json({ error: "Missing challengeId" });
    }

    const [
      { getAdminKey, setAdminKey, addSession, getChallenge },
      { verifyAuthenticationResponse },
    ] = await Promise.all([import("../lib/blob-store.js"), import("@simplewebauthn/server")]);

    const storedChallenge = await getChallenge(challengeId);
    if (!storedChallenge) {
      return res.status(400).json({ error: "Invalid or expired challenge" });
    }

    const adminKey = await getAdminKey();
    if (!adminKey) {
      return res.status(401).json({ error: "No passkey registered" });
    }

    const verification = await verifyAuthenticationResponse({
      response: response as any,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: adminKey.credentialId,
        publicKey: Uint8Array.from(Buffer.from(adminKey.publicKey, "base64")),
        counter: adminKey.signCount,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return res.status(401).json({ error: "Authentication verification failed" });
    }

    await setAdminKey({
      ...adminKey,
      signCount: verification.authenticationInfo.newCounter,
    });

    const crypto = await import("crypto");
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
