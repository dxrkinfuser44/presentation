/**
 * Request logging middleware.
 * Logs method, path, status code, and response time in ms.
 * Optionally configurable via LOG_LEVEL env var (set to 'silent' to disable logging).
 *
 * @returns {import('express').RequestHandler}
 */
const createLogger = () => {
  const enabled = process.env.LOG_LEVEL !== "silent";

  return (req, res, next) => {
    const start = Date.now();

    // Capture response finish to get status and timing
    res.on("finish", () => {
      if (!enabled) return;
      const duration = Date.now() - start;
      const { method } = req;
      const path = req.originalUrl || req.url;
      const { statusCode } = res;

      console.log(`${method} ${path} ${statusCode} ${duration}ms`);
    });

    next();
  };
};

export { createLogger };
