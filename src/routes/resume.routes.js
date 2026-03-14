import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";

import { recordResumeDownload } from "../controller/resume.controller.js";
import { downloadResumeRateLimit } from "../middleware/resumeGenerateRateLimit.middleware.js";
import { checkResumeDownloadLimit } from "../middleware/checkResumeDownloadLimit.middleware.js";

const router = Router();

/**
 * POST /api/resume/record-download
 * Record that the user downloaded/printed resume (increments resumesDownloadedToday).
 * Limits: free 2/day, premium 15/day. Use when user triggers Download PDF or Print.
 */
router
  .route("/record-download")
  .post(verifyJWT, downloadResumeRateLimit, checkResumeDownloadLimit, recordResumeDownload);

export default router;
