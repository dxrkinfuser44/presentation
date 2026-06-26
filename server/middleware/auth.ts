import { Request, Response, NextFunction } from "express";
import { findSession } from "../lib/file-store.js";

export interface AuthenticatedRequest extends Request {
  admin?: {
    token: string;
    expiresAt: string;
  };
}

/**
 * Middleware to validate session token from Authorization header
 * or X-Session-Token header
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      // Fall back to X-Session-Token header
      token = req.headers["x-session-token"] as string | undefined;
    }

    if (!token) {
      res.status(401).json({ error: "Missing authentication token" });
      return;
    }

    const session = await findSession(token);

    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    // Attach admin info to request
    req.admin = {
      token: session.token,
      expiresAt: session.expiresAt,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token provided
 */
export async function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      token = req.headers["x-session-token"] as string | undefined;
    }

    if (token) {
      const session = await findSession(token);
      if (session) {
        req.admin = {
          token: session.token,
          expiresAt: session.expiresAt,
        };
      }
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next();
  }
}
