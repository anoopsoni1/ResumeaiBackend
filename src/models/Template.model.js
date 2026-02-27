// i want to write schema for template model in mongoose i am uplading a template in img format and you write a schema for it 
// i want to write schema for template model in mongoose i am uplading a template in img format and you write a schema for it 
// i want to write schema for template model in mongoose i am uplading a template in img format and you write a schema for it 
// i want to write schema for template model in mongoose i am uplading a template in img format and you write a schema for it 
import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      unique: true,
    },
    /** "resume" → Resume design page; "portfolio" → Portfolio design page */
    type: {
      type: String,
      enum: ["resume", "portfolio"],
      default: "resume",
      trim: true,
    },
  },

  {
    timestamps: true,
  }
);

export const Template = mongoose.model("Template", templateSchema);