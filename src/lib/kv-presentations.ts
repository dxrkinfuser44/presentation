export interface Presentation {
  id: string;
  title: string;
  subject: string;
  year: number;
  description: string;
  accent: string;
  bg: string;
  tags: string[];
  href: string;
  filePath: string;
  addedAt: string;
}

export async function fetchPresentations(): Promise<Presentation[]> {
  try {
    const res = await fetch("/api/presentations");
    if (!res.ok) return [];
    const data = await res.json();
    return data.presentations ?? [];
  } catch {
    return [];
  }
}

export async function uploadPresentation(
  token: string,
  html: string,
  metadata: {
    title: string;
    subject: string;
    year: number;
    description: string;
    accent: string;
    bg: string;
    tags: string[];
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ html, metadata }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      return { ok: true, id: data.id };
    }
    return { ok: false, error: data.error ?? "Upload failed" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function deletePresentation(token: string, id: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
