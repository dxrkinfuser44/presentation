/**
 * File watcher — keeps the in-memory presentation cache in sync with html/.
 *
 * Uses chokidar (event-driven, no polling) to watch for add / change / unlink
 * and delegates cache mutations to server/cache.js.
 */

import { watch } from "chokidar";
import { readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { getAll, set, remove, replaceAll, parseFile, HTML_DIR } from "./cache.js";

const GLOB = `${HTML_DIR}/**/*.html`;

/** @type {import('chokidar').FSWatcher | null} */
let watcher = null;

// ── Initial scan (cache warm) ───────────────────────────────────────────────

/** Recursively collect .html files under dir. */
const findHtmlFiles = (dir) => {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath));
    } else if (extname(entry.name) === ".html") {
      results.push(fullPath);
    }
  }
  return results;
};

const initialScan = () => {
  const files = findHtmlFiles(HTML_DIR);
  const entries = files.map((f) => parseFile(f)).filter(Boolean);
  replaceAll(entries);
  console.log(`[watcher] cache warmed — ${entries.length} presentation(s)`);
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Start watching html/ for changes and populate the cache.
 * @returns {import('chokidar').FSWatcher} the chokidar watcher instance
 */
export const startWatcher = () => {
  initialScan();

  watcher = watch(GLOB, {
    ignoreInitial: true,
    ignored: /(^|[/\\])\.(?!\/)|node_modules/,
    usePolling: false,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  watcher
    .on("add", (filePath) => {
      const entry = set(filePath);
      if (entry) {
        console.log(`[watcher] added: ${entry.title}`);
      }
    })
    .on("change", (filePath) => {
      const entry = set(filePath);
      if (entry) {
        console.log(`[watcher] changed: ${entry.title}`);
      }
    })
    .on("unlink", (filePath) => {
      remove(filePath);
      console.log(`[watcher] removed: ${filePath}`);
    })
    .on("error", (err) => {
      console.error("[watcher] error:", err);
    });

  console.log("[watcher] started — watching", GLOB);
  return watcher;
};

/**
 * Return the current cached presentations array (snapshot).
 * @returns {Array<object>}
 */
export const getPresentations = () => getAll();

/**
 * Stop watching and close the chokidar watcher.
 */
export const stopWatcher = () => {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log("[watcher] stopped");
  }
};
