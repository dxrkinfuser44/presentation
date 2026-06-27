# Presentation Repository

Dual-deployment system for Vercel (serverless) and self-hosted (traditional Node.js server) environments.

## Branch Strategy

### `main` branch

- Base branch containing core application code
- Contains environment-agnostic logic and shared components
- Used for development and as merge target for feature branches

### `vercel-deploy` branch

- Optimized for Vercel serverless deployment
- Uses `/api/` directory for serverless functions (Vercel Platform)
- Configured via `vercel.json` for routing, builds, and rewrites
- Build output: `dist/` directory with copied HTML presentations
- Deployed to Vercel via Git integration

### `selfhosted-deploy` branch

- Optimized for traditional Node.js server hosting
- Uses `server/index.js` as Express application entry point
- Includes production middleware: helmet (security) and compression (performance)
- Serves static assets from `dist/` directory
- Serves presentation HTML from `html/` directory
- Deployed to any Node.js hosting environment (VPS, Docker, etc.)

## Deployment Workflow

### Development

1. Work on `main` branch for feature development
2. Test locally with `npm run dev`

### Vercel Deployment

1. Merge changes to `main`: `git checkout main && git merge feature-branch`
2. Sync to vercel-deploy: `git checkout vercel-deploy && git merge main`
3. Push to trigger Vercel: `git push origin vercel-deploy`

### Self-Hosted Deployment

1. Merge changes to `main`: `git checkout main && git merge feature-branch`
2. Sync to selfhosted-deploy: `git checkout selfhosted-deploy && git merge main`
3. Deploy to your server (pull latest, npm install, npm start)

## Branch-Specific Configuration

### vercel-deploy

- `vercel.json`: Vercel platform configuration with rewrites for SPA routing
- `package.json`: Optimized for Vercel's build system
- `/api/`: Serverless function endpoints

### selfhosted-deploy

- `package.json`: Includes express, helmet, compression dependencies
- `server/index.js`: Express server with production middleware
- No vercel.json needed (not used by self-hosted hosts)

## Shared Files (Both Branches)

- `/src/`: Frontend React/Vite application
- `/html/`: Static presentation HTML files
- `/scripts/`: Utility scripts (discovery, setup)
- Shared configuration: tsconfig.json, vite.config.js, .eslintrc.cjs

## Local Preview

- Development: `npm run dev` (runs Vite dev server)
- Production preview: `npm run build && npm start` (starts Express server)

## Notes

- Environment variables control runtime behavior (PORT, RP_ID, etc.)
- Both deployments share the same frontend build output
- Database/session storage differs: Vercel uses Vercel Blob, self-hosted uses local file storage
- HTML presentations are copied to `dist/` during build for serving
