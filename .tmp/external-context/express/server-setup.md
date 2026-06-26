---
source: Context7 API
library: Express.js
package: express
topic: app.listen and server setup
fetched: 2026-06-22T00:00:00Z
official_docs: https://expressjs.com/en/api.html#app.listen
---

# Express Server Setup

## app.listen()

The `app.listen()` method starts an HTTP server on the specified port and host. It returns a Node.js `http.Server` instance.

### Method Signature

```javascript
app.listen([port], [hostname], [backlog], [callback]): http.Server
```

### Parameters

| Parameter  | Type     | Default   | Description                           |
| ---------- | -------- | --------- | ------------------------------------- |
| `port`     | number   | 0         | Port to listen on (0 = any available) |
| `hostname` | string   | '0.0.0.0' | Host address to bind to               |
| `backlog`  | number   | 511       | Max pending connections queue         |
| `callback` | function | -         | Invoked when server starts listening  |

### Basic Examples

```javascript
const app = express();

// Listen on port 3000, all interfaces
app.listen(3000, () => {
  console.log("Server listening on port 3000");
});

// Listen on specific host
app.listen(8080, "localhost", () => {
  console.log("Server listening on localhost:8080");
});
```

### Production Pattern with env var

```javascript
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Using http.createServer() (equivalent)

```javascript
const http = require("http");
const app = express();

const server = http.createServer(app);
server.listen(3000);
```

## Production Configuration

```javascript
const express = require("express");
const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("env", "production");
  app.enable("view cache");
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // behind reverse proxy
  app.set("etag", "strong"); // strong ETag validation
}

app.set("json spaces", 0); // compact JSON output
app.set("json escape", true); // escape HTML in JSON
```

## Graceful Shutdown

```javascript
const server = app.listen(PORT, "0.0.0.0");

process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
```
