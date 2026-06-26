import { Router } from "express";
import { challengeRouter } from "./challenge.js";
import { registerRouter } from "./register.js";
import { loginRouter } from "./login.js";
import { verifyRouter } from "./verify.js";
import { recoverRouter } from "./recover.js";
import { logoutRouter } from "./logout.js";

/**
 * Creates an Express router with all auth endpoints
 * @returns {import('express').Router}
 */
export function createAuthRouter(): Router {
  const router = Router();

  // Mount auth routes
  router.use("/challenge", challengeRouter);
  router.use("/register", registerRouter);
  router.use("/login", loginRouter);
  router.use("/verify", verifyRouter);
  router.use("/recover", recoverRouter);
  router.use("/logout", logoutRouter);

  return router;
}
