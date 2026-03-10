import mongoose from "mongoose";

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    question: {
      title: String,
      description: String,
      examples: [Object],
      constraints: [String],
      testCases: [{ input: String, expectedOutput: String }],
    },
    code: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "javascript",
    },
    score: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 10,
    },
    passed: {
      type: Number,
      default: 0,
    },
    totalTests: {
      type: Number,
      default: 0,
    },
    feedback: {
      type: String,
      default: "",
    },
    aiReview: {
      quality: String,
      complexity: String,
      suggestions: [String],
      edgeCasesMissed: [String],
    },
    followUpQa: [{ question: String, answer: String }],
    runOutput: String,
    status: {
      type: String,
      enum: ["in_progress", "submitted"],
      default: "in_progress",
    },
    // Multi-question interview (15 questions): one entry per question attempt
    attempts: [
      {
        question: Object,
        code: String,
        language: String,
        score: Number,
        passed: Number,
        totalTests: Number,
      },
    ],
  },
  { timestamps: true }
);

export const InterviewSession =
  mongoose.models.InterviewSession ||
  mongoose.model("InterviewSession", interviewSessionSchema);
