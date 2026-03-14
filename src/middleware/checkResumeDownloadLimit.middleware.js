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

/** Max downloads per day: free = 2, premium = 15 */
const FREE_DAILY_LIMIT = 2;
const PREMIUM_DAILY_LIMIT = 15;

/**
 * Check daily resume download limit before recording a download.
 * Use after verifyJWT so req.user is set.
 * Free: 2/day, Premium: 15/day.
 */
export async function checkResumeDownloadLimit(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(userId).select(
      "plan Premium resumesDownloadedToday lastResumeDownloadDate"
    );
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const isPremium = user.plan === "premium" || user.Premium === true;
    const maxPerDay = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const today = startOfTodayUTC();
    const lastDate = user.lastResumeDownloadDate
      ? new Date(user.lastResumeDownloadDate)
      : null;
    const countForToday =
      lastDate && isSameDayUTC(lastDate, today)
        ? user.resumesDownloadedToday || 0
        : 0;

    if (countForToday >= maxPerDay) {
      return res.status(429).json({
        error: "Daily resume download limit reached.",
        limit: maxPerDay,
        used: countForToday,
        message: isPremium
          ? `Premium users can download up to ${PREMIUM_DAILY_LIMIT} resumes per day. Try again tomorrow.`
          : `Free users can download up to ${FREE_DAILY_LIMIT} resumes per day. Upgrade to premium for ${PREMIUM_DAILY_LIMIT}/day.`,
      });
    }

    next();
  } catch (err) {
    res.status(500).json({
      error: "Failed to check download limit",
      message: err.message,
    });
  }
}
