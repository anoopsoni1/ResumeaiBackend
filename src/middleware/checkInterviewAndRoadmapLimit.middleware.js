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

/** Premium: 5 live interviews per day */
const LIVE_INTERVIEW_DAILY_LIMIT = 5;
/** Premium: 5 coding interviews per day */
const CODING_INTERVIEW_DAILY_LIMIT = 5;
/** Premium: 15 roadmap suggestions per day */
const ROADMAP_DAILY_LIMIT = 15;

function getCountForToday(user, countField, dateField) {
  const today = startOfTodayUTC();
  const lastDate = user[dateField] ? new Date(user[dateField]) : null;
  return lastDate && isSameDayUTC(lastDate, today) ? (user[countField] || 0) : 0;
}

function ensurePremium(user, res, featureName) {
  const isPremium = user?.plan === "premium" || user?.Premium === true;
  if (!isPremium) {
    res.status(403).json({
      error: "Premium required",
      message: `${featureName} is a premium feature. Upgrade to access it.`,
    });
    return false;
  }
  return true;
}

/**
 * Premium only. 5 live interviews per day. Use after verifyJWT.
 */
export async function checkLiveInterviewLimit(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(userId).select(
      "plan Premium liveInterviewsToday lastLiveInterviewDate"
    );
    if (!user) return res.status(401).json({ error: "User not found" });

    if (!ensurePremium(user, res, "Live interview")) return;

    const count = getCountForToday(user, "liveInterviewsToday", "lastLiveInterviewDate");
    if (count >= LIVE_INTERVIEW_DAILY_LIMIT) {
      return res.status(429).json({
        error: "Daily live interview limit reached.",
        limit: LIVE_INTERVIEW_DAILY_LIMIT,
        used: count,
        message: `Premium users can create up to ${LIVE_INTERVIEW_DAILY_LIMIT} live interviews per day. Try again tomorrow.`,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Failed to check limit", message: err.message });
  }
}

/**
 * Premium only. 5 coding interviews per day. Use after verifyJWT.
 */
export async function checkCodingInterviewLimit(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(userId).select(
      "plan Premium codingInterviewsToday lastCodingInterviewDate"
    );
    if (!user) return res.status(401).json({ error: "User not found" });

    if (!ensurePremium(user, res, "Coding interview")) return;

    const count = getCountForToday(user, "codingInterviewsToday", "lastCodingInterviewDate");
    if (count >= CODING_INTERVIEW_DAILY_LIMIT) {
      return res.status(429).json({
        error: "Daily coding interview limit reached.",
        limit: CODING_INTERVIEW_DAILY_LIMIT,
        used: count,
        message: `Premium users can create up to ${CODING_INTERVIEW_DAILY_LIMIT} coding interviews per day. Try again tomorrow.`,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Failed to check limit", message: err.message });
  }
}

/**
 * Premium only. 15 roadmap suggestions per day. Use after verifyJWT.
 */
export async function checkRoadmapLimit(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(userId).select(
      "plan Premium roadmapSuggestionsToday lastRoadmapSuggestionDate"
    );
    if (!user) return res.status(401).json({ error: "User not found" });

    if (!ensurePremium(user, res, "Career roadmap")) return;

    const count = getCountForToday(user, "roadmapSuggestionsToday", "lastRoadmapSuggestionDate");
    if (count >= ROADMAP_DAILY_LIMIT) {
      return res.status(429).json({
        error: "Daily roadmap suggestion limit reached.",
        limit: ROADMAP_DAILY_LIMIT,
        used: count,
        message: `Premium users can get up to ${ROADMAP_DAILY_LIMIT} roadmap suggestions per day. Try again tomorrow.`,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Failed to check limit", message: err.message });
  }
}
