import { Template } from "../models/Template.model.js";
import { uploadTemplateImage } from "../utils/Cloudinary.js";
import { Asynchandler } from "../utils/Asynchandler.js";

/** Create template: upload image to Cloudinary, save name + image URL */
export const createTemplate = Asynchandler(async (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Template name is required",
    });
  }
  if (!req.file || !req.file.path) {
    return res.status(400).json({
      success: false,
      message: "Template image is required",
    });
  }

  const cloudinaryRes = await uploadTemplateImage(req.file.path);
  if (!cloudinaryRes || !cloudinaryRes.secure_url) {
    return res.status(500).json({
      success: false,
      message: "Failed to upload image to Cloudinary",
    });
  }

  const template = await Template.create({
    name,
    image: cloudinaryRes.secure_url,
  });

  return res.status(201).json({
    success: true,
    data: template,
    message: "Template created successfully",
  });
});

/** Get all templates */
export const getTemplates = Asynchandler(async (req, res) => {
  const templates = await Template.find().sort({ createdAt: -1 });
  return res.status(200).json({
    success: true,
    data: templates,
    message: "Templates fetched successfully",
  });
});

/** Get single template by id */
export const getTemplateById = Asynchandler(async (req, res) => {
  const { id } = req.params;
  const template = await Template.findById(id);
  if (!template) {
    return res.status(404).json({
      success: false,
      message: "Template not found",
    });
  }
  return res.status(200).json({
    success: true,
    data: template,
    message: "Template fetched successfully",
  });
});

/** Delete template by id (Cloudinary asset not deleted; can be added if needed) */
export const deleteTemplate = Asynchandler(async (req, res) => {
  const { id } = req.params;
  const template = await Template.findByIdAndDelete(id);
  if (!template) {
    return res.status(404).json({
      success: false,
      message: "Template not found",
    });
  }
  return res.status(200).json({
    success: true,
    data: template,
    message: "Template deleted successfully",
  });
});
