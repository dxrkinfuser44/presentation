/**
 * GET /api/presentations — live directory scan of html/year10
 *
 * Scans HTML files at request time, extracts @presentation metadata,
 * and returns a JSON manifest matching the static generator schema.
 */

import { Router } from "express";
import { readdirSync, readFileSync } from "node:fs";
import { relative, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..");
const HTML_DIR = join(ROOT, "html");

// ── Helpers (pure functions) ──────────────────────────────────────────────

/**
 * Recursively collect all .html files under a directory.
 * Uses Node.js built-in recursive readdir (Node 18+).
 * @param {string} dir - Absolute directory path
 * @returns {string[]} Array of absolute file paths
 */
function collectHtmlFiles(dir) {
  try {
    const entries = readdirSync(dir, { recursive: true, encoding: "utf-8" });
    return entries.filter((entry) => entry.endsWith(".html")).map((entry) => join(dir, entry));
  } catch {
    return [];
  }
}

/**
 * Extract @presentation metadata from HTML content.
 * Supports both multi-line and single-line comment formats.
 * @param {string} content - Full HTML file content
 * @returns {object|null} Parsed metadata object or null if not found/invalid
 */
function extractMetadata(content) {
  // Try multi-line format first: <!--@presentation\n{ JSON }\n-->
  let match = content.match(/^<!doctype html>\s*<!--@presentation\n([\s\S]*?)\n-->/i);

  // Fall back to single-line format: <!--@presentation { JSON } -->
  if (!match) {
    match = content.match(/^<!doctype html>\s*<!--@presentation\s+(\{[\s\S]*?\})\s*-->/i);
  }

  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);
    return {
      title: parsed.title,
      subject: parsed.subject,
      year: parsed.year,
      description: parsed.description,
      accent: parsed.accent,
      bg: parsed.bg,
      tags: parsed.tags ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Derive a URL-safe slug from a file path.
 * Same logic as scripts/discover.ts deriveId().
 * @param {string} filePath - Relative file path (e.g. "year10/science/foo.html")
 * @returns {string} URL-safe slug
 */
function deriveId(filePath) {
  return filePath
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

/**
 * Build a single presentation entry from file metadata.
 * @param {object} meta - Parsed metadata
 * @param {string} relPathToRoot - Path relative to project root
 * @param {string} relPathToHtml - Path relative to html/ directory
 * @returns {object} Presentation entry object
 */
function buildEntry(meta, relPathToRoot, relPathToHtml) {
  const href = `/html/${relPathToHtml.replace(/\\/g, "/")}`;
  const id = deriveId(relPathToHtml);
  const filePath = relPathToRoot.replace(/\\/g, "/");

  return {
    title: meta.title,
    subject: meta.subject,
    year: meta.year,
    description: meta.description,
    accent: meta.accent,
    bg: meta.bg,
    tags: meta.tags ?? [],
    id,
    href,
    filePath,
    addedAt: new Date().toISOString(),
  };
}

/**
 * Scan html/year10 and build the presentations array.
 * Each entry is immutable; malformed files are skipped with a warning.
 * @returns {object[]} Sorted array of presentation entries
 */
function scanPresentations() {
  const yearDir = join(HTML_DIR, "year10");
  const files = collectHtmlFiles(yearDir);

  const entries = files
    .map((absPath) => {
      const content = readFileSync(absPath, "utf-8");
      const meta = extractMetadata(content);

      if (!meta) {
        console.warn(`[presentations] No valid @presentation metadata in ${absPath}, skipping.`);
        return null;
      }

      const relPathToRoot = relative(ROOT, absPath);
      const relPathToHtml = relative(HTML_DIR, absPath);

      return buildEntry(meta, relPathToRoot, relPathToHtml);
    })
    .filter(Boolean);

  return entries.sort((a, b) => a.title.localeCompare(b.title));
}

// ── Express router ────────────────────────────────────────────────────────

/**
 * Creates an Express router with the GET /api/presentations endpoint.
 * Each request triggers a live directory scan.
 *
 * @returns {import('express').Router}
 */
function createPresentationsRouter() {
  const router = Router();

  router.get("/api/presentations", (_req, res) => {
    try {
      const presentations = scanPresentations();

      res.json({
        $schema: "/api/spec.json",
        generated: new Date().toISOString(),
        count: presentations.length,
        presentations,
      });
    } catch (err) {
      console.error(`[presentations] Scan failed: ${err.message}`);
      res.status(500).json({ error: "Failed to scan presentations" });
    }
  });

  return router;
}

export { createPresentationsRouter, scanPresentations, extractMetadata, deriveId };
