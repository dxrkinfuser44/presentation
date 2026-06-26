# Task Context: Presentation Dashboard → Dynamic WSL/Tailscale Server

Session ID: 2026-06-22-presentation-dashboard
Created: 2026-06-22T00:00:00Z
Status: in_progress

## Current Request

Migrate `dxrkinfuser44/presentation` from a static GitHub Pages build (build-time JSON generation) to a dynamic Node/Express server hosted locally in WSL2, published via Tailscale Serve. No AI/LLM layer of any kind is part of the runtime — this is a pure filesystem-driven dashboard server.

## Context Files (Standards to Follow)

- `.opencode/context/core/standards/code-quality.md` — Code standards (modular, functional, pure functions, <50 lines, explicit dependencies, immutable data)

## Reference Files (Source Material to Look At)

- `scripts/discover.ts` — Static JSON generator (408 lines), contains the schema reference for manifest/presentation JSON shape
- `src/main.ts` — Frontend dashboard logic (65 lines), fetches `/presentation/api/manifest.json`
- `vite.config.ts` — Build configuration with `base: '/presentation/'`
- `package.json` — Current dependencies and scripts
- `html/year10/science/newtons laws.html` — Example presentation with metadata
- `html/year10/pdhpe/vaping-presentation.html` — Example presentation with metadata
- `index.html` — Dashboard entry point with AI-agent routing comments
- `.github/workflows/static.yml` — Current GitHub Pages deployment
- `.gitignore` — Current ignore rules

## External Docs Fetched

None required for this task (Node/Express, chokidar, systemd, Tailscale are well-known).

## Components

1. **Server core** — Express app serving `dist/` static files + dynamic `/api/presentations` endpoint
2. **File watcher** — chokidar watching `html/year10/` for live updates
3. **Build tooling** — Remove GitHub Pages base path, update npm scripts
4. **Systemd + Tailscale** — Unit file for WSL2, Tailscale serve config for Windows host
5. **Frontend adjustment** — Update fetch URL from `/presentation/api/manifest.json` to `/api/presentations`

## Key Technical Details

### Current Frontend Fetch

```typescript
// src/main.ts:32
const res = await fetch("/presentation/api/manifest.json");
const data = await res.json();
presentations = data.presentations ?? [];
```

### Current Manifest Shape

```json
{
  "$schema": "/presentation/api/spec.json",
  "generated": "2026-06-22T00:00:00.000Z",
  "count": 2,
  "presentations": [
    {
      "title": "Health Impacts of Vaping",
      "subject": "PDHPE",
      "year": 10,
      "description": "...",
      "accent": "#e8ff47",
      "bg": "#0a0e1a",
      "tags": ["health", "pdhpe", "year10"],
      "id": "year10-pdhpe-vaping-presentation-html",
      "href": "/presentation/html/year10/pdhpe/vaping-presentation.html",
      "filePath": "html/year10/pdhpe/vaping-presentation.html",
      "addedAt": "2026-06-22T00:00:00.000Z"
    }
  ]
}
```

### HTML Metadata Format

```html
<!doctype html>
<!--@presentation
{
  "title":       "Newton's Laws of Motion",
  "subject":     "Science",
  "year":        10,
  "description": "Interactive exploration of all three laws...",
  "accent":      "#1a1a18",
  "bg":          "#f5f4f0",
  "tags":        ["physics", "science", "year10", "mechanics"]
}
-->
```

### Vite Config

```typescript
export default defineConfig({
  base: "/presentation/", // MUST BE REMOVED for local server
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, "index.html") },
    },
  },
});
```

### Current package.json Scripts

```json
{
  "discover": "tsx scripts/discover.ts",
  "dev": "npm run discover && vite",
  "build": "npm run discover && vite build",
  "preview": "vite preview"
}
```

## Constraints

- No AI agent API layer, no LLM calls, no subagent orchestration logic in the shipped server
- Must run inside WSL2 under systemd
- Must be published via `tailscale serve`, not raw port forwarding
- Keep the existing Vite MPA frontend structure and HTML metadata-comment convention
- Final output must build clean (`npm run build`) and pass `npm start` locally
- Express must bind to `0.0.0.0:<port>` (not `127.0.0.1`) for WSL2/Windows boundary
- Frontend and API must be same-origin (Express serves both)
- Server must use in-memory cache with chokidar file watching (no polling)
- Malformed metadata must be skipped + logged, never crash the scan

## Exit Criteria

- [ ] `npm run build` completes without errors
- [ ] `npm start` starts the Express server on port 3000 (configurable via PORT env)
- [ ] `GET /` serves the dashboard HTML
- [ ] `GET /api/presentations` returns live-scanned manifest JSON matching current shape
- [ ] File changes in `html/year10/` are reflected without server restart
- [ ] Systemd unit file created in `deploy/presentation.service`
- [ ] Tailscale serve configuration documented for Windows host
- [ ] Smoke test script passes
- [ ] AGENTS.md updated with new deployment model
- [ ] .gitignore updated for server workflow
