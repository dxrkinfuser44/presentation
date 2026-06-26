const OWNER = process.env.GITHUB_OWNER || "dxrkinfuser44";
const REPO = process.env.GITHUB_REPO || "presentation";
const BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function commitFile(
  path: string,
  content: string,
  message: string,
): Promise<{ sha: string }> {
  const existing = await getFileSha(path);
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch: "main",
  };
  if (existing) body.sha = existing;

  const res = await fetch(`${BASE}/${encodePath(path)}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub commit failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return { sha: data.content.sha };
}

export async function deleteFile(path: string, sha: string, message: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodePath(path)}`, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({
      message,
      sha,
      branch: "main",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub delete failed: ${res.status} ${err}`);
  }
}

export async function getFileSha(path: string): Promise<string | null> {
  const res = await fetch(`${BASE}/${encodePath(path)}`, {
    method: "GET",
    headers: headers(),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub get failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.sha ?? null;
}
