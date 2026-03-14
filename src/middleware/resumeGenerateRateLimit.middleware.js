import rateLimit from "express-rate-limit";

/**
 * Rate limiter for resume download recording: max 10 requests per minute per user (anti-abuse).
 * Daily limits (free: 2/day, premium: 15/day) are enforced by checkResumeDownloadLimit middleware.
 * Use after verifyJWT so req.user is set.
 */
export const downloadResumeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many download resume requests. Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.ip || req.socket?.remoteAddress || "unknown";
  },
});

// login and register reate limiter 

export const loginAndRegisterRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many login and register requests. Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket?.remoteAddress || "unknown";
  },
});