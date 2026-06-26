---
source: Context7 API
library: Express.js
package: express
topic: Error handling middleware
fetched: 2026-06-22T00:00:00Z
official_docs: https://expressjs.com/en/guide/error-handling.html
---

# Express Error Handling

## Error Handling Middleware

Error handlers MUST have exactly 4 parameters: `(err, req, res, next)`. They must be registered AFTER all other middleware.

```javascript
// Regular middleware
app.use((req, res, next) => {
  if (req.path === "/error") {
    const err = new Error("Test error");
    err.status = 400;
    next(err);
  } else {
    next();
  }
});

// Error handling middleware (must be LAST)
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
});
```

## Error Propagation

Regular middleware (3 params) is skipped when `next(err)` is called:

```javascript
// Skipped on error
app.use((req, res, next) => {
  console.log("This won't execute if error occurred");
  next();
});

// Error handler (4 params) catches it
app.use((err, req, res, next) => {
  console.log("Error handler:", err.message);
  res.status(err.status || 500).json({ error: err.message });
});
```

## Production Error Handler

```javascript
// 404 handler - must be before error handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Global error handler - must be LAST
app.use((err, req, res, next) => {
  // Log error
  console.error(`[${new Date().toISOString()}] ${err.message}`);

  // Don't leak stack traces in production
  const isProduction = process.env.NODE_ENV === "production";

  res.status(err.status || 500).json({
    error: isProduction ? "Internal Server Error" : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
});
```

## Async Error Handling

Express 5 handles rejected promises automatically. For Express 4:

```javascript
// Wrap async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get(
  "/data",
  asyncHandler(async (req, res) => {
    const data = await fetchData();
    res.json(data);
  }),
);
```

## Error Class Pattern

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Usage
app.get("/resource/:id", (req, res, next) => {
  const resource = findResource(req.params.id);
  if (!resource) {
    return next(new AppError("Resource not found", 404));
  }
  res.json(resource);
});
```

## Middleware Order (Critical)

```javascript
// 1. Body parsers, CORS, etc.
app.use(express.json());
app.use(cors());

// 2. Static files
app.use(express.static("dist"));

// 3. Routes
app.use("/api", apiRoutes);

// 4. 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// 5. Error handler (ALWAYS LAST)
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});
```
