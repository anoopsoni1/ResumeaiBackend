import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    html: {
      type: String,
      required: true,
    },

    css: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // automatically adds createdAt & updatedAt
  }
);

export const Resume = mongoose.model("Resume", resumeSchema);
