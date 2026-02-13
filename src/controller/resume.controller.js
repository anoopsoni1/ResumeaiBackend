import { Resume } from "../models/Resume.model.js";

/**
 * Create new resume
 */
export const createResume = async (req, res) => {
  try {
    const { title, html, css } = req.body;

    const resume = await Resume.create({
      userId: req.user.id, // comes from auth middleware
      title,
      html,
      css,
    });

    res.status(201).json(resume);
  } catch (error) {
    res.status(500).json({ message: "Failed to create resume", error: error.message });
  }
};

/**
 * Get all resumes of logged-in user
 */
export const getUserResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(resumes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch resumes", error: error.message });
  }
};

/**
 * Get single resume by ID
 */
export const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    res.json(resume);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch resume", error: error.message });
  }
};

/**
 * Update resume
 */
export const updateResume = async (req, res) => {
  try {
    const { title, html, css } = req.body;

    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title, html, css },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    res.json(resume);
  } catch (error) {
    res.status(500).json({ message: "Failed to update resume", error: error.message });
  }
};

/**
 * Delete resume
 */
export const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    res.json({ message: "Resume deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete resume", error: error.message });
  }
};
