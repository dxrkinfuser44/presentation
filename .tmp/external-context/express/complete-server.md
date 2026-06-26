---
source: Context7 API + Synthesis
library: Express.js
package: express
topic: Complete production-ready Express server
fetched: 2026-06-22T00:00:00Z
official_docs: https://expressjs.com/en/advanced/best-practice-security.html
---

# Production-Ready Express Server

Complete example synthesizing all documented APIs:

```javascript
const express = require("express");
const path = require("path");
const compression = require("compression");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

// ============================================
// Security Hardening
// ============================================
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.set("etag", "strong");
app.set("json spaces", 0);
app.set("json escape", true);

// ============================================
// Compression (before static files)
// ============================================
app.use(
  compression({
    level: 6,
    threshold: 1024,
  }),
);

// ============================================
// Static Files from dist/
// ============================================
app.use(
  express.static(path.join(__dirname, "dist"), {
    maxAge: "1h",
    dotfiles: "deny",
    index: "index.html",
    fallthrough: true,
    redirect: true,
  }),
);

// ============================================
// SPA Fallback (optional - for client-side routing)
// ============================================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ============================================
// Global Error Handler
// ============================================
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.message}`);
  const isProduction = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    error: isProduction ? "Internal Server Error" : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

// ============================================
// Start Server
// ============================================
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

// ============================================
// Graceful Shutdown
// ============================================
const shutdown = () => {
  console.log("Shutting down...");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

## Key API Reference

### express.static(options)

| Option         | Default      | Description                          |
| -------------- | ------------ | ------------------------------------ |
| `dotfiles`     | 'ignore'     | 'allow', 'deny', 'ignore'            |
| `etag`         | true         | Enable ETag generation               |
| `extensions`   | false        | File extension lookup                |
| `fallthrough`  | true         | Pass to next middleware on 404       |
| `immutable`    | false        | Set Cache-Control: immutable         |
| `index`        | 'index.html' | Default file (false to disable)      |
| `lastModified` | true         | Set Last-Modified header             |
| `maxAge`       | 0            | Cache-Control max-age (ms or string) |
| `redirect`     | true         | Redirect to trailing / for dirs      |
| `setHeaders`   | -            | Custom header function               |

### app.listen(port, host, callback)

| Param      | Type     | Description                     |
| ---------- | -------- | ------------------------------- |
| `port`     | number   | Port (0 = any)                  |
| `host`     | string   | Bind address (default: 0.0.0.0) |
| `callback` | function | Called when listening           |

Returns: `http.Server` instance.

## Middleware Order Rules

1. Body parsers / JSON / URL-encoded
2. CORS
3. Compression
4. Static files (`express.static`)
5. Routes / API endpoints
6. SPA fallback (if applicable)
7. 404 handler
8. Error handler (ALWAYS LAST - 4 params)
