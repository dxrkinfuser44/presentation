import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { put } from "@vercel/blob";
import { findSession, getManifest, setManifest } from "../lib/blob-store.js";
import type { PresentationMetadata } from "../lib/blob-store.js";

function collectHtmlFiles(dir: string): string[] {
  try {
    const entries = readdirSync(dir, { recursive: true, encoding: "utf-8" });
    return entries.filter((entry) => entry.endsWith(".html")).map((entry) => join(dir, entry));
  } catch {
    return [];
  }
}

function extractMetadata(content: string) {
  let match = content.match(/^<!doctype html>\s*<!--@presentation\n([\s\S]*?)\n-->/i);
  if (!match) match = content.match(/^<!doctype html>\s*<!--@presentation\s+(\{[\s\S]*?\})\s*-->/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.slice(7);
    const session = await findSession(token);
    if (!session) return res.status(401).json({ error: "Invalid session" });

    const HTML_DIR = join(process.cwd(), "html");
    const files = collectHtmlFiles(HTML_DIR);
    const manifest = await getManifest();
    const existingIds = new Set(manifest.map((p) => p.id));
    let syncedCount = 0;

    for (const absPath of files) {
      const content = readFileSync(absPath, "utf-8");
      const meta = extractMetadata(content);
      if (!meta) continue;

      const relPath = relative(HTML_DIR, absPath).replace(/\\/g, "/");
      const slug = relPath
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "")
        .toLowerCase();

      if (!existingIds.has(slug)) {
        const blob = await put(`presentations/${slug}.html`, content, {
          access: "public",
          contentType: "text/html",
        });

        const entry: PresentationMetadata = {
          id: slug,
          title: meta.title,
          subject: meta.subject,
          year: meta.year,
          description: meta.description || "",
          accent: meta.accent || "#3b82f6",
          bg: meta.bg || "#1e293b",
          tags: meta.tags || [],
          blobUrl: blob.url,
          filePath: relPath,
          addedAt: new Date().toISOString(),
        };

        manifest.push(entry);
        existingIds.add(slug);
        syncedCount++;
      }
    }

    if (syncedCount > 0) {
      await setManifest(manifest);
    }

    return res.status(200).json({ ok: true, synced: syncedCount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
