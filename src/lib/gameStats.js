import { format, subDays } from "date-fns";

const STREAK_THRESHOLD = 3;
const POINTS_PER_LEVEL = 500;

export function getCompletedGamesForDate(results, date) {
  const dateStr = format(date, "yyyy-MM-dd");
  return results.filter((r) => r.play_date === dateStr && r.status === "completed").length;
}

export function computeGameStreak(results) {
  let day = new Date();
  if (getCompletedGamesForDate(results, day) < STREAK_THRESHOLD) {
    day = subDays(day, 1);
  }

  let streak = 0;
  while (getCompletedGamesForDate(results, day) >= STREAK_THRESHOLD) {
    streak += 1;
    day = subDays(day, 1);
  }
  return streak;
}

export function getTotalPoints(results) {
  return results.reduce((sum, r) => sum + (r.points || 0), 0);
}

export function getLevelProgress(points) {
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  const currentLevelPoints = points % POINTS_PER_LEVEL;
  const percent = Math.round((currentLevelPoints / POINTS_PER_LEVEL) * 100);
  return { level, currentLevelPoints, pointsPerLevel: POINTS_PER_LEVEL, percent };
}

export const GAME_STREAK_MIN = STREAK_THRESHOLD;
export const MAX_ATTEMPTS = 3;
