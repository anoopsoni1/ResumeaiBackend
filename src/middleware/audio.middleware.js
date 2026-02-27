import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { VideocallInterview } from "../models/VideocallInterview.model.js";
import { Asynchandler } from "../utils/Asynchandler.js";
import { processInterviewRecording } from "../services/interviewProcessing.service.js";

/** Background job: transcribe recording with Gemini, evaluate, save transcript + aiReport. */
async function processVideocallInterview(interviewId) {
  try {
    await processInterviewRecording(interviewId);
  } catch (err) {
    console.error("[processVideocallInterview]", interviewId, err?.message || err);
  }
}

export const uploadRecording = Asynchandler(async (req, res) => {
  const interviewId = req.params.id;
  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const interview = await VideocallInterview.findOne({
    _id: interviewId,
    $or: [{ recruiterId: userId }, { candidateId: userId }],
  });
  if (!interview) {
    return res.status(404).json({ success: false, message: "Interview not found" });
  }

  if (!req.file?.path) {
    console.warn("[upload-recording] No file received", {
      interviewId,
      hasFile: !!req.file,
      bodyKeys: req.body && Object.keys(req.body),
    });
    return res.status(400).json({
      success: false,
      message: "No recording file received. Send multipart/form-data with field 'recording'.",
    });
  }

  // Cloudinary free tier hard-limits uploads to ~10MB for videos.
  const MAX_BYTES = 10 * 1024 * 1024;
  if (typeof req.file.size === "number" && req.file.size > MAX_BYTES) {
    // Best-effort cleanup of the oversized temp file
    fs.unlink(req.file.path, () => {});
    return res.status(413).json({
      success: false,
      message: "Recording is too large. Please keep it under 10 MB (shorter interview or lower quality).",
    });
  }

  let result;
  try {
    // Store as raw binary in a dedicated folder; we just need a downloadable URL.
    result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "raw",
      folder: "interview-recordings",
      access_mode: "public",
    });
  } catch (err) {
    const msg = err?.message || err?.error?.message || String(err);
    console.warn("[upload-recording] Cloudinary error", { interviewId, message: msg });
    const lower = msg.toLowerCase();
    if (lower.includes("file size too large")) {
      return res.status(413).json({
        success: false,
        message: "Recording is too large for our video storage. Please keep it under 10 MB.",
      });
    }
    // Any other Cloudinary error is treated as a temporary backend/storage issue.
    return res.status(502).json({
      success: false,
      message: "We couldn't save your recording. Please try again in a moment.",
    });
  }

  if (!result?.secure_url) {
    return res.status(502).json({ success: false, message: "Upload failed" });
  }

  await VideocallInterview.findByIdAndUpdate(interviewId, {
    recordingUrl: result.secure_url,
    status: "processing",
  });

  processVideocallInterview(interviewId);
  res.json({ message: "Recording uploaded" });
});