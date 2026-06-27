import {
  getChallenge,
  login,
  register,
  recover,
  verifyToken,
  setToken,
  getToken,
  clearToken,
  getRegistrationToken,
} from "../lib/auth.js";
import { createUploadModal } from "./UploadModal.js";

export function renderAdminGate(
  container: HTMLElement,
  callbacks: { onAuthenticated: (token: string) => void },
) {
  // Create floating plus button
  const button = document.createElement("button");
  button.innerHTML = "+";
  button.title = "Admin: Add Presentation";
  Object.assign(button.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#007bff",
    color: "#fff",
    fontSize: "32px",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    zIndex: "100",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  // Modal for auth
  const authModal = document.createElement("div");
  Object.assign(authModal.style, {
    position: "fixed",
    inset: "0",
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "200",
  });

  const modalContent = document.createElement("div");
  Object.assign(modalContent.style, {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "320px",
    textAlign: "center",
    fontFamily: "DM Sans, sans-serif",
    color: "#333",
  });

  const title = document.createElement("h3");
  title.textContent = "Admin Access";
  modalContent.appendChild(title);

  const statusEl = document.createElement("p");
  statusEl.style.marginTop = "8px";
  statusEl.style.fontSize = "14px";
  modalContent.appendChild(statusEl);

  const loginBtn = document.createElement("button");
  loginBtn.textContent = "Sign in with Passkey";
  Object.assign(loginBtn.style, {
    marginTop: "10px",
    padding: "8px 12px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  });

  const registerBtn = document.createElement("button");
  registerBtn.textContent = "Register New Passkey";
  Object.assign(registerBtn.style, {
    marginTop: "10px",
    padding: "8px 12px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginLeft: "8px",
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  Object.assign(cancelBtn.style, {
    marginTop: "10px",
    padding: "8px 12px",
    backgroundColor: "#ccc",
    color: "#333",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginLeft: "8px",
  });

  const recoverBtn = document.createElement("button");
  recoverBtn.textContent = "Use Recovery Code";
  Object.assign(recoverBtn.style, {
    marginTop: "10px",
    padding: "8px 12px",
    backgroundColor: "#ffc107",
    color: "#333",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    display: "block",
    width: "100%",
    marginLeft: "0",
  });

  modalContent.appendChild(loginBtn);
  modalContent.appendChild(recoverBtn);
  modalContent.appendChild(cancelBtn);

  const registrationToken = getRegistrationToken();
  if (registrationToken) {
    modalContent.insertBefore(registerBtn, recoverBtn);
  }
  authModal.appendChild(modalContent);
  document.body.appendChild(authModal);

  const showAuth = (msg = "") => {
    statusEl.textContent = msg;
    authModal.style.display = "flex";
  };
  const hideAuth = () => (authModal.style.display = "none");

  const completeAuth = (token: string) => {
    setToken(token);
    hideAuth();
    callbacks.onAuthenticated(token);
    const uploadModal = createUploadModal();
    document.body.appendChild(uploadModal);
  };

  button.addEventListener("click", async () => {
    const token = getToken();
    if (token) {
      const valid = await verifyToken(token);
      if (valid) {
        const uploadModal = createUploadModal();
        document.body.appendChild(uploadModal);
        return;
      }
      clearToken();
    }
    showAuth("Choose an authentication method");
  });

  loginBtn.addEventListener("click", async () => {
    statusEl.textContent = "Waiting for passkey...";
    try {
      const { challengeId, challenge } = await getChallenge();
      const token = await login(challengeId, challenge);
      if (token) completeAuth(token);
      else statusEl.textContent = "Login failed";
    } catch (e) {
      console.error(e);
      statusEl.textContent = "Login error";
    }
  });

  registerBtn.addEventListener("click", async () => {
    statusEl.textContent = "Waiting for passkey...";
    try {
      const { challengeId, challenge } = await getChallenge();
      const codes = await register(challengeId, challenge, registrationToken!);
      if (codes) {
        statusEl.textContent = "Registration successful! Save these recovery codes:";
        alert(
          "Recovery codes:\n\n" +
            codes.join("\n") +
            "\n\nStore them securely. They won't be shown again.",
        );
      }
    } catch (e) {
      console.error(e);
      statusEl.textContent = "Registration error";
    }
  });

  recoverBtn.addEventListener("click", async () => {
    const code = prompt("Enter recovery code:");
    if (!code) return;
    statusEl.textContent = "Verifying...";
    try {
      const token = await recover(code);
      if (token) completeAuth(token);
      else statusEl.textContent = "Invalid recovery code";
    } catch (e) {
      console.error(e);
      statusEl.textContent = "Recovery error";
    }
  });

  cancelBtn.addEventListener("click", hideAuth);
  container.appendChild(button);
}
