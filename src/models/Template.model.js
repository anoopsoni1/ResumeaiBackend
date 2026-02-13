import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    name: {
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

    previewImage: {
      type: String, // URL or image path
      required: true,
    },
  },
  {
    timestamps: true, // optional but useful
  }
);

export const Template = mongoose.model("Template", templateSchema);
