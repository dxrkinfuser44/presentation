import type { VercelRequest, VercelResponse } from "@vercel/node";
import { findSession, getManifest, setManifest } from "../lib/blob-store.js";
import { getFileSha, deleteFile } from "../lib/git-commit.js";
import { del } from "@vercel/blob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.slice(7);
    const session = await findSession(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing required field: id" });
    }

    const manifest = await getManifest();
    const index = manifest.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Presentation not found: ${id}` });
    }

    const presentation = manifest[index];

    // Delete from Vercel Blob
    try {
      const blobUrl = presentation.blobUrl;
      if (blobUrl && typeof blobUrl === "string") {
        const urlParts = blobUrl.split("/");
        const blobKey = urlParts[urlParts.length - 1];
        await del(blobKey);
      }
    } catch (blobError) {
      console.error("Blob delete failed, continuing:", blobError);
    }

    // Delete from GitHub (Backup)
    const sha = await getFileSha(presentation.filePath);
    if (sha) {
      try {
        await deleteFile(presentation.filePath, sha, `Delete presentation: ${presentation.title}`);
      } catch (gitError) {
        console.error("GitHub delete failed, continuing:", gitError);
      }
    }

    // Update manifest
    manifest.splice(index, 1);
    await setManifest(manifest);

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
