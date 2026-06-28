import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { getManifest, setManifest, findSession } from "../lib/blob-store.js";
import { commitFile } from "../lib/git-commit.js";

export interface PresentationMetadata {
  id: string;
  title: string;
  subject: string;
  year: number;
  description: string;
  accent: string;
  bg: string;
  tags: string[];
  blobUrl: string;
  filePath: string;
  addedAt: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const _token = authHeader.slice(7);

    // Validate the session token
    const session = await findSession(_token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { html, metadata } = req.body;
    if (!html || !metadata || !metadata.title || !metadata.subject || !metadata.year) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const slug = metadata.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const subjectDir = metadata.subject.toLowerCase();
    const filePath = `html/year10/${subjectDir}/${slug}.html`;

    // 1. Upload to Vercel Blob
    const blob = await put(`presentations/${slug}.html`, html, {
      access: "public",
      contentType: "text/html",
    });

    // 2. Commit to GitHub (Backup)
    try {
      await commitFile(filePath, html, `Add presentation: ${metadata.title}`);
    } catch (gitError) {
      console.error("GitHub backup failed, but continuing:", gitError);
    }

    // 3. Update manifest in Vercel Blob
    const newPresentation: PresentationMetadata = {
      id: slug,
      title: metadata.title,
      subject: metadata.subject,
      year: metadata.year,
      description: metadata.description || "",
      accent: metadata.accent || "#3b82f6",
      bg: metadata.bg || "#1e293b",
      tags: metadata.tags || [],
      blobUrl: blob.url,
      filePath,
      addedAt: new Date().toISOString(),
    };

    const currentManifest = await getManifest();
    const updatedManifest = currentManifest.filter((p) => p.id !== slug);
    updatedManifest.push(newPresentation);
    await setManifest(updatedManifest);

    return res.status(200).json({ ok: true, id: slug, url: blob.url });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
