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

  try {
    const { type } = req.body;
    const RP_NAME = process.env.RP_NAME || "Presentation";

    const [
      { getAdminKey, storeChallenge },
      { generateRegistrationOptions, generateAuthenticationOptions },
      nodeCrypto,
    ] = await Promise.all([
      import("../lib/blob-store.js"),
      import("@simplewebauthn/server"),
      import("node:crypto"),
    ]);

    if (type === "register") {
      const challengeId = nodeCrypto.default.randomBytes(16).toString("hex");

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userName: "admin",
        userDisplayName: "Admin",
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "discouraged",
          userVerification: "required",
        },
      });

      await storeChallenge(challengeId, {
        challenge: options.challenge,
        timestamp: Date.now(),
      });

      return res.status(200).json({ challengeId, options });
    }

    if (type === "login") {
      const challengeId = nodeCrypto.default.randomBytes(16).toString("hex");
      const adminKey = await getAdminKey();

      const allowCredentials = adminKey
        ? [{ id: adminKey.credentialId, transports: ["internal" as const] }]
        : [];

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials,
        userVerification: "required",
      });

      await storeChallenge(challengeId, {
        challenge: options.challenge,
        timestamp: Date.now(),
      });

      return res.status(200).json({ challengeId, options });
    }

    return res.status(400).json({ error: "Invalid type. Must be 'register' or 'login'" });
  } catch (error) {
    console.error("Challenge error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
