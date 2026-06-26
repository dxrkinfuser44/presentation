import { getChallenge, login, setToken, getToken } from "../lib/auth.js";
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

  // Modal for login
  const loginModal = document.createElement("div");
  Object.assign(loginModal.style, {
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
    width: "300px",
    textAlign: "center",
    fontFamily: "DM Sans, sans-serif",
    color: "#333",
  });

  const title = document.createElement("h3");
  title.textContent = "Admin Access";
  modalContent.appendChild(title);

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

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  Object.assign(cancelBtn.style, {
    marginTop: "10px",
    marginLeft: "10px",
    padding: "8px 12px",
    backgroundColor: "#ccc",
    color: "#333",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  });

  modalContent.appendChild(loginBtn);
  modalContent.appendChild(cancelBtn);
  loginModal.appendChild(modalContent);
  document.body.appendChild(loginModal);

  const showLogin = () => (loginModal.style.display = "flex");
  const hideLogin = () => (loginModal.style.display = "none");

  button.addEventListener("click", async () => {
    const token = getToken();
    if (token) {
      // Already authenticated, open upload modal
      const uploadModal = createUploadModal();
      document.body.appendChild(uploadModal);
    } else {
      showLogin();
    }
  });

  loginBtn.addEventListener("click", async () => {
    try {
      const challenge = await getChallenge();
      // Simulate passkey credentialId
      const mockCredentialId = `passkey-${Date.now()}`;
      const token = await login(mockCredentialId, challenge);
      if (token) {
        setToken(token);
        hideLogin();
        callbacks.onAuthenticated(token);
        // Open upload modal immediately after login
        const uploadModal = createUploadModal();
        document.body.appendChild(uploadModal);
      } else {
        alert("Login failed");
      }
    } catch (e) {
      console.error(e);
      alert("Login error");
    }
  });

  cancelBtn.addEventListener("click", hideLogin);
  container.appendChild(button);
}
