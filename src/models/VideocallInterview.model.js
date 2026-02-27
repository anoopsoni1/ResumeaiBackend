import mongoose from "mongoose";

const videocallInterviewSchema = new mongoose.Schema(
  {
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: String,
    roomId: String,
    scheduledAt: Date,
    startedAt: Date,
    endedAt: Date,
    recordingUrl: String,
    transcript: String,
    aiReport: {
      technicalScore: Number,
      communicationScore: Number,
      confidenceScore: Number,
      strengths: [String],
      weaknesses: [String],
      improvementPlan: [String],
    },
    status: { type: String, default: "scheduled" },
  },
  { timestamps: true }
);

export const VideocallInterview =
  mongoose.models.VideocallInterview || mongoose.model("VideocallInterview", videocallInterviewSchema);