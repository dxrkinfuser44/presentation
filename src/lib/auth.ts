import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

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

export async function getChallenge(type: "register" | "login"): Promise<{
  challengeId: string;
  options: any;
}> {
  const res = await fetch(`${API_PREFIX}/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) throw new Error("Failed to get challenge");
  const data = await res.json();
  return { challengeId: data.challengeId, options: data.options };
}

export const CREDENTIAL_ID_KEY = "presentation_credential_id";

export function getRegistrationToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("register");
}

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

export async function register(
  challengeId: string,
  options: any,
  registrationToken: string,
): Promise<string[] | null> {
  try {
    const credential = await startRegistration({ optionsJSON: options });

    const res = await fetch(`${API_PREFIX}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...credential,
        challengeId,
        registrationToken,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Registration failed");
      return null;
    }

    setCredentialId(credential.id);

    const data = await res.json();
    return data.recoveryCodes || null;
  } catch (e) {
    console.error("Registration error:", e);
    alert("Registration error");
    return null;
  }
}

export async function login(challengeId: string, options: any): Promise<string | null> {
  try {
    const credential = await startAuthentication({ optionsJSON: options });

    const res = await fetch(`${API_PREFIX}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...credential,
        challengeId,
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
