---
source: Context7 API
library: Express.js
package: express
topic: Static file serving with express.static
fetched: 2026-06-22T00:00:00Z
official_docs: https://expressjs.com/en/guide/serving-static-files.html
---

# Express Static File Serving

## express.static() Middleware

The `express.static()` middleware serves static files (HTML, CSS, JS, images) from a specified directory. It is built on the `serve-static` package.

### Basic Usage

```javascript
const express = require("express");
const path = require("path");
const app = express();

// Serve from 'public' directory
app.use(express.static("public"));

// Serve from 'dist' directory with path.join for cross-platform safety
app.use(express.static(path.join(__dirname, "dist")));
```

### With Options

```javascript
app.use(
  express.static("public", {
    maxAge: "1d", // Cache duration (ms string or number)
    etag: false, // Disable ETag generation
    dotfiles: "deny", // 'allow', 'deny', or 'ignore'
    index: "index.html", // Default file (false to disable)
    fallthrough: true, // Pass to next middleware if file not found
    redirect: true, // Redirect to trailing slash for directories
  }),
);
```

### Multiple Directories

```javascript
app.use(express.static("public"));
app.use(express.static("uploads"));
```

### Caching Headers via maxAge

```javascript
// Short cache for development
app.use(express.static("dist", { maxAge: "1h" }));

// Long cache for hashed/immutable assets
app.use(express.static("dist", { maxAge: "1y", immutable: true }));

// Disable caching
app.use(express.static("dist", { maxAge: 0, etag: false }));
```

## res.sendFile() Alternative

For serving individual files with automatic Content-Type detection:

```javascript
res.sendFile("/path/to/file.pdf");
res.sendFile("file.pdf", { root: "/uploads" }, (err) => {
  if (err) console.error(err);
});
res.sendFile("index.html", { maxAge: "1d" });
```

### Options for sendFile

| Option     | Type          | Description                       |
| ---------- | ------------- | --------------------------------- |
| `root`     | string        | Root directory for relative paths |
| `maxAge`   | number/string | Cache duration                    |
| `headers`  | object        | Custom response headers           |
| `dotfiles` | string        | 'allow', 'deny', or 'ignore'      |

## SPA Fallback Pattern

For single-page applications serving from dist/:

```javascript
const express = require("express");
const path = require("path");
const app = express();

// Serve static assets with caching
app.use(
  express.static(path.join(__dirname, "dist"), {
    maxAge: "1y",
    immutable: true,
  }),
);

// SPA fallback - serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});
```
