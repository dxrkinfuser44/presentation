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
    const { registrationToken, challengeId, ...response } = req.body as Record<string, any>;

    const expectedToken = process.env.REGISTRATION_SECRET;
    if (!expectedToken) {
      return res.status(500).json({ error: "Registration is not configured" });
    }
    if (!registrationToken || registrationToken !== expectedToken) {
      return res.status(403).json({ error: "Invalid registration link" });
    }

    if (!challengeId) {
      return res.status(400).json({ error: "Missing challengeId" });
    }

    const [
      { getAdminKey, setAdminKey, generateRecoveryCodes, getChallenge },
      { verifyRegistrationResponse },
    ] = await Promise.all([import("../lib/blob-store.js"), import("@simplewebauthn/server")]);

    const existingKey = await getAdminKey();
    if (existingKey) {
      return res.status(409).json({ error: "Passkey already registered" });
    }

    const storedChallenge = await getChallenge(challengeId);
    if (!storedChallenge) {
      return res.status(400).json({ error: "Invalid or expired challenge" });
    }

    const verification = await verifyRegistrationResponse({
      response: response as any,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(401).json({ error: "Registration verification failed" });
    }

    const { credential } = verification.registrationInfo;

    await setAdminKey({
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      alg: -7,
      signCount: credential.counter,
      createdAt: new Date().toISOString(),
    });

    const recoveryCodes = await generateRecoveryCodes();

    return res.status(200).json({ ok: true, recoveryCodes });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
