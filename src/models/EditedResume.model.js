import mongoose from "mongoose";

const editedResumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    text: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const EditedResume = mongoose.model("EditedResume", editedResumeSchema);
