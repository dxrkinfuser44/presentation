const API_PREFIX = (() => {
  const host = window.location.hostname;
  const port = window.location.port;
  if (host === "localhost" || host === "127.0.0.1" || (host === "" && port === "5173")) {
    return "/auth";
  }
  return "/api/auth";
})();

export const AUTH_TOKEN_KEY = "presentation_admin_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // localStorage unavailable
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_PREFIX}/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getChallenge(): Promise<{ challengeId: string; challenge: string }> {
  const res = await fetch(`${API_PREFIX}/challenge`);
  if (!res.ok) throw new Error("Failed to get challenge");
  const data = await res.json();
  return { challengeId: data.challengeId, challenge: data.challenge };
}

export const CREDENTIAL_ID_KEY = "presentation_credential_id";

function getCredentialId(): string | null {
  try {
    return localStorage.getItem(CREDENTIAL_ID_KEY);
  } catch {
    return null;
  }
}

function setCredentialId(id: string): void {
  try {
    localStorage.setItem(CREDENTIAL_ID_KEY, id);
  } catch {
    // ignore
  }
}

export async function register(challengeId: string, challenge: string): Promise<string[] | null> {
  try {
    if (!window.PublicKeyCredential) {
      alert("Passkeys are not supported in this browser.");
      return null;
    }

    const challengeBuffer = new Uint8Array(
      challenge.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );

    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: challengeBuffer,
        rp: { name: "Presentation", id: window.location.hostname },
        user: {
          id: Uint8Array.from(window.crypto.getRandomValues(new Uint8Array(16))),
          name: "admin",
          displayName: "Admin",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      },
    })) as any as PublicKeyCredential;

    const attestation = (cred as any).response as any;
    const clientDataJSON = btoa(String.fromCharCode(...new Uint8Array(attestation.clientDataJSON)));
    const attestationObject = btoa(
      String.fromCharCode(...new Uint8Array(attestation.attestationObject)),
    );
    const rawId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));

    const res = await fetch(`${API_PREFIX}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credentialId: rawId,
        publicKey: attestationObject,
        alg: -7,
        challengeId,
        challenge,
        clientDataJSON,
        attestationBuffer: attestationObject,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Registration failed");
      return null;
    }

    setCredentialId(rawId);

    const data = await res.json();
    return data.recoveryCodes || null;
  } catch (e) {
    console.error("Registration error:", e);
    alert("Registration error");
    return null;
  }
}

export async function login(challengeId: string, challenge: string): Promise<string | null> {
  try {
    if (!window.PublicKeyCredential) {
      alert("Passkeys are not supported in this browser.");
      return null;
    }

    const credentialId = getCredentialId();
    if (!credentialId) {
      alert("No passkey registered. Please register first.");
      return null;
    }

    const challengeBuffer = new Uint8Array(
      challenge.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer,
        allowCredentials: [
          {
            id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    })) as any;

    const assertionResponse = assertion.response as any;
    const clientDataJSON = btoa(
      String.fromCharCode(...new Uint8Array(assertionResponse.clientDataJSON)),
    );
    const authenticatorData = btoa(
      String.fromCharCode(...new Uint8Array(assertionResponse.authenticatorData)),
    );
    const signature = btoa(String.fromCharCode(...new Uint8Array(assertionResponse.signature)));

    const res = await fetch(`${API_PREFIX}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credentialId,
        challengeId,
        challenge,
        clientDataJSON,
        authenticatorData,
        signature,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Login failed");
      return null;
    }

    const data = await res.json();
    if (data.token) {
      setToken(data.token);
      return data.token;
    }
    return null;
  } catch (e) {
    console.error("Login error:", e);
    alert("Login error");
    return null;
  }
}

export async function recover(code: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_PREFIX}/recover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.token) {
      setToken(data.token);
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await fetch(`${API_PREFIX}/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }
  clearToken();
}
