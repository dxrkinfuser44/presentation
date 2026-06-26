import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { notFoundHandler, errorHandler, gracefulShutdown } from "./middleware/error-handler.js";
import { createLogger } from "./middleware/logger.js";
import { createPresentationsRouter } from "./routes/presentations.js";
import { createAuthRouter } from "./routes/auth/index.js";
import { startWatcher, stopWatcher } from "./watcher.js";
import { ensureDataDir } from "./lib/file-store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;

/**
 * Creates a configured Express app that serves static files from dist/.
 * @returns {express.Express} Configured Express app
 */
const createApp = () => {
  const app = express();

  // Security: hide X-Powered-By header
  app.disable("x-powered-by");

  // Request logging
  app.use(createLogger());

  // API routes
  app.use(createPresentationsRouter());

  // Auth routes
  app.use("/auth", createAuthRouter());

  // Serve static files from the dist/ directory
  app.use(
    express.static(join(__dirname, "..", "dist"), {
      index: "index.html",
      dotfiles: "deny",
      fallthrough: true,
    }),
  );

  // Serve presentation HTML files from html/ directory
  app.use(
    "/html",
    express.static(join(__dirname, "..", "html"), {
      dotfiles: "deny",
      fallthrough: true,
    }),
  );

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Global error handler (must be last middleware, 4 params required)
  app.use(errorHandler);

  return app;
};

/**
 * Reads the PORT from environment variables, defaulting to 3000.
 * @returns {number} The port number
 */
const getPort = () => {
  const port = parseInt(process.env.PORT, 10);
  return Number.isNaN(port) ? DEFAULT_PORT : port;
};

/**
 * Starts the Express server on the given host and port.
 * @param {express.Express} app - The Express app
 * @param {number} port - The port to listen on
 * @returns {import('node:http').Server} The HTTP server instance
 */
const startServer = (app, port) => {
  return app.listen(port, HOST, () => {
    console.log(`Server running at http://${HOST}:${port}`);
  });
};

// --- Bootstrap ---
const app = createApp();
const port = getPort();

// Ensure data directory exists
ensureDataDir().catch(console.error);

// Start file watcher for live updates
startWatcher();

const server = startServer(app, port);

// Handle graceful shutdown
const shutdown = () => {
  stopWatcher();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export { app, createApp, getPort, startServer };
