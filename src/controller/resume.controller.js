import { Resume } from "../models/Resume.model.js";
import { User } from "../models/User.model.js";

function startOfTodayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function isSameDayUTC(date1, date2) {
  if (!date1 || !date2) return false;
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Increment user's daily resume generation count (call after successful create).
 */
async function incrementResumeCount(userId) {
  const user = await User.findById(userId).select("resumesGeneratedToday lastResumeDate");
  if (!user) return;
  const today = startOfTodayUTC();
  const lastDate = user.lastResumeDate ? new Date(user.lastResumeDate) : null;
  if (!lastDate || !isSameDayUTC(lastDate, today)) {
    await User.findByIdAndUpdate(userId, {
      resumesGeneratedToday: 1,
      lastResumeDate: today,
    });
  } else {
    await User.findByIdAndUpdate(userId, { $inc: { resumesGeneratedToday: 1 } });
  }
}

/**
 * Increment user's daily resume download count (call when user downloads/prints resume as PDF).
 */
async function incrementResumeDownloadCount(userId) {
  const user = await User.findById(userId).select("resumesDownloadedToday lastResumeDownloadDate");
  if (!user) return null;
  const today = startOfTodayUTC();
  const lastDate = user.lastResumeDownloadDate ? new Date(user.lastResumeDownloadDate) : null;
  if (!lastDate || !isSameDayUTC(lastDate, today)) {
    const updated = await User.findByIdAndUpdate(
      userId,
      { resumesDownloadedToday: 1, lastResumeDownloadDate: today },
      { new: true }
    );
    return updated?.resumesDownloadedToday ?? 1;
  }
  const updated = await User.findByIdAndUpdate(
    userId,
    { $inc: { resumesDownloadedToday: 1 } },
    { new: true }
  );
  return updated?.resumesDownloadedToday ?? 0;
}

/**
 * Create new resume (used by POST /resume/generate).
 * After successful create, increments user's resumesGeneratedToday.
 */
export const createResume = async (req, res) => {
  try {
    const { title, html, css } = req.body;
    const userId = req.user?.id || req.user?._id;

    const resume = await Resume.create({
      userId,
      title,
      html,
      css,
    });

    if (userId) {
      await incrementResumeCount(userId);
    }

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

/**
 * Record a resume download (call when user downloads/prints PDF).
 * Increments resumesDownloadedToday; resets if lastResumeDownloadDate is not today.
 * POST /api/resume/record-download (requires verifyJWT).
 */
export const recordResumeDownload = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const count = await incrementResumeDownloadCount(userId);
    res.status(200).json({ success: true, resumesDownloadedToday: count });
  } catch (error) {
    res.status(500).json({ message: "Failed to record download", error: error.message });
  }
};
