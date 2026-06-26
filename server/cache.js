/**
 * In-memory cache for presentation metadata.
 * Populated by watcher.js on startup and updated on file changes.
 */

import { readFileSync } from "node:fs";
import { relative, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const ROOT = resolve(__dirname, "..");
export const HTML_DIR = join(ROOT, "html");

/** @type {Map<string, object>} filePath → presentation entry */
const cache = new Map();

// ── Helpers (pure functions) ──────────────────────────────────────────────

/**
 * Extract @presentation metadata from HTML content.
 * Supports both multi-line and single-line comment formats.
 * @param {string} content - Full HTML file content
 * @returns {object|null} Parsed metadata object or null if not found/invalid
 */
export function extractMetadata(content) {
  let match = content.match(/^<!doctype html>\s*<!--@presentation\n([\s\S]*?)\n-->/i);
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
 * @param {string} filePath - Relative file path
 * @returns {string} URL-safe slug
 */
export function deriveId(filePath) {
  return filePath
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

/**
 * Parse a single HTML file and return a presentation entry.
 * @param {string} absPath - Absolute file path
 * @returns {object|null} Presentation entry or null if invalid
 */
export function parseFile(absPath) {
  try {
    const content = readFileSync(absPath, "utf-8");
    const meta = extractMetadata(content);
    if (!meta) return null;

    const relPathToRoot = relative(ROOT, absPath);
    const relPathToHtml = relative(HTML_DIR, absPath);
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
  } catch (err) {
    console.warn(`[cache] Failed to parse ${absPath}: ${err.message}`);
    return null;
  }
}

// ── Cache operations ──────────────────────────────────────────────────────

/**
 * Get all cached presentations sorted by title.
 * @returns {object[]}
 */
export function getAll() {
  return Array.from(cache.values()).sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Parse a file and set it in the cache.
 * @param {string} filePath - Absolute file path
 * @returns {object|null} The cached entry or null
 */
export function set(filePath) {
  const entry = parseFile(filePath);
  if (entry) {
    cache.set(filePath, entry);
  }
  return entry;
}

/**
 * Remove a file from the cache.
 * @param {string} filePath - Absolute file path
 */
export function remove(filePath) {
  cache.delete(filePath);
}

/**
 * Replace all cache contents with a new array.
 * @param {object[]} entries
 */
export function replaceAll(entries) {
  cache.clear();
  for (const entry of entries) {
    // We need the file path as the key, but entries don't have it
    // So we reconstruct from filePath field
    const absPath = join(ROOT, entry.filePath);
    cache.set(absPath, entry);
  }
}
