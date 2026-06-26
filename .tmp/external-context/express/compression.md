---
source: Context7 API
library: Express.js
package: compression (middleware)
topic: Response compression middleware
fetched: 2026-06-22T00:00:00Z
official_docs: https://www.npmjs.com/package/compression
---

# Express Response Compression

The `compression` middleware compresses response bodies for all requests that pass through it. Supports gzip and deflate.

## Installation

```bash
npm install compression
```

## Basic Usage

```javascript
const compression = require("compression");
const express = require("express");
const app = express();

// Enable compression for all routes
app.use(compression());
```

## With Options

```javascript
app.use(
  compression({
    level: 6, // Compression level (1-9, default: zlib.constants.Z_BEST_SPEED)
    threshold: 1024, // Only compress responses > 1KB (default: 1KB)
    filter: (req, res) => {
      // Custom filter function
      if (req.headers["x-no-compression"]) {
        return false; // Don't compress if header present
      }
      return compression.filter(req, res);
    },
    memLevel: 8, // Memory level (1-9)
    strategy: 0, // Compression strategy
  }),
);
```

## Production Configuration

```javascript
const compression = require("compression");
const express = require("express");
const path = require("path");

const app = express();

// Compression before static files for maximum benefit
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      // Don't compress responses with Cache-Control: no-transform
      if (
        res.getHeader("Cache-Control") &&
        res.getHeader("Cache-Control").includes("no-transform")
      ) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);

// Static files after compression
app.use(
  express.static(path.join(__dirname, "dist"), {
    maxAge: "1y",
    immutable: true,
  }),
);
```

## What Gets Compressed

| Content-Type           | Compressed              |
| ---------------------- | ----------------------- |
| text/html              | Yes                     |
| text/css               | Yes                     |
| text/javascript        | Yes                     |
| application/json       | Yes                     |
| application/javascript | Yes                     |
| image/svg+xml          | Yes                     |
| image/png              | No (already compressed) |
| image/jpeg             | No (already compressed) |
| video/\*               | No                      |
| font/woff2             | No (already compressed) |

## Compression Levels

| Level | Speed    | Compression Ratio |
| ----- | -------- | ----------------- |
| 1     | Fastest  | Low               |
| 6     | Balanced | Medium (default)  |
| 9     | Slowest  | Highest           |

## Disabling Compression

```javascript
// Client can disable via header
req.headers["x-no-compression"]; // true = skip compression

// Or set response header
res.setHeader("Cache-Control", "no-transform");
```
