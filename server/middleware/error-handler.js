/**
 * Express middleware for 404 handling, global error handling, and graceful shutdown.
 *
 * Consumed by server/index.js. Keeps the main server file focused on routing.
 */

/**
 * 404 handler for unmatched routes.
 * Must be placed after all route definitions.
 * @type {import('express').RequestHandler}
 */
const notFoundHandler = (_req, res) => {
  res.status(404).json({ error: "Not Found" });
};

/**
 * Global error handler (4-param Express signature).
 * Catches any errors forwarded via next(err).
 * @type {import('express').ErrorRequestHandler}
 */
const errorHandler = (err, _req, res, _next) => {
  console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
  const status = err.status || 500;
  res.status(status).json({ error: "Internal Server Error" });
};

/**
 * Registers SIGTERM and SIGINT handlers for graceful shutdown.
 * Stops accepting new connections, drains existing ones, then exits.
 * @param {import('node:http').Server} server - The HTTP server instance
 * @param {number} [timeout=10000] - Max ms to wait before force-exit
 */
const gracefulShutdown = (server, timeout = 10000) => {
  const shutdown = () => {
    console.log("Shutting down...");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), timeout);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

export { notFoundHandler, errorHandler, gracefulShutdown };
