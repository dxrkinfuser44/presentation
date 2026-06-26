# Dependency Audit — presentation-dashboard

**Date**: 2026-06-22
**Auditor**: CoderAgent (subtask 09)

---

## Current Dependencies

### `dependencies` (runtime)

| Package              | Declared Version | Resolved | Used In                     | Status  |
| -------------------- | ---------------- | -------- | --------------------------- | ------- |
| `plotly.js-dist-min` | `^3.6.0`         | `3.6.0`  | `src/shared/plotly-live.ts` | ✅ Used |

### `devDependencies`

| Package                | Declared Version | Resolved | Used In                          | Status    |
| ---------------------- | ---------------- | -------- | -------------------------------- | --------- |
| `@types/plotly.js`     | `^3.0.10`        | `3.0.10` | Type defs for plotly             | ✅ Used   |
| `@vitejs/plugin-react` | `^6.0.2`         | `6.0.2`  | **Not imported anywhere**        | ⚠️ Unused |
| `glob`                 | `^13.0.6`        | `13.0.6` | `scripts/discover.ts`            | ✅ Used   |
| `tsx`                  | `^4.22.4`        | `4.22.4` | `npm run discover` script runner | ✅ Used   |
| `typescript`           | `^6.0.3`         | `6.0.3`  | TypeScript compiler              | ✅ Used   |
| `vite`                 | `^8.0.16`        | `8.0.16` | Dev server + build               | ✅ Used   |

---

## Unused Dependencies

### GH-Pages-deploy-specific

**None found.** There are no `gh-pages`, `surge`, or other GH-Pages-specific deployment packages in `package.json`. The project has fully migrated away from GH-Pages deployment tooling.

### Other Potentially Unused

| Package                         | Reason                                                                                                                                                                                                | Recommendation                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `@vitejs/plugin-react` `^6.0.2` | Not imported in `vite.config.ts` (which only imports `defineConfig` from `vite` and `resolve` from `path`). No React components exist in the project — all UI is plain TypeScript + DOM manipulation. | **Remove** — no React in use. If React is planned for the future, re-add when needed. |

---

## Missing Dependencies

### `express` (runtime HTTP server)

**Purpose**: Custom Node.js server to serve the dashboard API (e.g., `/api/presentations`) and static files in production, replacing the current `vite preview` approach for systemd deployment.

**Proposed version**: `^5.2.1`

- Express 5.x is the current latest major release
- Native ESM support (matches `"type": "module"` in `package.json`)
- Node.js compatibility: `>=18` (compatible with project's `^20.19.0 || >=22.12.0`)
- Also add `@types/express` `^5.0.6` as a devDependency for TypeScript

### `chokidar` (file watching)

**Purpose**: Watch for file system changes in `html/` directory to trigger re-discovery or live reload without restarting the server.

**Proposed version**: `^4.0.3`

- chokidar 5.x is ESM-only and requires Node >=20.19, which is compatible
- However, v4.x is more battle-tested with broader ecosystem support
- Recommendation: Use `^4.0.3` for stability, or `^5.0.0` if preferring latest ESM-only
- Ships its own TypeScript types — no `@types/chokidar` needed

> **Note**: If the project targets Node >=20.19 (which it does via vite's engine requirement), `^5.0.0` is also a valid choice. v5 has only 1 dependency (down from 8 in v3). Either version is acceptable.

---

## Proposed `package.json` Diff

```diff
 {
   "name": "presentation",
   "version": "1.0.0",
   "description": "",
   "type": "module",
   "scripts": {
     "discover": "tsx scripts/discover.ts",
     "dev": "npm run discover && vite",
     "build": "npm run discover && vite build",
-    "preview": "vite preview"
+    "preview": "vite preview",
+    "serve": "node server.js"
   },
   "repository": {
     "type": "git",
     "url": "git+https://github.com/dxrkinfuser44/presentation.git"
   },
   "keywords": [],
   "author": "",
   "license": "ISC",
   "devDependencies": {
     "@types/express": "^5.0.6",
     "@types/plotly.js": "^3.0.10",
-    "@vitejs/plugin-react": "^6.0.2",
     "glob": "^13.0.6",
     "tsx": "^4.22.4",
     "typescript": "^6.0.3",
     "vite": "^8.0.16"
   },
   "dependencies": {
-    "plotly.js-dist-min": "^3.6.0"
+    "chokidar": "^4.0.3",
+    "express": "^5.2.1",
+    "plotly.js-dist-min": "^3.6.0"
   }
 }
```

### Changes Summary

| Action        | Package                | Section           | Version          |
| ------------- | ---------------------- | ----------------- | ---------------- |
| ➕ Add        | `express`              | `dependencies`    | `^5.2.1`         |
| ➕ Add        | `chokidar`             | `dependencies`    | `^4.0.3`         |
| ➕ Add        | `@types/express`       | `devDependencies` | `^5.0.6`         |
| ➖ Remove     | `@vitejs/plugin-react` | `devDependencies` | was `^6.0.2`     |
| ✏️ Add script | `serve`                | `scripts`         | `node server.js` |

---

## Verification Notes

- **No `npm install` was executed** — this is a plan/diff only
- `package-lock.json` will need regeneration after applying changes (`npm install`)
- All existing dependencies verified as in-use via source code grep
- Express 5 and chokidar 4 are compatible with the project's Node.js engine requirements
