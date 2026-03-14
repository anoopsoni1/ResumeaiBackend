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
 * Increment a daily count field on the user. Resets to 1 if lastDate is not today.
 * @param {string} userId
 * @param {string} countField - e.g. "liveInterviewsToday"
 * @param {string} dateField - e.g. "lastLiveInterviewDate"
 */
export async function incrementDailyUserCount(userId, countField, dateField) {
  const user = await User.findById(userId).select([countField, dateField]);
  if (!user) return;
  const today = startOfTodayUTC();
  const lastDate = user[dateField] ? new Date(user[dateField]) : null;
  if (!lastDate || !isSameDayUTC(lastDate, today)) {
    await User.findByIdAndUpdate(userId, {
      [countField]: 1,
      [dateField]: today,
    });
  } else {
    await User.findByIdAndUpdate(userId, { $inc: { [countField]: 1 } });
  }
}
