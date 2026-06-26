---
source: Context7 API
library: Express.js
package: express
topic: Security hardening and production best practices
fetched: 2026-06-22T00:00:00Z
official_docs: https://expressjs.com/en/advanced/best-practice-security.html
---

# Express Security Hardening

## Disable X-Powered-By Header

Prevents Express from revealing itself in response headers:

```javascript
app.disable("x-powered-by");
// Response will NOT include: X-Powered-By: Express
```

## Trust Proxy Configuration

Essential when behind a reverse proxy (Nginx, Cloudflare, etc.):

```javascript
// Behind single proxy
app.set("trust proxy", 1);

// Behind multiple proxies
app.set("trust proxy", 2);

// Trust specific proxy
app.set("trust proxy", "10.0.0.1");

// Trust CIDR range
app.set("trust proxy", ["10.0.0.1", "192.168.1.0/24"]);

// Custom logic
app.set("trust proxy", (addr, index) => index < 2);
```

## ETag Configuration

Control response body validation:

```javascript
// Strong ETag (default)
app.set("etag", "strong");

// Weak ETag (for caching)
app.set("etag", "weak");

// Disable ETag
app.set("etag", false);

// Custom ETag function
app.set("etag", (body, encoding) => {
  return `"${require("crypto").createHash("md5").update(body).digest("hex")}"`;
});
```

## JSON Security Settings

```javascript
// Compact JSON (no pretty printing in production)
app.set("json spaces", 0);

// Escape HTML characters in JSON responses
app.set("json escape", true);
```

## Helmet.js Integration (Recommended)

```javascript
const helmet = require("helmet");
app.use(helmet());

// Or configure specific headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
```

## Rate Limiting

```javascript
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
```

## CORS Configuration

```javascript
const cors = require("cors");

app.use(
  cors({
    origin: "https://yourdomain.com",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
```

## Security Headers Summary

| Header                    | Purpose                   | Express/Helmet                   |
| ------------------------- | ------------------------- | -------------------------------- |
| X-Powered-By              | Reveals framework         | `app.disable('x-powered-by')`    |
| X-Content-Type-Options    | Prevents MIME sniffing    | `helmet.noSniff()`               |
| X-Frame-Options           | Prevents clickjacking     | `helmet.frameguard()`            |
| Strict-Transport-Security | Forces HTTPS              | `helmet.hsts()`                  |
| Content-Security-Policy   | Controls resource loading | `helmet.contentSecurityPolicy()` |
| X-XSS-Protection          | XSS filter (legacy)       | `helmet.xssFilter()`             |
