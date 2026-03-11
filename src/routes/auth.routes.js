/**
 * Google OAuth routes.
 * GET /google — redirects to Google consent screen
 * GET /google/callback — handled by Passport, then auth.controller.googleCallback
 */
import { Router } from "express";
import passport from "../config/passport.google.js";
import { googleCallback } from "../controller/auth.controller.js";

const router = Router();
const frontendUrl = "https://resume-ai-frontend-mj2p.vercel.app";

/** Redirect to Google only if OAuth credentials are set; otherwise redirect to login with error. */
function requireGoogleConfig(req, res, next) {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (id && secret) return next();
  return res.redirect(`${frontendUrl}/login?error=google_not_configured`);
}

router.get(
  "/google",
  requireGoogleConfig,
  passport.authenticate("google", { scope: ["profile", "email"] })
);

const failureRedirect = `${frontendUrl}/login?error=google_signin_failed`;

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect }),
  googleCallback
);

export default router;
