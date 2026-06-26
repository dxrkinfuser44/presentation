import { getToken } from "../lib/auth.js";
import { uploadPresentation } from "../lib/kv-presentations.js";

export function createUploadModal(): HTMLElement {
  const modal = document.createElement("div");
  modal.id = "upload-modal";
  Object.assign(modal.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: "1000",
    padding: "20px",
    boxSizing: "border-box",
    overflowY: "auto",
  });

  const container = document.createElement("div");
  Object.assign(container.style, {
    backgroundColor: "#fff",
    color: "#333",
    padding: "30px",
    borderRadius: "8px",
    width: "100%",
    maxWidth: "600px",
    position: "relative",
    boxSizing: "border-box",
    fontFamily: "sans-serif",
  });

  const title = document.createElement("h2");
  title.textContent = "Upload New Presentation";
  Object.assign(title.style, {
    marginTop: "0",
    marginBottom: "20px",
  });

  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  Object.assign(closeButton.style, {
    position: "absolute",
    top: "10px",
    right: "10px",
    border: "none",
    background: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#666",
  });
  closeButton.onclick = () => modal.remove();

  const form = document.createElement("form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      alert("Authentication token not found. Please login again.");
      return;
    }

    const formData = new FormData(form);
    const metadata = {
      title: formData.get("title") as string,
      subject: formData.get("subject") as string,
      year: parseInt(formData.get("year") as string, 10),
      description: formData.get("description") as string,
      accent: formData.get("accent") as string,
      bg: formData.get("bg") as string,
      tags: (formData.get("tags") as string)
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== ""),
    };
    const html = formData.get("html") as string;

    const result = await uploadPresentation(token, html, metadata);
    if (result.ok) {
      alert("Presentation uploaded successfully!");
      modal.remove();
      // Optionally reload the page or update the UI
      window.location.reload();
    } else {
      alert(`Upload failed: ${result.error}`);
    }
  };

  const createField = (
    label: string,
    name: string,
    type: string = "text",
    isTextArea: boolean = false,
  ): HTMLElement => {
    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      marginBottom: "15px",
    });

    const lbl = document.createElement("label");
    lbl.textContent = label;
    Object.assign(lbl.style, {
      display: "block",
      marginBottom: "5px",
      fontWeight: "bold",
    });

    let input: HTMLInputElement | HTMLTextAreaElement;
    if (isTextArea) {
      input = document.createElement("textarea");
      (input as HTMLTextAreaElement).rows = 5;
    } else {
      input = document.createElement("input");
      (input as HTMLInputElement).type = type;
    }

    input.name = name;
    input.required = true;
    Object.assign(input.style, {
      width: "100%",
      padding: "8px",
      boxSizing: "border-box",
      borderRadius: "4px",
      border: "1px solid #ccc",
    });

    wrapper.appendChild(lbl);
    wrapper.appendChild(input);
    return wrapper;
  };

  form.appendChild(createField("Title", "title"));
  form.appendChild(createField("Subject", "subject"));
  form.appendChild(createField("Year", "year", "number"));
  form.appendChild(createField("Description", "description", "text", true));
  form.appendChild(createField("Accent Color", "accent", "color"));
  form.appendChild(createField("Background Color", "bg", "color"));
  form.appendChild(createField("Tags (comma separated)", "tags"));
  form.appendChild(createField("HTML Content", "html", "text", true));

  const submitButton = document.createElement("button");
  submitButton.textContent = "Upload Presentation";
  Object.assign(submitButton.style, {
    width: "100%",
    padding: "12px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "10px",
  });
  form.appendChild(submitButton);

  container.appendChild(closeButton);
  container.appendChild(title);
  container.appendChild(form);
  modal.appendChild(container);

  return modal;
}
