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

// ── Passkey icon (FIDO-recommended shield/key) ─────────────────────────────
const PASSKEY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect width="48" height="48" rx="12" fill="rgba(255,255,255,0.06)"/>
  <path d="M24 14c-4.42 0-8 3.58-8 8 0 3.02 1.67 5.66 4.15 7.06L19 33h10l-.85-3.94C30.33 27.66 32 25.02 32 22c0-4.42-3.58-8-8-8zm0 11.5c-1.93 0-3.5-1.57-3.5-3.5S22.07 18.5 24 18.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" fill="var(--text, #f0f2f8)" opacity="0.85"/>
  <circle cx="24" cy="22" r="1.5" fill="var(--accent, #7c6aef)"/>
</svg>`;

// ── Spinner SVG ─────────────────────────────────────────────────────────────
const SPINNER_SVG = `<svg class="ag-spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" stroke-width="3" fill="none"/>
  <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent, #7c6aef)" stroke-width="3" stroke-linecap="round" fill="none">
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
  </path>
</svg>`;

// ── Shared styles ───────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById("ag-styles")) return;
  const style = document.createElement("style");
  style.id = "ag-styles";
  style.textContent = `
    @keyframes ag-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ag-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

    .ag-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 200;
      animation: ag-fadeIn 200ms ease;
    }
    .ag-overlay[data-open="true"] { display: flex; }

    .ag-modal {
      background: #16181f;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      width: 380px;
      max-width: calc(100vw - 32px);
      padding: 40px 32px 32px;
      text-align: center;
      font-family: 'DM Sans', sans-serif;
      color: var(--text, #f0f2f8);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
      animation: ag-fadeIn 250ms ease;
      position: relative;
    }

    .ag-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }

    .ag-title {
      font-size: 1.35rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin: 0 0 8px;
    }

    .ag-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted, #7a8299);
      font-weight: 300;
      line-height: 1.5;
      margin: 0 0 28px;
    }

    .ag-status {
      font-size: 0.8rem;
      color: var(--text-muted, #7a8299);
      min-height: 20px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      animation: ag-fadeIn 200ms ease;
    }

    .ag-status.ag-error { color: #ff6b6b; }
    .ag-status.ag-success { color: #4ade80; }

    .ag-spinner {
      flex-shrink: 0;
    }

    .ag-btn {
      display: block;
      width: 100%;
      padding: 12px 20px;
      border: none;
      border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 150ms ease, transform 100ms ease, opacity 150ms ease;
    }
    .ag-btn:active { transform: scale(0.98); }
    .ag-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .ag-btn-primary {
      background: var(--accent, #7c6aef);
      color: #fff;
      margin-bottom: 10px;
    }
    .ag-btn-primary:hover:not(:disabled) { background: #6b58e0; }

    .ag-btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text, #f0f2f8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 10px;
    }
    .ag-btn-secondary:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); }

    .ag-btn-cancel {
      background: transparent;
      color: var(--text-muted, #7a8299);
      padding: 8px;
      font-size: 0.8rem;
    }
    .ag-btn-cancel:hover { color: var(--text, #f0f2f8); }

    .ag-link {
      display: inline-block;
      margin-top: 4px;
      padding: 0;
      background: none;
      border: none;
      color: var(--text-muted, #7a8299);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.8rem;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 2px;
      transition: color 150ms ease;
    }
    .ag-link:hover { color: var(--text, #f0f2f8); }

    .ag-recovery-codes {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 16px;
      margin: 16px 0;
      text-align: left;
    }
    .ag-recovery-codes-label {
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted, #7a8299);
      margin-bottom: 8px;
    }
    .ag-recovery-codes-list {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.85rem;
      line-height: 1.8;
      color: var(--text, #f0f2f8);
      word-break: break-all;
    }
    .ag-recovery-codes-list span {
      display: block;
      padding: 2px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .ag-recovery-codes-list span:last-child { border-bottom: none; }

    .ag-recovery-copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 10px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      color: var(--text-muted, #7a8299);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.75rem;
      cursor: pointer;
      transition: color 150ms ease, background 150ms ease;
    }
    .ag-recovery-copy-btn:hover {
      color: var(--text, #f0f2f8);
      background: rgba(255, 255, 255, 0.1);
    }

    .ag-hint {
      font-size: 0.75rem;
      color: var(--text-muted, #7a8299);
      margin-top: 12px;
      opacity: 0.7;
    }

    .ag-recovery-input {
      width: 100%;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      color: var(--text, #f0f2f8);
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.9rem;
      text-align: center;
      letter-spacing: 0.05em;
      outline: none;
      transition: border-color 150ms ease;
      box-sizing: border-box;
      margin-bottom: 16px;
    }
    .ag-recovery-input::placeholder {
      color: rgba(255, 255, 255, 0.2);
      font-family: 'DM Sans', sans-serif;
      letter-spacing: normal;
    }
    .ag-recovery-input:focus {
      border-color: var(--accent, #7c6aef);
    }

    /* FAB button */
    .ag-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--accent, #7c6aef);
      color: #fff;
      font-size: 28px;
      font-weight: 300;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(124, 106, 239, 0.35);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 150ms ease, box-shadow 150ms ease;
    }
    .ag-fab:hover {
      transform: scale(1.06);
      box-shadow: 0 6px 28px rgba(124, 106, 239, 0.5);
    }
    .ag-fab:active {
      transform: scale(0.96);
    }
  `;
  document.head.appendChild(style);
}

// ── Helpers ─────────────────────────────────────────────────────────────────
type ModalState =
  | "idle"
  | "registering"
  | "register-done"
  | "register-error"
  | "logging-in"
  | "login-error"
  | "recovering"
  | "recover-error";

function el(
  tag: string,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") e.className = v;
    else if (k.startsWith("data-")) e.setAttribute(k, v);
    else (e as any)[k] = v;
  }
  for (const c of children) {
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return e;
}

// ── Main ────────────────────────────────────────────────────────────────────
export function renderAdminGate(
  container: HTMLElement,
  callbacks: { onAuthenticated: (token: string) => void },
) {
  injectStyles();

  let modalState: ModalState = "idle";
  let registrationToken = getRegistrationToken();

  // ── FAB ─────────────────────────────────────────────────────────────────
  const fab = el("button", { className: "ag-fab", title: "Admin: Add Presentation" }, "+");
  container.appendChild(fab);

  // ── Modal skeleton ──────────────────────────────────────────────────────
  const overlay = el("div", { className: "ag-overlay" });
  const modal = el("div", { className: "ag-modal" });
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close on backdrop click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.getAttribute("data-open") === "true") {
      closeModal();
    }
  });

  function openModal() {
    overlay.setAttribute("data-open", "true");
  }

  function closeModal() {
    overlay.setAttribute("data-open", "false");
    // Reset to idle after animation
    setTimeout(() => {
      if (overlay.getAttribute("data-open") === "false") {
        modalState = "idle";
        renderIdle();
      }
    }, 200);
  }

  // ── State renderers ─────────────────────────────────────────────────────

  function renderIdle() {
    modal.innerHTML = "";

    // Icon
    const iconWrap = el("div", { className: "ag-icon" });
    iconWrap.innerHTML = PASSKEY_ICON;
    modal.appendChild(iconWrap);

    // Title
    modal.appendChild(el("h2", { className: "ag-title" }, "Admin Access"));

    // Subtitle
    modal.appendChild(
      el("p", { className: "ag-subtitle" }, "Sign in with your passkey to manage presentations"),
    );

    // Status placeholder
    const status = el("div", { className: "ag-status" });
    status.id = "ag-status";

    // Button stack
    const stack = el("div", { style: "display:flex;flex-direction:column;gap:0" });

    // Register passkey (only if registration token present)
    if (registrationToken) {
      const regBtn = el("button", { className: "ag-btn ag-btn-primary" }, "Register Passkey");
      regBtn.addEventListener("click", handleRegister);
      stack.appendChild(regBtn);
    }

    // Sign in
    const signInBtn = el("button", { className: "ag-btn ag-btn-primary" }, "Sign in with Passkey");
    signInBtn.addEventListener("click", handleLogin);
    if (!registrationToken) {
      // Make it the first (and primary) button when there's no register option
    }
    stack.appendChild(signInBtn);

    // Recovery link
    const recLink = el("button", { className: "ag-link" }, "Use Recovery Code");
    recLink.addEventListener("click", handleRecoveryStart);
    stack.appendChild(recLink);

    // Cancel
    const cancelBtn = el("button", { className: "ag-btn ag-btn-cancel" }, "Cancel");
    cancelBtn.addEventListener("click", closeModal);
    stack.appendChild(cancelBtn);

    modal.appendChild(status);
    modal.appendChild(stack);
  }

  function renderRegistering() {
    modal.innerHTML = "";

    const iconWrap = el("div", { className: "ag-icon" });
    iconWrap.innerHTML = SPINNER_SVG;
    modal.appendChild(iconWrap);

    modal.appendChild(el("h2", { className: "ag-title" }, "Creating your passkey\u2026"));
    modal.appendChild(
      el(
        "p",
        { className: "ag-subtitle" },
        "Use your fingerprint, face, or security key when prompted",
      ),
    );
  }

  function renderRegisterDone(codes: string[]) {
    modal.innerHTML = "";

    const iconWrap = el("div", { className: "ag-icon" });
    iconWrap.innerHTML = PASSKEY_ICON;
    modal.appendChild(iconWrap);

    modal.appendChild(el("h2", { className: "ag-title" }, "Passkey created!"));
    modal.appendChild(
      el(
        "p",
        { className: "ag-subtitle" },
        "Save these recovery codes. They won\u2019t be shown again.",
      ),
    );

    // Recovery codes box
    const box = el("div", { className: "ag-recovery-codes" });
    box.appendChild(el("div", { className: "ag-recovery-codes-label" }, "Recovery Codes"));
    const list = el("div", { className: "ag-recovery-codes-list" });
    for (const code of codes) {
      list.appendChild(el("span", {}, code));
    }
    box.appendChild(list);

    // Copy button
    const copyBtn = el(
      "button",
      { className: "ag-recovery-copy-btn" },
      "\uD83D\uDCCB Copy all codes",
    );
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(codes.join("\n"));
        copyBtn.textContent = "\u2713 Copied!";
        setTimeout(() => (copyBtn.textContent = "\uD83D\uDCCB Copy all codes"), 2000);
      } catch {
        // Fallback: select text
        const range = document.createRange();
        range.selectNodeContents(list);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    });
    box.appendChild(copyBtn);
    modal.appendChild(box);

    modal.appendChild(
      el(
        "p",
        { className: "ag-hint" },
        "Keep these codes somewhere safe. Each code can only be used once.",
      ),
    );

    const doneBtn = el("button", { className: "ag-btn ag-btn-primary" }, "Done");
    doneBtn.addEventListener("click", closeModal);
    modal.appendChild(doneBtn);
  }

  function renderRegisterError(msg: string) {
    modal.innerHTML = "";

    const iconWrap = el("div", { className: "ag-icon" });
    iconWrap.innerHTML = PASSKEY_ICON;
    modal.appendChild(iconWrap);

    modal.appendChild(el("h2", { className: "ag-title" }, "Registration failed"));

    const status = el("div", { className: "ag-status ag-error" }, msg);
    modal.appendChild(status);

    const btnRow = el("div", { style: "display:flex;flex-direction:column;gap:0;margin-top:8px" });

    const retryBtn = el("button", { className: "ag-btn ag-btn-primary" }, "Try Again");
    retryBtn.addEventListener("click", handleRegister);
    btnRow.appendChild(retryBtn);

    const backBtn = el("button", { className: "ag-btn ag-btn-cancel" }, "Back");
    backBtn.addEventListener("click", renderIdle);
    btnRow.appendChild(backBtn);

    modal.appendChild(btnRow);
  }

  function renderLoggingIn() {
    modal.innerHTML = "";

    const iconWrap = el("div", { className: "ag-icon" });
    iconWrap.innerHTML = SPINNER_SVG;
    modal.appendChild(iconWrap);

    modal.appendChild(el("h2", { className: "ag-title" }, "Waiting for your passkey\u2026"));
    modal.appendChild(
      el(
        "p",
        { className: "ag-subtitle" },
        "Use your fingerprint, face, or security key when prompted",
      ),
    );
  }

  function renderLoginError(msg: string) {
    modal.innerHTML = "";

    const iconWrap = el("div", { className: "ag-icon" });
    iconWrap.innerHTML = PASSKEY_ICON;
    modal.appendChild(iconWrap);

    modal.appendChild(el("h2", { className: "ag-title" }, "Sign-in failed"));

    const status = el("div", { className: "ag-status ag-error" }, msg);
    modal.appendChild(status);

    const btnRow = el("div", { style: "display:flex;flex-direction:column;gap:0;margin-top:8px" });

    const retryBtn = el("button", { className: "ag-btn ag-btn-primary" }, "Try Again");
    retryBtn.addEventListener("click", handleLogin);
    btnRow.appendChild(retryBtn);

    const backBtn = el("button", { className: "ag-btn ag-btn-cancel" }, "Back");
    backBtn.addEventListener("click", renderIdle);
    btnRow.appendChild(backBtn);

    modal.appendChild(btnRow);
  }

  function renderRecoveryInput() {
    modal.innerHTML = "";

    const iconWrap = el("div", { className: "ag-icon" });
    iconWrap.innerHTML = PASSKEY_ICON;
    modal.appendChild(iconWrap);

    modal.appendChild(el("h2", { className: "ag-title" }, "Recovery Code"));
    modal.appendChild(
      el("p", { className: "ag-subtitle" }, "Enter one of your recovery codes to sign in"),
    );

    const input = el("input", {
      className: "ag-recovery-input",
      type: "text",
      placeholder: "e.g. abcd-efgh-1234",
    }) as HTMLInputElement;
    modal.appendChild(input);

    const status = el("div", { className: "ag-status" });
    status.id = "ag-recovery-status";
    modal.appendChild(status);

    const btnRow = el("div", { style: "display:flex;flex-direction:column;gap:0" });

    const verifyBtn = el("button", { className: "ag-btn ag-btn-primary" }, "Verify");
    verifyBtn.addEventListener("click", () => handleRecoverySubmit(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleRecoverySubmit(input.value);
    });
    btnRow.appendChild(verifyBtn);

    const backBtn = el("button", { className: "ag-btn ag-btn-cancel" }, "Back");
    backBtn.addEventListener("click", renderIdle);
    btnRow.appendChild(backBtn);

    modal.appendChild(btnRow);

    // Auto-focus
    requestAnimationFrame(() => input.focus());
  }

  function renderRecovering() {
    modal.innerHTML = "";

    const iconWrap = el("div", { className: "ag-icon" });
    iconWrap.innerHTML = SPINNER_SVG;
    modal.appendChild(iconWrap);

    modal.appendChild(el("h2", { className: "ag-title" }, "Verifying\u2026"));
    modal.appendChild(el("p", { className: "ag-subtitle" }, "Checking your recovery code"));
  }

  function renderRecoveryError(msg: string) {
    modal.innerHTML = "";

    const iconWrap = el("div", { className: "ag-icon" });
    iconWrap.innerHTML = PASSKEY_ICON;
    modal.appendChild(iconWrap);

    modal.appendChild(el("h2", { className: "ag-title" }, "Recovery failed"));

    const status = el("div", { className: "ag-status ag-error" }, msg);
    modal.appendChild(status);

    const btnRow = el("div", { style: "display:flex;flex-direction:column;gap:0;margin-top:8px" });

    const retryBtn = el("button", { className: "ag-btn ag-btn-primary" }, "Try Again");
    retryBtn.addEventListener("click", renderRecoveryInput);
    btnRow.appendChild(retryBtn);

    const backBtn = el("button", { className: "ag-btn ag-btn-cancel" }, "Back");
    backBtn.addEventListener("click", renderIdle);
    btnRow.appendChild(backBtn);

    modal.appendChild(btnRow);
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  async function handleRegister() {
    if (!registrationToken) return;
    modalState = "registering";
    renderRegistering();

    try {
      const { challengeId, options } = await getChallenge("register");
      const codes = await register(challengeId, options, registrationToken);
      if (codes && codes.length > 0) {
        modalState = "register-done";
        renderRegisterDone(codes);
      } else {
        modalState = "register-error";
        renderRegisterError("Registration was cancelled or failed. Please try again.");
      }
    } catch (e) {
      console.error("Registration error:", e);
      modalState = "register-error";
      renderRegisterError("Something went wrong. Check your connection and try again.");
    }
  }

  async function handleLogin() {
    modalState = "logging-in";
    renderLoggingIn();

    try {
      const { challengeId, options } = await getChallenge("login");
      const token = await login(challengeId, options);
      if (token) {
        setToken(token);
        closeModal();
        callbacks.onAuthenticated(token);
        const uploadModal = createUploadModal();
        document.body.appendChild(uploadModal);
      } else {
        modalState = "login-error";
        renderLoginError("Sign-in was cancelled or failed. Please try again.");
      }
    } catch (e) {
      console.error("Login error:", e);
      modalState = "login-error";
      renderLoginError("Something went wrong. Check your connection and try again.");
    }
  }

  function handleRecoveryStart() {
    modalState = "recovering";
    renderRecoveryInput();
  }

  async function handleRecoverySubmit(code: string) {
    const trimmed = code.trim();
    if (!trimmed) {
      const status = document.getElementById("ag-recovery-status");
      if (status) {
        status.textContent = "Please enter a recovery code";
        status.className = "ag-status ag-error";
      }
      return;
    }

    modalState = "recovering";
    renderRecovering();

    try {
      const token = await recover(trimmed);
      if (token) {
        setToken(token);
        closeModal();
        callbacks.onAuthenticated(token);
        const uploadModal = createUploadModal();
        document.body.appendChild(uploadModal);
      } else {
        modalState = "recover-error";
        renderRecoveryError("Invalid or expired recovery code. Please try again.");
      }
    } catch (e) {
      console.error("Recovery error:", e);
      modalState = "recover-error";
      renderRecoveryError("Something went wrong. Check your connection and try again.");
    }
  }

  // ── FAB click ───────────────────────────────────────────────────────────

  fab.addEventListener("click", async () => {
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
    registrationToken = getRegistrationToken();
    renderIdle();
    openModal();
  });
}
